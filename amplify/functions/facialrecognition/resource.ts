import { defineFunction } from '@aws-amplify/backend';

export const faceRecognitionHandler = defineFunction({
  name: 'face-recognition',
  entry: './handler.js', // <-- Simply point it to your handler.js file!
  timeoutSeconds: 30,
});