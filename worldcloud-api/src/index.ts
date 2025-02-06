import { Handler } from 'aws-lambda';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { WordItem } from './types';
import {WordCloudGenerator } from './worldcloud'

const dynamoDBClient = new DynamoDBClient({});

interface Item  {
  id:string;
  restaurant_id:string;
  words:string;
}
//Promise<WordItem[]> 



export const handler: Handler = async (event) => {
// const usage = async (event:any) => {
  try {
    const restaurantId = event.pathParameters?.restaurantId;

    if (!restaurantId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Restaurant ID is required' })
      };
    }

    const params = {
      TableName: 'wordscloud',
      KeyConditionExpression: 'restaurant_id = :restaurantId',
      ExpressionAttributeValues: {
        ':restaurantId': { S: restaurantId }
      }
    };
    const command = new QueryCommand(params);

    const result = await dynamoDBClient.send(command);


    if (!result.Items || result?.Items?.length < 1) {
      console.log('No reviews found for this restaurant');
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'No reviews found for this restaurant' })
      };
    }

    const items = result.Items.map(item => unmarshall(item))  as Item[];

    const words = JSON.parse(items[0].words) as WordItem[];

    const generator = new WordCloudGenerator();

    const pdfBuffer = await generator.generatePDF(words);

    console.log('PDF created successfully');


    return {
      statusCode: 200,
      headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="wordcloud-${restaurantId}.pdf"`,
      },
      body: pdfBuffer.toString('base64'), // Return Base64 string
      isBase64Encoded: true, // Required for API Gateway to interpret the response correctly
  };
   
  } catch (error: any) {
    console.error('Error retrieving reviews:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error.message })
    };
  }
};

// usage({pathParameters:{restaurantId:'3'}})
