// DEV-ONLY FALLBACK. This creates a tiny placeholder curriculum skeleton for local
// testing before you have run the real ingestion. It is NOT used by default and its
// output is always marked isDemoData: true. Prefer `npm run ingest:kicd` for real content.

// Seeds a minimal CBC/CBE curriculum skeleton so the app has something to
// browse before real curriculum data is ingested. Everything here is marked
// isDemoData so it's never confused with verified curriculum content.
// Run with: node scripts/knowledge-ingestion/seedCurriculum.js
require('dotenv').config();
const mongoose = require('mongoose');
const CurriculumLevel = require('../../src/models/CurriculumLevel');
const Subject = require('../../src/models/Subject');
const Topic = require('../../src/models/Topic');

const LEVELS = [
  { name: 'Lower Primary', order: 1 },
  { name: 'Upper Primary', order: 2 },
  { name: 'Junior School', order: 3 },
  { name: 'Senior School', order: 4 }
];

const SUBJECTS_BY_LEVEL = {
  'Lower Primary': ['Mathematics', 'English', 'Kiswahili', 'Environmental Activities'],
  'Upper Primary': ['Mathematics', 'English', 'Kiswahili', 'Science and Technology', 'Social Studies'],
  'Junior School': ['Integrated Science', 'Mathematics', 'English', 'Kiswahili', 'Pre-Technical Studies'],
  'Senior School': ['Biology', 'Chemistry', 'Physics', 'Mathematics', 'English', 'Business Studies']
};

const SAMPLE_TOPICS = {
  'Integrated Science': [
    { name: 'Cells', strand: 'Living Things', subStrand: 'Cell Structure' }
  ],
  Mathematics: [
    { name: 'Linear Equations', strand: 'Algebra', subStrand: 'Equations' }
  ]
};

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected. Seeding demo curriculum data...');

  for (const levelData of LEVELS) {
    const level = await CurriculumLevel.findOneAndUpdate(
      { name: levelData.name },
      levelData,
      { upsert: true, new: true }
    );

    const subjectNames = SUBJECTS_BY_LEVEL[levelData.name] || [];
    for (const subjectName of subjectNames) {
      const subject = await Subject.findOneAndUpdate(
        { name: subjectName, level: level._id },
        { name: subjectName, level: level._id },
        { upsert: true, new: true }
      );

      const topics = SAMPLE_TOPICS[subjectName] || [];
      for (const topic of topics) {
        await Topic.findOneAndUpdate(
          { name: topic.name, subject: subject._id },
          { ...topic, subject: subject._id, isDemoData: true },
          { upsert: true, new: true }
        );
      }
    }
  }

  console.log('Demo curriculum seed complete.');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
