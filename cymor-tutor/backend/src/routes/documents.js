const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  uploadDocument,
  listDocuments,
  getDocument,
  deleteDocument,
  askDocument,
  summarizeDocument
} = require('../controllers/documentController');

router.post('/upload', protect, upload.single('file'), uploadDocument);
router.get('/', protect, listDocuments);
router.get('/:id', protect, getDocument);
router.delete('/:id', protect, deleteDocument);
router.post('/:id/ask', protect, askDocument);
router.post('/:id/summarize', protect, summarizeDocument);

module.exports = router;
