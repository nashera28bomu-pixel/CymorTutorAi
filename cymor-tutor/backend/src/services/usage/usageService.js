const Usage = require('../../models/Usage');

function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

async function getOrCreateToday(userId) {
  const date = todayKey();
  let record = await Usage.findOne({ userId, date });
  if (!record) {
    record = await Usage.create({ userId, date });
  }
  return record;
}

async function checkAndIncrementAiRequest(userId) {
  const dailyLimit = Number(process.env.DAILY_AI_REQUEST_LIMIT) || 40;
  const record = await getOrCreateToday(userId);

  if (record.aiRequests >= dailyLimit) {
    const err = new Error("You've reached today's free study limit. Your limit resets tomorrow.");
    err.status = 429;
    throw err;
  }

  record.aiRequests += 1;
  await record.save();
  return record;
}

async function checkAndIncrementQuiz(userId) {
  const dailyLimit = Number(process.env.MAX_QUIZ_GENERATIONS_PER_DAY) || 10;
  const record = await getOrCreateToday(userId);

  if (record.quizGenerations >= dailyLimit) {
    const err = new Error("You've reached today's free quiz limit. Try again tomorrow.");
    err.status = 429;
    throw err;
  }

  record.quizGenerations += 1;
  await record.save();
  return record;
}

async function checkAndIncrementExam(userId) {
  const dailyLimit = Number(process.env.MAX_EXAM_GENERATIONS_PER_DAY) || 5;
  const record = await getOrCreateToday(userId);

  if (record.examGenerations >= dailyLimit) {
    const err = new Error("You've reached today's free assessment-paper limit. Try again tomorrow.");
    err.status = 429;
    throw err;
  }

  record.examGenerations += 1;
  await record.save();
  return record;
}

async function incrementDocumentUpload(userId) {
  const record = await getOrCreateToday(userId);
  record.documentUploads += 1;
  await record.save();
  return record;
}

module.exports = {
  checkAndIncrementAiRequest,
  checkAndIncrementQuiz,
  checkAndIncrementExam,
  incrementDocumentUpload
};
