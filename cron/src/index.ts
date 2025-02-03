import { Handler } from 'aws-lambda';

import { HfInference } from "@huggingface/inference";
// import { DynamoDB } from 'aws-sdk';
import * as puppeteer from 'puppeteer';
// import { v4 as uuidv4 } from 'uuid';

console.log('Loading function');

// const client = new HfInference(process.env.HUGGING_FACE_ACCESS_TOKEN);

// type Sentiment = "positive" | "neutral" | "negative";

// const getSentiment = async (text: string) : Promise<Sentiment> => {
//     const output = await client.textClassification({
//         model: "cardiffnlp/twitter-xlm-roberta-base-sentiment",
//         inputs: text,
//         provider: "hf-inference",
//     });

//     const sentiment = output[0].label as Sentiment;
//     return sentiment;

// }

async function scrapeReviews(url: string) {
  const browser = await puppeteer.launch({headless: false});
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  
  let reviews: { rating: number; comment: string }[] = [];
  
  try {
      while (true) {
          await page.waitForSelector('.y-css-1wfz87z', { timeout: 10000 });
          const reviewElements = await page.$$('.y-css-1wfz87z');
          
          for (const element of reviewElements) {
              let rating = 0;
              let comment = '';
              
              // try {
              //     const ratingElement = await element.$('.y-css-dnttlc');
              //     console.log('ratingElement:', ratingElement);
              //     if (ratingElement) {
              //         const ratingText = await page.evaluate(el => el.getAttribute('aria-label'), ratingElement);
              //         rating = ratingText ? parseInt(ratingText.split(' ')[0]) : 0;
              //     }
              // } catch (error) {
              //     rating = 0;
              // }
              
              try {

                  // get ul element of class 'list__09f24__ynIEd'
                  // const ulElement = await element.$('ul.list__09f24__ynIEd');
                  // console.log('ulElement:', ulElement);

                  // const commentElement = await element.$('span.raw__09f24__T4Ezm');
                  // if (commentElement) {
                  //     comment = await page.evaluate(el => el.textContent?.trim() || '', commentElement);
                  // }
              } catch (error) {
                  comment = '';
              }
              console.log('rating:', rating);
              console.log('comment:', comment);
              reviews.push({ rating, comment });
          }
          
          // const nextButton = await page.$('.next-link');
          // if (nextButton) {
          //     await nextButton.click();
          //     await page.waitfo
          // } else {
          //     break;
          // }
          // break
      }
  } catch (error) {
      console.error(`Error while scraping: ${error}`);
  }
  
  await browser.close();
  return reviews;
}



// export const handler: Handler = async () => {
  const usage = async () => {
    console.log('Usage: node index.js <url>');
  const restaurants = [{id: "1", url: "https://www.yelp.fr/biz/le-ruisseau-burger-joint-paris"}];

  for (const restaurant of restaurants) {
    console.log('Scraping reviews for restaurant:', restaurant.id);
    const restaurantId = restaurant.id;
    const url = restaurant.url;
    if (!url) continue;

    const reviews = await scrapeReviews(url);
    // const formattedReviews = reviews.map(review => ({
    //     id: uuidv4(),
    //     restaurant_id: restaurantId,
    //     rating: review.rating,
    //     comment: review.comment,
    // }));

    // await insertReviews(formattedReviews);
    // allReviews = [...allReviews, ...formattedReviews];
}


  return { statusCode: 200 };
};


usage()