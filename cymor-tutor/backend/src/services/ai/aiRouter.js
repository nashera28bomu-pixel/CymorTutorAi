const gemini = require('./geminiClient');
const { tutorSystemPrompt } = require('../../prompts/tutor');
const { mathSystemPrompt } = require('../../prompts/mathematics');
const { summarizerSystemPrompt } = require('../../prompts/summarizer');
const { quizSystemPrompt } = require('../../prompts/quiz');
const { flashcardSystemPrompt } = require('../../prompts/flashcards');
const { documentQASystemPrompt } = require('../../prompts/documentQA');

const MATH_PATTERN = /[0-9].*[=+\-*/^]|solve|equation|simplify|factori[sz]e|calculate/i;

// Determines task type, prompt template, model tier, and output size.
// Central place to change routing logic without touching controllers.
function classify(taskTypeHint, questionText = '') {
  if (taskTypeHint) return taskTypeHint;
  if (MATH_PATTERN.test(questionText)) return 'mathematics';
  return 'simple_question';
}

async function route({ taskType, question, context, sourceExcerpts, extra }) {
  const resolvedType = classify(taskType, question);

  switch (resolvedType) {
    case 'mathematics': {
      const system = mathSystemPrompt(context);
      const text = await gemini.generate(system, question, { maxOutputTokens: 900 });
      return { taskType: resolvedType, text };
    }

    case 'document_qa': {
      const system = documentQASystemPrompt(context);
      const prompt = `Note excerpts:\n"""\n${sourceExcerpts || '(no relevant excerpts found)'}\n"""\n\nLearner's question: ${question}`;
      const text = await gemini.generate(system, prompt, { maxOutputTokens: 900 });
      return { taskType: resolvedType, text, usedDocument: Boolean(sourceExcerpts) };
    }

    case 'summarization': {
      const system = summarizerSystemPrompt(context);
      const prompt = `Study material:\n"""\n${sourceExcerpts}\n"""`;
      const text = await gemini.generate(system, prompt, { maxOutputTokens: 1200, complex: true });
      return { taskType: resolvedType, text };
    }

    case 'quiz_generation': {
      const system = quizSystemPrompt(context);
      const prompt = `Subject: ${extra?.subject || 'general'}\nTopic: ${extra?.topic || question}\nDifficulty: ${extra?.difficulty || 'medium'}\nNumber of questions: ${extra?.numQuestions || 5}\n${sourceExcerpts ? `Source material:\n"""\n${sourceExcerpts}\n"""` : ''}`;
      const text = await gemini.generate(system, prompt, {
        maxOutputTokens: 1500,
        jsonMode: true,
        complex: true
      });
      return { taskType: resolvedType, text };
    }

    case 'flashcards': {
      const system = flashcardSystemPrompt(context);
      const prompt = `Subject: ${extra?.subject || 'general'}\nTopic: ${extra?.topic || question}\nNumber of cards: ${extra?.numCards || 10}\n${sourceExcerpts ? `Source material:\n"""\n${sourceExcerpts}\n"""` : ''}`;
      const text = await gemini.generate(system, prompt, { maxOutputTokens: 1200, jsonMode: true });
      return { taskType: resolvedType, text };
    }

    case 'simple_question':
    case 'explanation':
    default: {
      const system = tutorSystemPrompt(context);
      const prompt = sourceExcerpts
        ? `Curriculum excerpts (official KICD curriculum designs):\n"""\n${sourceExcerpts}\n"""\n\n${question}`
        : question;
      const text = await gemini.generate(system, prompt, { maxOutputTokens: 800 });
      return { taskType: 'simple_question', text, usedCurriculum: Boolean(sourceExcerpts) };
    }
  }
}

module.exports = { route, classify };
