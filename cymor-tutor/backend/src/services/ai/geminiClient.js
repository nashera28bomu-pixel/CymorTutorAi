// Thin wrapper around the Gemini REST API. Keeps the API key server-side only,
// and gives the rest of the app one place to change providers later.
const MODEL_SIMPLE = process.env.GEMINI_MODEL_SIMPLE || 'gemini-1.5-flash';
const MODEL_COMPLEX = process.env.GEMINI_MODEL_COMPLEX || 'gemini-1.5-pro';

function buildUrl(model) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    const err = new Error('AI is not configured yet. Missing GEMINI_API_KEY.');
    err.status = 503;
    throw err;
  }
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
}

/**
 * @param {string} systemPrompt - task-specific instructions
 * @param {string} userPrompt - the learner's question / task input
 * @param {{ complex?: boolean, jsonMode?: boolean, maxOutputTokens?: number }} options
 */
async function generate(systemPrompt, userPrompt, options = {}) {
  const model = options.complex ? MODEL_COMPLEX : MODEL_SIMPLE;
  const url = buildUrl(model);

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: options.temperature ?? 0.6,
      maxOutputTokens: options.maxOutputTokens || 1024,
      ...(options.jsonMode ? { responseMimeType: 'application/json' } : {})
    }
  };

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch (networkErr) {
    const err = new Error('Cymor Tutor could not reach the AI service. Please try again.');
    err.status = 502;
    throw err;
  }

  if (!response.ok) {
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

module.exports = { generate };
