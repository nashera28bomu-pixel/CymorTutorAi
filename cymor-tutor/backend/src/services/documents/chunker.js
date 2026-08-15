// Splits cleaned document text into study-sized chunks so we never send an
// entire document to the AI on every question (see architecture notes).
const MAX_CHUNK_CHARS = 1400;
const MIN_CHUNK_CHARS = 200;

function chunkText(cleanedText) {
  const paragraphs = cleanedText.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const chunks = [];
  let current = '';

  for (const paragraph of paragraphs) {
    if ((current + '\n\n' + paragraph).length > MAX_CHUNK_CHARS && current.length >= MIN_CHUNK_CHARS) {
      chunks.push(current.trim());
      current = paragraph;
    } else {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks.map((text, index) => ({
    text,
    chunkIndex: index,
    keywords: extractKeywords(text)
  }));
}

// Very lightweight keyword extraction (no ML dependency) to aid retrieval.
function extractKeywords(text) {
  const stopwords = new Set(['the', 'and', 'that', 'with', 'this', 'from', 'have', 'are', 'was', 'were']);
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 4 && !stopwords.has(w));

  const freq = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([w]) => w);
}

module.exports = { chunkText };
