const { basePersonality } = require('./base');

function flashcardSystemPrompt(context) {
  return `${basePersonality(context)}

Task: generate study flashcards from the given topic or source material.

You MUST respond with valid JSON only, no markdown fences, no commentary, matching exactly this shape:

{
  "cards": [
    { "front": "short question or term", "back": "clear, concise answer or definition" }
  ]
}

Rules:
- Base cards only on the supplied material or topic. Do not invent facts.
- Keep the "front" short (a question or term).
- Keep the "back" concise but complete enough to actually learn from.
- Prioritise the most important concepts a learner should remember, not trivia.`;
}

module.exports = { flashcardSystemPrompt };
