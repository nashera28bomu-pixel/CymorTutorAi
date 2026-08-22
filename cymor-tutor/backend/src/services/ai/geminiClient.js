// Thin wrapper around the Gemini REST API. Keeps the API key server-side only,
// and gives the rest of the app one place to change providers later.
// gemini-1.5-* was fully shut down in 2026 - see https://ai.google.dev/gemini-api/docs/deprecations
const MODEL_SIMPLE = process.env.GEMINI_MODEL_SIMPLE || 'gemini-2.5-flash-lite';
const MODEL_COMPLEX = process.env.GEMINI_MODEL_COMPLEX || 'gemini-3.5-flash';

function buildUrl(model) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    const err = new Error('AI is not configured yet. Missing GEMINI_API_KEY.');
    err.status = 503;
    throw err;
  }
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
}

const REQUEST_TIMEOUT_MS = Number(process.env.GEMINI_REQUEST_TIMEOUT_MS) || 30000;

/**
 * @param {string} systemPrompt - task-specific instructions
 * @param {string} userPrompt - the learner's question / task input
 * @param {{ complex?: boolean, maxOutputTokens?: number }} options
 */
async function generate(systemPrompt, userPrompt, options = {}) {
  const model = options.complex ? MODEL_COMPLEX : MODEL_SIMPLE;
  const url = buildUrl(model);

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: options.temperature ?? 0.6,
      maxOutputTokens: options.maxOutputTokens || 1024
      // Deliberately NOT setting responseMimeType here even for JSON tasks -
      // support for it varies by model/API version, and a rejected/odd
      // request could stall. Callers that need JSON (quiz/flashcards) rely
      // on strong prompt instructions plus fallback parsing instead - see
      // parseQuizJson / parseFlashcardJson in their controllers.
    }
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } catch (networkErr) {
    if (networkErr.name === 'AbortError') {
      const err = new Error('The AI took too long to respond. Please try again.');
      err.status = 504;
      throw err;
    }
    const err = new Error('Cymor Tutor could not reach the AI service. Please try again.');
    err.status = 502;
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    let bodyText = '';
    try {
      bodyText = await response.text();
    } catch (e) {
      bodyText = '(could not read error body)';
    }
    console.error(`Gemini API error [${response.status}] for model ${model}:`, bodyText);

    if (response.status === 429) {
      const err = new Error('The AI service is busy right now. Please try again shortly.');
      err.status = 429;
      throw err;
    }
    const err = new Error('The AI service returned an error. Please try again.');
    err.status = 502;
    throw err;
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';

  if (!text) {
    const err = new Error('The AI did not return a usable response. Please try again.');
    err.status = 502;
    throw err;
  }

  return text;
}

/**
 * Streaming variant of generate(). Calls onChunk(textPiece) as text arrives,
 * so the frontend can render progressively instead of waiting for the full
 * response - this is what makes chat feel like ChatGPT/Claude rather than a
 * loading spinner followed by a wall of text.
 */
async function generateStream(systemPrompt, userPrompt, options = {}, onChunk) {
  const model = options.complex ? MODEL_COMPLEX : MODEL_SIMPLE;
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    const err = new Error('AI is not configured yet. Missing GEMINI_API_KEY.');
    err.status = 503;
    throw err;
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${key}`;

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: options.temperature ?? 0.6,
      maxOutputTokens: options.maxOutputTokens || 1024
    }
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } catch (networkErr) {
    clearTimeout(timeout);
    if (networkErr.name === 'AbortError') {
      const err = new Error('The AI took too long to respond. Please try again.');
      err.status = 504;
      throw err;
    }
    const err = new Error('Cymor Tutor could not reach the AI service. Please try again.');
    err.status = 502;
    throw err;
  }
  clearTimeout(timeout);

  if (!response.ok || !response.body) {
    let bodyText = '';
    try {
      bodyText = await response.text();
    } catch (e) {
      bodyText = '(could not read error body)';
    }
    console.error(`Gemini streaming API error [${response.status}] for model ${model}:`, bodyText);
    if (response.status === 429) {
      const err = new Error('The AI service is busy right now. Please try again shortly.');
      err.status = 429;
      throw err;
    }
    const err = new Error('The AI service returned an error. Please try again.');
    err.status = 502;
    throw err;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep the last (possibly incomplete) line for next iteration

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const jsonStr = trimmed.slice(5).trim();
      if (!jsonStr || jsonStr === '[DONE]') continue;

      try {
        const parsed = JSON.parse(jsonStr);
        const piece = parsed?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
        if (piece) {
          fullText += piece;
          onChunk(piece);
        }
      } catch (e) {
        // Incomplete/garbled SSE chunk - skip it, next chunk will usually recover.
      }
    }
  }

  if (!fullText) {
    const err = new Error('The AI did not return a usable response. Please try again.');
    err.status = 502;
    throw err;
  }

  return fullText;
}

module.exports = { generate, generateStream };
