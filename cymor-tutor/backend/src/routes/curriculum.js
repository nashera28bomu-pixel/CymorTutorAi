const express = require('express');
const router = express.Router();
const { getLevels, getSubjects, getTopics } = require('../controllers/curriculumController');

router.get('/levels', getLevels);
router.get('/subjects', getSubjects);
router.get('/topics', getTopics);

module.exports = router;
