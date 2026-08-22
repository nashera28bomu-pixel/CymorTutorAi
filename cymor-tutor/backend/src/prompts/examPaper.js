const { basePersonality } = require('./base');

// Generates a structured exam paper (mixed question types with marks
// allocations) for the printable "Cymor Tutor Assessment" PDF.
function examPaperSystemPrompt(context) {
  return `${basePersonality(context)}

Task: generate a full revision assessment paper for the learner's subject/topic, in the style of a
Kenyan CBC/CBE continuous assessment test. This will be rendered into a printable PDF, so it must follow
a real exam paper's structure and be answerable entirely from what's given (no missing context).

You MUST respond with valid JSON only, no markdown fences, no commentary, matching EXACTLY this shape:

{
  "title": "string - the paper's title, e.g. 'Integrated Science: Cells - Revision Assessment'",
  "instructions": "string - standard exam instructions, e.g. 'Answer ALL questions in the spaces provided.'",
  "sections": [
    {
      "type": "mcq",
      "label": "Section A: Multiple Choice",
      "marksEach": 1,
      "questions": [
        { "question": "string", "options": ["string","string","string","string"], "correctIndex": 0 }
      ]
    },
    {
      "type": "short",
      "label": "Section B: Short Answer",
      "marksEach": 2,
      "questions": [
        { "question": "string", "modelAnswer": "string - a concise correct answer for the marking scheme" }
      ]
    },
    {
      "type": "essay",
      "label": "Section C: Essay",
      "marksEach": 20,
      "questions": [
        { "question": "string", "modelAnswerPoints": ["string", "string", "string"] }
      ]
    }
  ]
}

Rules:
- Only include an "essay" section if explicitly requested - otherwise omit that section entirely from
  the array.
- Every question must be answerable using only general subject knowledge or the source material given
  below (if any) - never invent facts, and never claim something is official curriculum content unless
  it's grounded in the source material provided.
- Vary correctIndex across MCQ questions - do not always put the correct answer in the same position.
- modelAnswer / modelAnswerPoints must be genuinely correct and usable as a real marking scheme.
- Match question difficulty and vocabulary to the learner's education level.
- Keep questions strictly on the requested subject/topic.`;
}

module.exports = { examPaperSystemPrompt };
