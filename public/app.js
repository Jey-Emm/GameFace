const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');
const exitButton = document.getElementById('exit-button');
const finishExitButton = document.getElementById('finish-exit-button');
const gameArea = document.getElementById('game-area');
const video = document.getElementById('video');
const emojiTarget = document.getElementById('emoji-target');
const emojiTargetImg = document.getElementById('emoji-target-img');
const emojiTargetText = document.getElementById('emoji-target-text');
const maxRoundsInput = document.getElementById('max-rounds');
const startInput = document.querySelector('.start-input');
const scoreCard = document.getElementById('score-card');
const scoreLabel = document.getElementById('score-label');
const statusText = document.getElementById('status');
const resultText = document.getElementById('result-text');
const finishCard = document.getElementById('finish-card');
const finishTitle = document.getElementById('finish-title');
const finishMessage = document.getElementById('finish-message');
const captureCanvas = document.getElementById('capture-canvas');
const context = captureCanvas.getContext('2d');

let stream = null;
let currentTarget = null;
let score = 0;
let round = 0;
let maxRounds = 5;
let countdownTimer = null;
let isPlaying = false;
let githubEmojiMap = null;

startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', restartGame);
exitButton.addEventListener('click', exitGame);
finishExitButton.addEventListener('click', exitGame);

function showOverlayButton(button, show) {
  if (show) {
    button.classList.remove('hidden');
  } else {
    button.classList.add('hidden');
  }
}

function showStartInput(show) {
  if (!startInput) {
    return;
  }
  if (show) {
    startInput.classList.remove('hidden');
  } else {
    startInput.classList.add('hidden');
  }
}

function showScoreCard() {
  scoreCard.classList.remove('hidden');
}

function hideScoreCard() {
  scoreCard.classList.add('hidden');
}

function showResultText(message) {
  resultText.textContent = message;
  resultText.classList.remove('hidden');
}

function hideResultText() {
  resultText.classList.add('hidden');
}

async function loadGithubEmojis() {
  if (githubEmojiMap) {
    return githubEmojiMap;
  }

  try {
    const response = await fetch('https://api.github.com/emojis');
    if (!response.ok) {
      throw new Error('Unable to load emoji API');
    }
    githubEmojiMap = await response.json();
    return githubEmojiMap;
  } catch (error) {
    console.warn('Emoji API load failed, using fallback emoji set.', error);
    githubEmojiMap = null;
    return null;
  }
}

const emojiMappings = [
  { key: 'happy', label: 'Happy', names: ['grinning', 'smiley', 'grin', 'satisfied', 'heart_eyes'] },
  { key: 'surprised', label: 'Surprised', names: ['open_mouth', 'astonished', 'scream', 'hushed'] },
  { key: 'angry', label: 'Angry', names: ['angry', 'rage', 'face_with_symbols_on_mouth'] },
  { key: 'sad', label: 'Sad', names: ['cry', 'sob', 'slightly_frowning_face', 'disappointed'] },
  { key: 'neutral', label: 'Neutral', names: ['neutral_face', 'expressionless', 'face_without_mouth'] },
];

function getEmojiTarget() {
  const available = [...emojiMappings];
  const choice = available[Math.floor(Math.random() * available.length)];
  const emojiInfo = { key: choice.key, label: choice.label, url: null, text: '🎮' };

  if (githubEmojiMap) {
    const validNames = choice.names.filter((name) => githubEmojiMap[name]);
    if (validNames.length > 0) {
      const selectedName = validNames[Math.floor(Math.random() * validNames.length)];
      emojiInfo.url = githubEmojiMap[selectedName];
      emojiInfo.text = selectedName.replace(/_/g, ' ');
    }
  } else {
    const fallbackMap = {
      happy: '😄',
      surprised: '😮',
      angry: '😡',
      sad: '😢',
      neutral: '😐',
    };
    emojiInfo.text = fallbackMap[choice.key] || '🎮';
  }

  return emojiInfo;
}

