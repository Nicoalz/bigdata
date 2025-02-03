import { Handler } from 'aws-lambda';

import { HfInference } from "@huggingface/inference";
// import { DynamoDB } from 'aws-sdk';
import * as puppeteer from 'puppeteer';
import { get } from 'http';
// import { v4 as uuidv4 } from 'uuid';

console.log('Loading function');

const client = new HfInference(process.env.HUGGING_FACE_ACCESS_TOKEN);

type Sentiment = "positive" | "neutral" | "negative";

const getSentiment = async (text: string) : Promise<Sentiment> => {
    const output = await client.textClassification({
        model: "cardiffnlp/twitter-xlm-roberta-base-sentiment",
        inputs: text,
        provider: "hf-inference",
    });

    const sentiment = output[0].label as Sentiment;
    return sentiment;

}

async function scrapeReviews(url: string) {
  const browser = await puppeteer.launch({headless: true});
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
        
        // const nextButton = await page.$('.next-link');
        // if (nextButton) {
        //     await nextButton.click();
        //     // await page.waitForTimeout(3000); // Wait for the page to reload
        //     await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
        // } else {
        //     break;
        // }
        // stop
        break;
    }
} catch (error) {
    console.error(`Error while scraping: ${error}`);
}
  
  await browser.close();
  return reviews.filter(review => review.length > 0);

}


const getReviews = async (restaurants: {id: string, url: string}[]) => {
  const all_reviews: {restaurant_id: string, comment: string}[] = [];
  for (const restaurant of restaurants) {
    try {
    console.log('Scraping reviews for restaurant:', restaurant.id);
    const url = restaurant.url;
    if (!url) continue;

    const reviews = await scrapeReviews(url);
    all_reviews.push(...reviews.map(comment => ({restaurant_id: restaurant.id, comment})));
    } catch (error) {
    console.error(`Error while scraping reviews for restaurant ${restaurant.id}: ${error}`);
    
    }
    return all_reviews;
}
}

const addSentiments = async (reviews: {restaurant_id: string, comment: string}[]) => {
  const reviews_with_sentiment = await Promise.all(reviews.map(async review => {
    try {
    const sentiment = await getSentiment(review.comment);
    return {...review, sentiment};
    } catch (error) {
    console.error(`Error while getting sentiment for review ${review.comment}: ${error}`);
    return {...review, sentiment: 'neutral'};
    }
  }));
  return reviews_with_sentiment;
}


// export const handler: Handler = async () => {
  const usage = async () => {

    // get restaurants:
    const restaurants = [{id: "1", url: "https://www.yelp.fr/biz/le-ruisseau-burger-joint-paris"}];

    const reviews = await getReviews(restaurants);

    if (!reviews) {
        console.log('No reviews found');
        return;
    }

    const reviews_with_sentiment = await addSentiments(reviews);

    // add to db


  }


//   return { statusCode: 200 };
// };


usage()