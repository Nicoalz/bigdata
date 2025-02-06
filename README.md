# bigdata

## AUBERT Thomas, AVERSANO Lorenzo, BORDEAUX Nicolas

### API route to get restaurants list:
[https://3ty7kejy1c.execute-api.eu-west-1.amazonaws.com/dev/restaurants](https://3ty7kejy1c.execute-api.eu-west-1.amazonaws.com/dev/restaurants)

### API route to get reviews of a restaurant (by restaurant_id):
[https://znc7ce7l7i.execute-api.eu-west-1.amazonaws.com/dev/reviews/2](https://znc7ce7l7i.execute-api.eu-west-1.amazonaws.com/dev/reviews/2)


### API route to get wordcloud of reviews of a restaurant (by restaurant_id):
[https://6z1vyts8hl.execute-api.eu-west-1.amazonaws.com/dev/worldcloud/2](https://6z1vyts8hl.execute-api.eu-west-1.amazonaws.com/dev/worldcloud/2)

# Lambda API Project

This project consists of multiple AWS Lambda functions deployed using the Serverless Framework. The project includes the following services:

- **Cron Service**: Fetches reviews of restaurants, analyzes them with AI, and stores the reviews and word items.
- **Restaurants API**: Returns the list of restaurants stored in our API.
- **Reviews API**: Returns the reviews for a specific restaurant.
- **Wordcloud API**: Returns a wordcloud PDF of reviews for a specific restaurant.

## Project Structure

- `cron/`: Contains the cron service for fetching and analyzing reviews.
- `restaurants-api/`: Contains the API for retrieving restaurant data.
- `reviews-api/`: Contains the API for retrieving reviews of a specific restaurant.
- `worldcloud-api/`: Contains the API for generating wordcloud PDFs of reviews.

## Deployment

Each service is deployed using the Serverless Framework. Follow the steps below to deploy each service.

### Prerequisites

- Node.js (version 18.x or 20.x)
- Serverless Framework
- AWS CLI configured with appropriate credentials

### Deploying a Service

1. Navigate to the service directory (e.g., `cron/`, `restaurants-api/`, `reviews-api/`, `worldcloud-api/`).
2. Install dependencies:
    ```bash
    npm install
    ```
3. Build the service:
    ```bash
    npm run build
    ```
4. Deploy the service:
    ```bash
    npm run deploy
    ```

### Removing a Service

To remove a deployed service, run the following command in the service directory:
```bash
npm run remove
```

## Local Development

To start a service locally, use the following command in the service directory:
```bash
npm run start
```

This will start the service using `serverless-offline` for local development.

## Services Overview

### Cron Service

- **Path**: `cron/`
- **Description**: Fetches reviews of restaurants, analyzes them with AI, and stores the reviews and word items.
- **Deployment**: Uses `serverless-webpack` and `esbuild` for bundling.

### Restaurants API

- **Path**: `restaurants-api/`
- **Description**: Returns the list of restaurants stored in our API.
- **Deployment**: Uses `serverless-webpack` for bundling.

### Reviews API

- **Path**: `reviews-api/`
- **Description**: Returns the reviews for a specific restaurant.
- **Deployment**: Uses `serverless-webpack` for bundling.

### Wordcloud API

- **Path**: `worldcloud-api/`
- **Description**: Returns a wordcloud PDF of reviews for a specific restaurant.
- **Deployment**: Uses `serverless-webpack` for bundling.
- Issues with the PDF generation on AWS Lambda, so the service is not fully functional.
Here is a locally generated PDF example of the restaurant with id 2:
![wordcloud](/worldcloud-api/wordscloud-restaurant-3.png)

## Environment Variables

Each service may require specific environment variables. Refer to the `serverless.yml` file in each service directory for details.

## Quicksight Dashboard

Issues creating the dashboard. ✅
Used AWS Glue to create a crawler and a database to store the data of the DynamoDB tables (reviews and restaurants). ✅
Used Athena to query the data and create a dataset. ✅
Used QuickSight to create the dashboard but data not showing up. 

Screenshot of the QuickSight dashboard:
![quicksight-1](/screenshots//quicksight-1.png)
![quicksight-2](/screenshots//quicksight-2.png)
![quicksight-3](/screenshots//quicksight-3.png)