const gemini = require('./geminiClient');
const { tutorSystemPrompt } = require('../../prompts/tutor');
const { mathSystemPrompt } = require('../../prompts/mathematics');
const { summarizerSystemPrompt } = require('../../prompts/summarizer');
const { quizSystemPrompt } = require('../../prompts/quiz');
const { flashcardSystemPrompt } = require('../../prompts/flashcards');
const { documentQASystemPrompt } = require('../../prompts/documentQA');
const { markingSystemPrompt } = require('../../prompts/marking');
const { essaySystemPrompt } = require('../../prompts/essay');

const MATH_PATTERN = /[0-9].*[=+\-*/^]|solve|equation|simplify|factori[sz]e|calculate/i;
const ESSAY_PATTERN = /write (an|a full|a detailed)? ?essay|essay (on|about|titled|question)|compose an essay|discuss.{0,40}in (an|your) essay/i;
const PRACTICE_MARKER = '📝 Try this:';

// Determines task type, prompt template, model tier, and output size.
// Central place to change routing logic without touching controllers.
function classify(taskTypeHint, questionText = '') {
  if (taskTypeHint) return taskTypeHint;
  if (ESSAY_PATTERN.test(questionText)) return 'essay';
  if (MATH_PATTERN.test(questionText)) return 'mathematics';
  return 'simple_question';
}

function buildTextTask({ taskType, question, context, sourceExcerpts, extra }) {
  const resolvedType = classify(taskType, question);

  if (resolvedType === 'marking') {
    const system = markingSystemPrompt(context);
    const prompt = `Practice question you gave the learner:\n"""\n${extra?.previousQuestion || '(not available)'}\n"""\n\nLearner's attempted working/answer:\n"""\n${question}\n"""`;
    return { system, prompt, maxOutputTokens: 900, complex: false, resolvedType };
  }

  if (resolvedType === 'essay') {
    const system = essaySystemPrompt(context);
    return { system, prompt: question, maxOutputTokens: 2200, complex: true, resolvedType };
  }

  if (resolvedType === 'mathematics') {
    const system = mathSystemPrompt(context);
    return { system, prompt: question, maxOutputTokens: 900, complex: false, resolvedType };
  }

  if (resolvedType === 'document_qa') {
    const system = documentQASystemPrompt(context);
    const prompt = `Note excerpts:\n"""\n${sourceExcerpts || '(no relevant excerpts found)'}\n"""\n\nLearner's question: ${question}`;
    return { system, prompt, maxOutputTokens: 900, complex: false, resolvedType };
  }

  // simple_question / explanation (default)
  const system = tutorSystemPrompt(context);
  const prompt = sourceExcerpts
    ? `Curriculum excerpts (official KICD curriculum designs):\n"""\n${sourceExcerpts}\n"""\n\n${question}`
    : question;
  return { system, prompt, maxOutputTokens: 1700, complex: true, resolvedType: 'simple_question' };
}

async function route({ taskType, question, context, sourceExcerpts, extra }) {
  const resolvedType = classify(taskType, question);

  switch (resolvedType) {
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

    default: {
      const built = buildTextTask({ taskType, question, context, sourceExcerpts, extra });
      const text = await gemini.generate(built.system, built.prompt, {
        maxOutputTokens: built.maxOutputTokens,
        complex: built.complex
      });
      return { taskType: built.resolvedType, text, usedCurriculum: Boolean(sourceExcerpts) };
    }
  }
}

// Streaming variant - only used for chat-style text tasks (simple_question,
// mathematics, document_qa, marking), never for JSON tasks like quizzes.
async function routeStream({ taskType, question, context, sourceExcerpts, extra }, onChunk) {
  const built = buildTextTask({ taskType, question, context, sourceExcerpts, extra });
  const text = await gemini.generateStream(
    built.system,
    built.prompt,
    { maxOutputTokens: built.maxOutputTokens, complex: built.complex },
    onChunk
  );
  return { taskType: built.resolvedType, text, usedCurriculum: Boolean(sourceExcerpts) };
}

module.exports = { route, routeStream, classify, PRACTICE_MARKER };
