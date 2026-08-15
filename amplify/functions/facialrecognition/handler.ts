// amplify/functions/facialrecognition/handler.js
const { RekognitionClient, DetectFacesCommand } = require('@aws-sdk/client-rekognition');

const rekognition = new RekognitionClient();

const emotionTargets = {
  happy: ['HAPPY'],
  surprised: ['SURPRISED'],
  angry: ['ANGRY'],
  sad: ['SAD'],
  neutral: ['CALM'],
};

function getTopEmotion(emotions) {
  if (!Array.isArray(emotions) || emotions.length === 0) return null;
  return emotions.reduce((best, emotion) => {
    return !best || emotion.Confidence > best.Confidence ? emotion : best;
  }, null);
}

// Use standard export syntax matching your project layout
exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { image, target } = body;

    if (!image || !target) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: 'Missing image or target parameter.' }),
      };
    }

    const base64 = image.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
    const imageBytes = Buffer.from(base64, 'base64');

    const command = new DetectFacesCommand({
      Image: { Bytes: imageBytes },
      Attributes: ['ALL'],
    });

    const response = await rekognition.send(command);
    const faceDetails = response.FaceDetails || [];

    if (faceDetails.length === 0) {
      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ faceFound: false, message: 'No face detected.' }),
      };
    }

    const topEmotion = getTopEmotion(faceDetails[0].Emotions);
    const foundEmotion = topEmotion?.Type || 'UNKNOWN';
    const expected = emotionTargets[target.toLowerCase()] || [];
    const matched = expected.includes(foundEmotion);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        faceFound: true,
        foundEmotion,
        confidence: topEmotion?.Confidence || 0,
        matched,
        expected,
      }),
    };
  } catch (error) {
    console.error('Execution failure:', error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: 'Internal recognition error.' }),
    };
  }
};