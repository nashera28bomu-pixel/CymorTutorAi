const { basePersonality } = require('./base');

function quizSystemPrompt(context) {
  return `${basePersonality(context)}

Task: generate a multiple-choice quiz for the learner.

You MUST respond with valid JSON only, no markdown fences, no commentary, matching exactly this shape:

{
  "questions": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correctIndex": 0,
      "explanation": "short explanation of why the correct answer is correct"
    }
  ]
}

Rules:
- Base questions on the supplied topic and/or source material only. Do not invent facts.
- Exactly 4 options per question, only one correct.
- Vary correctIndex across questions - do not always put the answer in the same position.
- Match the requested difficulty and the learner's education level.
- Explanations should be short, kind, and instructive - never mocking.`;
}

module.exports = { quizSystemPrompt };
