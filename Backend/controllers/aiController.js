const axios = require('axios');
const fs = require('fs');
const pdfParse = require('pdf-parse');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const MAX_CHUNK_SIZE = 3000; // characters

function splitIntoChunks(text, maxLen = MAX_CHUNK_SIZE) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + maxLen));
    i += maxLen;
  }
  return chunks;
}

async function callGeminiForJSON(prompt, retries = 3) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set');
  }
  
  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      response_mime_type: 'application/json'
    }
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { data } = await axios.post(GEMINI_ENDPOINT, body, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!text) {
        throw new Error('Empty response from Gemini');
      }
      
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        // Fallback: return as a single summary string
        parsed = { summary: text, bullets: [] };
      }
      return parsed;
      
    } catch (error) {
      const isRateLimit = error.response?.status === 429;
      const isServerError = error.response?.status >= 500;
      
      if ((isRateLimit || isServerError) && attempt < retries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Rate limit/server error, retrying in ${delay}ms... (attempt ${attempt + 1}/${retries + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // If it's not retryable or we've exhausted retries, throw
      throw error;
    }
  }
}

async function summarizeLargeText(text, summaryLength) {
  const chunks = splitIntoChunks(text);

  const perChunkResults = [];
  for (const [idx, chunk] of chunks.entries()) {
    const prompt = `You are an assistant that outputs strictly JSON with keys: summary (string) and bullets (string array).\nSummarize the following text concisely. Provide 3-7 bullets. Aim length: ${summaryLength || 'short'}.\nRespond ONLY as JSON.\n\nTEXT CHUNK ${idx + 1}/${chunks.length}:\n"""\n${chunk}\n"""`;
    
    const result = await callGeminiForJSON(prompt);
    perChunkResults.push(result);
    
    // Add delay between chunks to avoid rate limits (except for last chunk)
    if (idx < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }
  }

  if (perChunkResults.length === 1) {
    return perChunkResults[0];
  }

  const combinedBullets = perChunkResults.flatMap(r => Array.isArray(r.bullets) ? r.bullets : []);
  const combinedSummaries = perChunkResults.map((r, i) => `Chunk ${i + 1}: ${r.summary || ''}`).join('\n');

  const combinePrompt = `You are an assistant that outputs strictly JSON with keys: summary (string) and bullets (string array).\nYou will be given multiple chunk summaries and bullets. Produce a single, coherent overall summary and 5-10 bullets capturing the most important points. Aim length: ${summaryLength || 'short'}.\nRespond ONLY as JSON.\n\nCHUNK SUMMARIES:\n${combinedSummaries}\n\nBULLETS:\n${combinedBullets.map(b => '- ' + b).join('\n')}`;

  return await callGeminiForJSON(combinePrompt);
}

// POST JSON { text, summary_length }
const summarizeText = async (req, res) => {
  try {
    const { text, summary_length } = req.body || {};
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ success: false, message: 'text is required in request body' });
    }

    const result = await summarizeLargeText(text, summary_length);
    return res.json({ success: true, summary: result.summary || '', bullets: result.bullets || [] });
  } catch (error) {
    console.error('summarizeText error:', error);
    return res.status(500).json({ success: false, message: 'Failed to summarize text', error: error.message });
  }
};

// Multipart with PDF file field 'file'
const summarizePdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No PDF file uploaded' });
    }

    const filePath = req.file.path;

    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      const text = data.text || '';

      const result = await summarizeLargeText(text);

      return res.json({ success: true, summary: result.summary || '', bullets: result.bullets || [] });
    } finally {
      // Always attempt cleanup
      try { fs.unlinkSync(filePath); } catch (_) {}
    }
  } catch (error) {
    console.error('summarizePdf error:', error);
    return res.status(500).json({ success: false, message: 'Failed to summarize PDF', error: error.message });
  }
};

module.exports = {
  summarizeText,
  summarizePdf
};
