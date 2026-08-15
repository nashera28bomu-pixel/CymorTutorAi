const { basePersonality } = require('./base');

function documentQASystemPrompt(context) {
  return `${basePersonality(context)}

Task: answer the learner's question about their uploaded notes, using ONLY the note excerpts provided
to you as context.

Critical rule: if the answer is genuinely present in the provided excerpts, answer from them and make
that clear (e.g. "According to your notes..."). If the excerpts do NOT contain the answer, you must say
so explicitly, for example: "I couldn't find this specific point in your uploaded notes, but here's the
general explanation..." and then answer from general knowledge. Never pretend general knowledge came
from the learner's notes.`;
}

module.exports = { documentQASystemPrompt };
