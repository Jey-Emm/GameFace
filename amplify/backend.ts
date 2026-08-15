// amplify/backend.ts
import { defineBackend } from '@aws-amplify/backend';
import { faceRecognitionHandler } from './functions/facialrecognition/resource';
import { Stack } from 'aws-cdk-lib';
import { RestApi, LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';

const backend = defineBackend({
  faceRecognitionHandler
});

// Plain JavaScript execution method calls
backend.faceRecognitionHandler.resources.lambda.addToRolePolicy({
  actions: ['rekognition:DetectFaces'],
  resources: ['*'],
});

const apiStack = Stack.of(backend.faceRecognitionHandler.resources.lambda);
const api = new RestApi(apiStack, 'GameFaceRestApi', {
  defaultCorsPreflightOptions: {
    allowOrigins: ['*'],
    allowMethods: ['POST', 'OPTIONS'],
  },
});

const apiRoute = api.root.addResource('recognize');
apiRoute.addMethod('POST', new LambdaIntegration(backend.faceRecognitionHandler.resources.lambda));