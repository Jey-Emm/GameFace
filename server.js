const express = require('express');
const path = require('path');
const { RekognitionClient, DetectFacesCommand } = require('@aws-sdk/client-rekognition');

const app = express();
const port = process.env.PORT || 3000;
const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'ap-southeast-1';
const isProduction = process.env.NODE_ENV === 'production';

app.enable('trust proxy');
app.use((req, res, next) => {
  if (isProduction && req.get('x-forwarded-proto') !== 'https') {
    return res.redirect(301, `https://${req.get('host')}${req.originalUrl}`);
  }
  next();
});

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; connect-src 'self' https://api.github.com; img-src 'self' data: https://github.githubassets.com; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'self';"
  );
  next();
});

const rekognition = new RekognitionClient({ region });

const emotionTargets = {
  happy: ['HAPPY'],
  surprised: ['SURPRISED'],
  angry: ['ANGRY'],
  sad: ['SAD'],
  neutral: ['CALM'],
};

app.use(express.json({ limit: '12mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function getTopEmotion(emotions) {
  if (!Array.isArray(emotions) || emotions.length === 0) {
    return null;
  }
  return emotions.reduce((best, emotion) => {
    return !best || emotion.Confidence > best.Confidence ? emotion : best;
  }, null);
}

app.post('/api/recognize', async (req, res) => {
  const { image, target } = req.body;
  if (!image || !target) {
    return res.status(400).json({ error: 'Missing image or target in request body.' });
  }

  const base64 = image.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
  const imageBytes = Buffer.from(base64, 'base64');

  try {
    const command = new DetectFacesCommand({
      Image: { Bytes: imageBytes },
      Attributes: ['ALL'],
    });

    const response = await rekognition.send(command);
    const faceDetails = Array.isArray(response.FaceDetails) ? response.FaceDetails : [];

    if (faceDetails.length === 0) {
      return res.json({ faceFound: false, message: 'No face detected. Try again with your face visible.' });
    }

    const topEmotion = getTopEmotion(faceDetails[0].Emotions);
    const foundEmotion = topEmotion?.Type || 'UNKNOWN';
    const expected = emotionTargets[target.toLowerCase()] || [];
    const matched = expected.includes(foundEmotion);

    return res.json({
      faceFound: true,
      foundEmotion,
      confidence: topEmotion?.Confidence || 0,
      matched,
      expected,
    });
  } catch (error) {
    console.error('Rekognition error:', error);
    return res.status(500).json({ error: 'Face recognition failed. Check AWS credentials and region.' });
  }
});

app.listen(port, () => {
  console.log(`GameFace server running at http://localhost:${port}`);
});
