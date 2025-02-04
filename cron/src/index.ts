import { Handler } from 'aws-lambda';
import { HfInference } from "@huggingface/inference";
import * as puppeteer from 'puppeteer';
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBClient, ScanCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import {getRelevantWordsByRestaurant, getGenAI } from './ai';
const secretsClient = new SecretsManagerClient({});
const dynamoDBClient = new DynamoDBClient({});

const getHuggingFaceToken = async (): Promise<string> => {
  try {
    const command = new GetSecretValueCommand({ SecretId: "HUGGING_FACE_ACCESS_TOKEN" });
    const response = await secretsClient.send(command);
    if (response.SecretString) {
      const secret = JSON.parse(response.SecretString);
      return secret.HUGGING_FACE_ACCESS_TOKEN;
    } else {
      throw new Error("SecretString is empty");
    }
  } catch (error) {
    console.error("Error retrieving secret:", error);
    throw error;
  }
};

const getGoogleAIKey = async (): Promise<string> => {
  try {
    const command = new GetSecretValueCommand({ SecretId: "GOOGLE_AI_KEY" });
    const response = await secretsClient.send(command);
    if (response.SecretString) {
      const secret = JSON.parse(response.SecretString);
      return secret.GOOGLE_AI_KEY;
    } else {
      throw new Error("SecretString is empty");
    }
  } catch (error) {
    console.error("Error retrieving secret:", error);
    throw error;
  }
}

const getRestaurants = async (): Promise<{
  "slug": string,
  "id": string,
}[]> => {
  try {
    const params = {
      TableName: 'restaurant',
      Limit: 100
    };

    const command = new ScanCommand(params);
    const result = await dynamoDBClient.send(command);

    if (result.Items && result.Items.length > 0) {
      // Convert DynamoDB format to a regular JavaScript object
      // const firstItem = unmarshall(result.Items[0]);
      const items = result.Items.map((item) => unmarshall(item));

      return items as {
        "slug": string,
        "id": string,
      }[];
    }

    return [];
  } catch (error: any) {
    console.error('Error retrieving item:', error);
    return []
  }
};


type Sentiment = "positive" | "neutral" | "negative";

const getSentiment = async ({ text, client }: { text: string, client: HfInference }): Promise<Sentiment> => {
  const output = await client.textClassification({
    model: "cardiffnlp/twitter-xlm-roberta-base-sentiment",
    inputs: text,
    provider: "hf-inference",
  });

  const sentiment = output[0].label as Sentiment;
  return sentiment;

}

async function scrapeReviews(url: string) {
  const browser = await puppeteer.launch({headless:false});
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  let reviews: string[] = [];

  try {
    while (true) {
      await page.waitForSelector('.y-css-1wfz87z', { timeout: 5000 });
      await new Promise(resolve => setTimeout(resolve, 5000));
      const reviewElements = await page.$$('.y-css-1wfz87z');

      for (const element of reviewElements) {
        let comment = '';

        try {
          const commentElement = await element.$('span.raw__09f24__T4Ezm');
          if (commentElement) {
            comment = await page.evaluate(el => el.textContent?.trim() || '', commentElement);
          }
        } catch (error) {
          comment = '';
        }

        reviews.push(comment);
      }

      break;
    }
  } catch (error) {
    console.error(`Error while scraping: ${error}`);
  }

  await browser.close();
  return reviews.filter(review => review.length > 0);

}


const getReviews = async (restaurants: { id: string, slug: string }[]) => {
  const all_reviews: { restaurant_id: string, comment: string }[] = [];
  for (const restaurant of restaurants) {
    try {
      console.log('Scraping reviews for restaurant:', restaurant.slug);
      const url = `https://www.yelp.fr/biz/${restaurant.slug}?sort_by=date_desc#reviews`;
      if (!url) continue;

      const reviews = await scrapeReviews(url);
      console.log('Reviews:', reviews.length);
      all_reviews.push(...reviews.map(comment => ({ restaurant_id: restaurant.id, comment })));
    } catch (error) {
      console.error(`Error while scraping reviews for restaurant ${restaurant.id}: ${error}`);

    }
  }
  console.log('All reviews:', all_reviews.length);
  return all_reviews;
}

const addSentiments = async (reviews: { restaurant_id: string, comment: string }[]) => {
  const HUGGING_FACE_ACCESS_TOKEN = await getHuggingFaceToken();
  const client = new HfInference(HUGGING_FACE_ACCESS_TOKEN);
  const reviews_with_sentiment = await Promise.all(reviews.map(async review => {
    try {
      console.log('Getting sentiment for review:', review.comment);
      const sentiment = await getSentiment({ text: review.comment, client });
      return { ...review, sentiment };
    } catch (error) {
      console.error(`Error while getting sentiment for review ${review.comment}: ${error}`);
      return { ...review, sentiment: 'neutral' as Sentiment };
    }
  }));
  return reviews_with_sentiment;
}

const addReviewsToDb = async (reviews: { restaurant_id: string, comment: string, sentiment: Sentiment }[]) => {
  console.log(`Adding ${reviews.length} reviews to database`);
  for (const review of reviews) {
    try {
      const params = {
        TableName: 'review',
        Item: {
          restaurant_id: { S: review.restaurant_id },
          review_id: { S: uuidv4() },
          comment: { S: review.comment },
          sentiment: { S: review.sentiment }
        }
      };

      const command = new PutItemCommand(params);
      await dynamoDBClient.send(command);
    } catch (error) {
      console.error(`Error while adding review to database: ${error}`);
    }
  }
}

const addRelevantWordsToDb = async (relevantWords: { restaurant_id: string; words: [string, number][] }[]) => {
  console.log(`Adding relevant words to database`);
  for (const relevantWord of relevantWords) {
    try {
      const params = {
        TableName: 'wordcloud',
        Item: {
          restaurant_id: { S: relevantWord.restaurant_id },
          words: { S: JSON.stringify(relevantWord.words) }
        }
      };

      const command = new PutItemCommand(params);
      await dynamoDBClient.send(command);
    } catch (error) {
      console.error(`Error while adding relevant words to database: ${error}`);
    }
  }
}


export const handler: Handler = async () => {

  try {
    const restaurants = await getRestaurants();

    console.log('Restaurants:', restaurants);

    const reviews = await getReviews(restaurants);

    if (!reviews) {
      console.log('No reviews found');
      return;
    }

    const reviews_with_sentiment = await addSentiments(reviews);

    // add to db
    await addReviewsToDb(reviews_with_sentiment);

    const googleAIKey = await getGoogleAIKey();

    const genAI = await getGenAI({ key: googleAIKey });

    const restaurantsWithReviews: {restaurant_id: string; comments: string[]}[] = reviews_with_sentiment.reduce((acc, review) => {
      const restaurant = acc.find(r => r.restaurant_id === review.restaurant_id);
      if (restaurant) {
        restaurant.comments.push(review.comment);
      } else {
        acc.push({ restaurant_id: review.restaurant_id, comments: [review.comment] });
      }
      return acc;
    }, [] as {restaurant_id: string; comments: string[]}[]);

    const relevantWords = await getRelevantWordsByRestaurant({restaurantsWithReviews, apiKey: googleAIKey});


    await addRelevantWordsToDb(relevantWords);
    

  } catch (error) {
    console.error(`Error while running the function: ${error}`);
  }




  return { statusCode: 200 };
}
