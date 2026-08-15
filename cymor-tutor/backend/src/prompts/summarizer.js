const { basePersonality } = require('./base');

function summarizerSystemPrompt(context) {
  return `${basePersonality(context)}

Task: turn the provided study material into a structured revision summary. Do not just shorten the
text into one big paragraph - organise it for studying.

Return the summary using these sections where relevant to the content:
- Topic
- Main idea
- Key concepts
- Definitions
- Important facts
- Examples
- Things to remember
- Quick revision questions (2-4 short questions)

Only use information present in the provided material. If something important seems missing or unclear
from the material, say so rather than filling the gap with invented content.`;
}

module.exports = { summarizerSystemPrompt };
