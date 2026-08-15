const CurriculumLevel = require('../../models/CurriculumLevel');
const Subject = require('../../models/Subject');
const Topic = require('../../models/Topic');

async function getLevels() {
  return CurriculumLevel.find().sort({ order: 1 }).lean();
}

async function getSubjects(levelId) {
  const query = levelId ? { level: levelId } : {};
  return Subject.find(query).sort({ name: 1 }).lean();
}

async function getTopics(subjectId) {
  const query = subjectId ? { subject: subjectId } : {};
  return Topic.find(query).sort({ name: 1 }).lean();
}

module.exports = { getLevels, getSubjects, getTopics };
