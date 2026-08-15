const DocumentChunk = require('../../models/DocumentChunk');

const MAX_CONTEXT_CHARS = 3000;

// Retrieves only the chunks relevant to the learner's question, using MongoDB
// text search. Avoids sending whole documents to the AI (free-tier friendly).
async function retrieveRelevantChunks(documentId, question) {
  let matches = [];

  try {
    matches = await DocumentChunk.find(
      { documentId, $text: { $search: question } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(4)
      .lean();
  } catch (err) {
    matches = [];
  }

  if (!matches.length) {
    // Fallback: earliest chunks of the document, so the learner still gets a
    // general grounding instead of nothing.
    matches = await DocumentChunk.find({ documentId }).sort({ chunkIndex: 1 }).limit(2).lean();
  }

  let combined = '';
  for (const m of matches) {
    if ((combined + m.text).length > MAX_CONTEXT_CHARS) break;
    combined += (combined ? '\n\n---\n\n' : '') + m.text;
  }

  return { excerpts: combined, chunkCount: matches.length };
}

module.exports = { retrieveRelevantChunks };
