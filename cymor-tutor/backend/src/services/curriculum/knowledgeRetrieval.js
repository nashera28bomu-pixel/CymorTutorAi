const KnowledgeChunk = require('../../models/KnowledgeChunk');

const MAX_CONTEXT_CHARS = 2500;

/**
 * Retrieves real ingested curriculum content (e.g. from KICD) relevant to a
 * learner's question, scoped to their education level where possible. This
 * is what lets Cymor Tutor ground answers in actual CBC curriculum content
 * instead of only general knowledge.
 */
async function retrieveCurriculumContext(question, { level, subjects } = {}) {
  if (!question || question.trim().length < 3) {
    return { excerpts: '', chunkCount: 0, used: false };
  }

  const filter = { $text: { $search: question } };
  if (level) filter.educationLevel = level;

  let matches = [];
  try {
    matches = await KnowledgeChunk.find(filter, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .limit(4)
      .lean();
  } catch (err) {
    matches = [];
  }

  // If nothing matched at the learner's exact level, try without the level
  // filter (e.g. a Junior School learner asking something covered at Upper
  // Primary level too) before giving up.
  if (!matches.length && level) {
    try {
      matches = await KnowledgeChunk.find(
        { $text: { $search: question } },
        { score: { $meta: 'textScore' } }
      )
        .sort({ score: { $meta: 'textScore' } })
        .limit(3)
        .lean();
    } catch (err) {
      matches = [];
    }
  }

  if (!matches.length) {
    return { excerpts: '', chunkCount: 0, used: false };
  }

  let combined = '';
  for (const m of matches) {
    const tagged = `[${m.subject}${m.grade ? ' - ' + m.grade : ''}]\n${m.text}`;
    if ((combined + tagged).length > MAX_CONTEXT_CHARS) break;
    combined += (combined ? '\n\n---\n\n' : '') + tagged;
  }

  return { excerpts: combined, chunkCount: matches.length, used: true };
}

module.exports = { retrieveCurriculumContext };
