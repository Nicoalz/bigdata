import { Handler } from 'aws-lambda';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const dynamoDBClient = new DynamoDBClient({});
export const handler: Handler = async () => {
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
  
        return {
          statusCode: 200,
          body: JSON.stringify(items)
        };
      }
  
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'No items found' })
      };
    } catch (error:any) {
      console.error('Error retrieving item:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: error.message })
      };
    }
  };