async function startGame() {
  startButton.disabled = true;
  setStatus('Requesting camera access...');
  showOverlayButton(exitButton, false);
  hideFinishCard();
  hideScoreCard();
  hideResultText();

  const requestedRounds = Number(maxRoundsInput.value);
  maxRounds = Number.isInteger(requestedRounds) && requestedRounds > 0 ? Math.min(Math.max(requestedRounds, 1), 20) : 5;
  maxRoundsInput.value = maxRounds;

  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('This browser does not support camera access.');
    }

    await loadGithubEmojis();
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });
    video.srcObject = stream;
    video.muted = true;
    score = 0;
    round = 0;
    isPlaying = true;
    updateScore();
    setStatus('Match the emoji with your face expression.');
    showOverlayButton(startButton, false);
    showOverlayButton(exitButton, true);
    showStartInput(false);
    maxRoundsInput.disabled = true;
    showNextEmoji();
  } catch (error) {
    console.error(error);
    setStatus('Unable to access camera. Please allow camera access and refresh the page.');
    startButton.disabled = false;
    maxRoundsInput.disabled = false;
  }
}

function restartGame() {
  if (countdownTimer) {
    clearTimeout(countdownTimer);
  }
  hideFinishCard();
  hideScoreCard();
  hideResultText();
  score = 0;
  round = 0;
  isPlaying = true;
  updateScore();
  setStatus('Game restarted. Prepare to match the first emoji.');
  showStartInput(false);
  maxRoundsInput.disabled = true;
  showOverlayButton(startButton, false);
  showOverlayButton(exitButton, true);
  showNextEmoji();
}

function exitGame() {
  stopCamera();
  isPlaying = false;
  showOverlayButton(startButton, true);
  showOverlayButton(exitButton, false);
  showStartInput(true);
  hideFinishCard();
  hideScoreCard();
  hideResultText();
  maxRoundsInput.disabled = false;
  setStatus('Press Start Game to play again.');
}

function stopCamera() {
  if (!stream) {
    return;
  }
  stream.getTracks().forEach((track) => track.stop());
  stream = null;
  video.srcObject = null;
}

function updateScore() {
  scoreLabel.textContent = `Score: ${score} / ${maxRounds}`;
}

function setStatus(message) {
  statusText.textContent = message;
}

function showNextEmoji() {
  if (!isPlaying) {
    return;
  }

  if (round >= maxRounds) {
    return finishGame(score >= maxRounds, 'The challenge has ended.');
  }

  currentTarget = getEmojiTarget();
  round += 1;
  if (currentTarget.url) {
    emojiTargetImg.src = currentTarget.url;
    emojiTargetImg.classList.remove('hidden');
    emojiTargetText.classList.add('hidden');
  } else {
    emojiTargetText.textContent = currentTarget.text;
    emojiTargetText.classList.remove('hidden');
    emojiTargetImg.classList.add('hidden');
  }
  updateScore();
  hideScoreCard();
  hideResultText();
  setStatus('Match this expression in 5 seconds...');

  countdownTimer = setTimeout(evaluateExpression, 5000);
}

async function evaluateExpression() {
  if (!stream || !currentTarget) {
    setStatus('No active camera or target. Please restart the game.');
    return;
  }

  context.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
  const imageData = captureCanvas.toDataURL('image/jpeg');

  setStatus('Analyzing your expression...');

  try {
    const response = await fetch('/api/recognize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageData, target: currentTarget.key }),
    });

    const result = await response.json();
    if (!result.faceFound) {
      return finishGame(false, 'Face not detected. Game over.');
    }

    const match = result.matched;
    const found = result.foundEmotion;
    const confidence = Number(result.confidence).toFixed(1);

    if (match) {
      score += 1;
      updateScore();
      showScoreCard();
      showResultText(`Emoji: ${currentTarget.label} — Correct!`);
      if (score >= maxRounds) {
        return finishGame(true, `Perfect! Detected ${found}`);
      }
      setStatus(`Great! Matched`);
      countdownTimer = setTimeout(() => {
        hideScoreCard();
        hideResultText();
        showNextEmoji();
      }, 2000);
    } else {
      showResultText(`Emoji: ${currentTarget.label} — Incorrect`);
      return finishGame(false, `Game over. Detected ${found} instead of ${currentTarget.label}.`);
    }
  } catch (error) {
    console.error('Recognition request failed', error);
    finishGame(false, 'Recognition failed. Check your server and AWS credentials.');
  }
}

function finishGame(perfect, message) {
  isPlaying = false;
  showOverlayButton(startButton, false);
  showOverlayButton(exitButton, true);
  finishTitle.textContent = perfect ? 'CONGRATULATION' : 'GAME OVER';
  finishMessage.textContent = `${message} Your score is ${score}`;
  finishCard.classList.remove('hidden');
  setStatus(perfect ? 'Perfect score! Well done.' : 'Game completed. Choose Restart or Exit.');
}

function hideFinishCard() {
  finishCard.classList.add('hidden');
}
