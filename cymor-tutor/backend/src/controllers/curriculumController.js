const curriculumService = require('../services/curriculum/curriculumService');
const asyncHandler = require('../utils/asyncHandler');

const getLevels = asyncHandler(async (req, res) => {
  const levels = await curriculumService.getLevels();
  res.json({ levels });
});

const getSubjects = asyncHandler(async (req, res) => {
  const subjects = await curriculumService.getSubjects(req.query.level);
  res.json({ subjects });
});

const getTopics = asyncHandler(async (req, res) => {
  const topics = await curriculumService.getTopics(req.query.subject);
  res.json({ topics });
});

module.exports = { getLevels, getSubjects, getTopics };
