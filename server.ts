import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Only models that officially support audio transcription in @google/genai generateContent
const CANDIDATE_MODELS = [
  'gemini-3.5-transcribe',
  'gemini-3.8-flash',
];

// In-memory quota cooldown tracker to prevent repeated 429s
let serverQuotaHitUntil = 0;

/**
 * Transcribe shouted voice audio using Gemini server-side with Regional Accent Calibration
 * Features automatic audio model fallback and graceful quota management
 */
app.post('/api/transcribe', async (req, res) => {
  try {
    const { audioBase64, mimeType, accentCalibration, isCalibrationWord, expectedWord } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'No audio data received' });
    }

    // If quota was already exhausted, directly instruct client to use on-device speech
    if (Date.now() < serverQuotaHitUntil) {
      return res.json({
        word: '',
        raw: '',
        quotaExhausted: true,
        fallbackToLocalSpeech: true,
        message: 'Daily cloud quota limit reached. Browser native speech engine is handling voice input.',
      });
    }

    let instructionText =
      'The user is shouting out a single English word in a word search game called Dicshoutery. Transcribe the shouted word. Return ONLY the uppercase English word without any punctuation, formatting, or explanation (e.g. "BRAVE", "SLOW", "SWIFT", "CALM", "COLD"). If only background noise or silence, return "NONE".';

    if (isCalibrationWord && expectedWord) {
      instructionText = `The user is in Voice Calibration mode to tune the recognizer for their regional accent. They were prompted to say the word "${expectedWord}". Listen to their pronunciation and regional accent, and return the single uppercase word they attempted to say (e.g. "${expectedWord}"). If completely silent, return "NONE".`;
    } else if (accentCalibration && Array.isArray(accentCalibration) && accentCalibration.length > 0) {
      const calibrationSummary = accentCalibration
        .map((c: any) => `Target: "${c.target}", Recognized as: "${c.recognized}"`)
        .join('; ');

      instructionText = `The user is shouting out a single English word in the game Dicshoutery.
IMPORTANT REGIONAL ACCENT TUNING:
The user has calibrated their voice recognition with the following 5 regional accent reference samples:
[${calibrationSummary}].
Compensate for their specific regional accent, vowel shifts, and phonetic dialect to accurately identify the intended English dictionary word they are shouting.
Return ONLY the single intended uppercase English word without any punctuation (e.g. "BRAVE", "SLOW", "SWIFT", "CALM", "FROST"). If only background noise or silence, return "NONE".`;
    }

    let transcriptionResult = '';
    let quotaHit = false;

    const audioPart = {
      inlineData: {
        mimeType: mimeType || 'audio/webm',
        data: audioBase64,
      },
    };
    const textPart = {
      text: instructionText,
    };

    for (const model of CANDIDATE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: { parts: [audioPart, textPart] },
        });

        const raw = (response.text || '').trim().toUpperCase();
        transcriptionResult = raw.replace(/[^A-Z]/g, '');

        return res.json({
          word: transcriptionResult === 'NONE' ? '' : transcriptionResult,
          raw,
          modelUsed: model,
        });
      } catch (err: any) {
        const lastErrorMsg = err?.message || String(err);
        const msg = lastErrorMsg.toLowerCase();
        const code = err?.status || err?.code || 0;
        const isQuota =
          code === 429 ||
          code === 'RESOURCE_EXHAUSTED' ||
          msg.includes('429') ||
          msg.includes('quota') ||
          msg.includes('resource_exhausted');

        if (isQuota) {
          quotaHit = true;
          // Set a 30-minute server cooldown so we don't bombard quota-exhausted models
          serverQuotaHitUntil = Date.now() + 30 * 60 * 1000;
          break;
        }
      }
    }

    // If quota was hit or models are unavailable, gracefully instruct client to use on-device speech
    if (quotaHit || Date.now() < serverQuotaHitUntil) {
      return res.json({
        word: '',
        raw: '',
        quotaExhausted: true,
        fallbackToLocalSpeech: true,
        message: 'Daily cloud quota limit reached. Browser native speech engine is active.',
      });
    }

    return res.json({
      word: '',
      raw: '',
      fallbackToLocalSpeech: true,
    });
  } catch (_err) {
    return res.json({
      word: '',
      raw: '',
      fallbackToLocalSpeech: true,
    });
  }
});

/**
 * Proxy endpoint for https://dictionaryapi.dev/
 * Prevents client-side CORS or ad-blocker problems
 */
app.get('/api/dictionary/:word', async (req, res) => {
  const { word } = req.params;
  if (!word || typeof word !== 'string') {
    return res.status(400).json({ error: 'Word parameter required' });
  }

  try {
    const cleanWord = word.trim().toLowerCase();
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Word not found' });
    }

    const data = await response.json();
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: 'Dictionary lookup failed', message: err?.message });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
