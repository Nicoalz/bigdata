import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { WordItem } from "./types";

export const getGenAI = async ({key}:{key:string}) : Promise<GenerativeModel> => {
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});
  return model;
}

const extractRelevantWords = async ({texts, genAI}:{texts: string[], genAI:GenerativeModel}) => {
  const prompt = `
  Use the following texts to generate a list of relevant words, the goal is to create a word cloud that summarizes the main topics of the restaurants reviews.
  Returns a JSON array with the words and their amount of occurrences. Return only the list of words and their occurrences, starting with [ and ending with ].
  Like this for example : 
    [
        ["food", 10],
        ["service", 5],
        ["price", 3]
    ]

    Texts:
    ${texts.join("\n")}
  `

  const result = await genAI.generateContent(prompt);
  const response = await result.response
  const text = response.text();
  return JSON.parse(text);
}


export const getRelevantWordsByRestaurant = async ({restaurantsWithReviews, apiKey}:{restaurantsWithReviews:{restaurant_id: string; comments: string[]}[], apiKey:string}) : Promise<{restaurant_id: string; words: WordItem[]}[]> => {
  const genAI = await getGenAI({ key: apiKey });  
  const words: {restaurant_id: string; words: WordItem[]}[] = [];

  for (const restaurantWithReview of restaurantsWithReviews) {
    try {
    const relevantWords = await extractRelevantWords({texts: restaurantWithReview.comments, genAI});
    words.push({restaurant_id: restaurantWithReview.restaurant_id, words: relevantWords});
    } catch (error) {
      console.error(`Error while extracting relevant words for restaurant ${restaurantWithReview.restaurant_id}: ${error}`);
    }
  }

  return words;
}