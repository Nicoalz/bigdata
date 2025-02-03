import { Handler } from 'aws-lambda';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const dynamoDBClient = new DynamoDBClient({});

export const handler: Handler = async (event) => {
  try {
    const restaurantId = event.pathParameters?.restaurantId;

    if (!restaurantId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Restaurant ID is required' })
      };
    }

    const params = {
      TableName: 'review',
      KeyConditionExpression: 'restaurant_id = :restaurantId',
      ExpressionAttributeValues: {
        ':restaurantId': { S: restaurantId }
      }
    };

    const command = new QueryCommand(params);
    const result = await dynamoDBClient.send(command);

    if (result.Items && result.Items.length > 0) {
      const reviews = result.Items.map(item => unmarshall(item));

      return {
        statusCode: 200,
        body: JSON.stringify(reviews)
      };
    }

    return {
      statusCode: 404,
      body: JSON.stringify({ message: 'No reviews found for this restaurant' })
    };
  } catch (error: any) {
    console.error('Error retrieving reviews:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error.message })
    };
  }
};
