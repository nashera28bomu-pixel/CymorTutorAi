const Document = require('../models/Document');
const DocumentChunk = require('../models/DocumentChunk');
const { extractText, cleanText } = require('../services/documents/pdfExtractor');
const { chunkText } = require('../services/documents/chunker');
const { retrieveRelevantChunks } = require('../services/documents/retrieval');
const aiRouter = require('../services/ai/aiRouter');
const usageService = require('../services/usage/usageService');
const asyncHandler = require('../utils/asyncHandler');

const MAX_PAGES = Number(process.env.MAX_PDF_PAGES) || 60;

const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Please attach a file to upload.' });
  }

  await usageService.incrementDocumentUpload(req.user._id);

  const document = await Document.create({
    userId: req.user._id,
    filename: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    status: 'processing'
  });

  try {
    const { text, pageCount } = await extractText(req.file.buffer, req.file.mimetype);

    if (pageCount > MAX_PAGES) {
      document.status = 'failed';
      document.failureReason = `This document has ${pageCount} pages, which is above the ${MAX_PAGES}-page limit for this plan.`;
      await document.save();
      return res.status(400).json({ error: document.failureReason });
    }

    const cleaned = cleanText(text);
    if (!cleaned || cleaned.length < 20) {
      document.status = 'failed';
      document.failureReason = 'We could not read any text from this file. It may be a scanned image without a text layer.';
      await document.save();
      return res.status(400).json({ error: document.failureReason });
    }

    const chunks = chunkText(cleaned);
    await DocumentChunk.insertMany(
      chunks.map((c) => ({ ...c, documentId: document._id }))
    );

    document.pageCount = pageCount;
    document.status = 'ready';
    await document.save();

    res.status(201).json({ document });
  } catch (err) {
    document.status = 'failed';
    document.failureReason = 'We could not process this file. Please try a different file.';
    await document.save();
    throw err;
  }
});

const listDocuments = asyncHandler(async (req, res) => {
  const documents = await Document.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
  res.json({ documents });
});

const getDocument = asyncHandler(async (req, res) => {
  const document = await Document.findOne({ _id: req.params.id, userId: req.user._id }).lean();
  if (!document) return res.status(404).json({ error: 'Document not found.' });
  res.json({ document });
});

const deleteDocument = asyncHandler(async (req, res) => {
  const document = await Document.findOne({ _id: req.params.id, userId: req.user._id });
  if (!document) return res.status(404).json({ error: 'Document not found.' });

  await DocumentChunk.deleteMany({ documentId: document._id });
  await document.deleteOne();

  res.json({ success: true });
});

async function loadReadyDocument(userId, documentId) {
  const document = await Document.findOne({ _id: documentId, userId });
  if (!document) {
    const err = new Error('Document not found.');
    err.status = 404;
    throw err;
  }
  if (document.status !== 'ready') {
    const err = new Error('This document is still being processed. Please try again shortly.');
    err.status = 409;
    throw err;
  }
  return document;
}

const askDocument = asyncHandler(async (req, res) => {
  const { question } = req.body;
  if (!question || !question.trim()) {
    return res.status(400).json({ error: 'Please enter a question about your notes.' });
  }

  const document = await loadReadyDocument(req.user._id, req.params.id);
  await usageService.checkAndIncrementAiRequest(req.user._id);

  const { excerpts, chunkCount } = await retrieveRelevantChunks(document._id, question);

  const result = await aiRouter.route({
    taskType: 'document_qa',
    question,
    sourceExcerpts: excerpts,
    context: { level: req.user.educationLevel, subjects: req.user.subjects }
  });

  res.json({ reply: result.text, chunksUsed: chunkCount, documentId: document._id });
});

const summarizeDocument = asyncHandler(async (req, res) => {
  const document = await loadReadyDocument(req.user._id, req.params.id);
  await usageService.checkAndIncrementAiRequest(req.user._id);

  const chunks = await DocumentChunk.find({ documentId: document._id }).sort({ chunkIndex: 1 }).lean();
  const combined = chunks
    .map((c) => c.text)
    .join('\n\n')
    .slice(0, 6000); // cap total input size sent to the AI

  const result = await aiRouter.route({
    taskType: 'summarization',
    question: 'Summarize this document.',
    sourceExcerpts: combined,
    context: { level: req.user.educationLevel, subjects: req.user.subjects }
  });

  res.json({ summary: result.text, documentId: document._id });
});

module.exports = {
  uploadDocument,
  listDocuments,
  getDocument,
  deleteDocument,
  askDocument,
  summarizeDocument
};
