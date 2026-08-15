const pdfParse = require('pdf-parse');

// Extracts raw text (and an approximate page count) from an uploaded file buffer.
async function extractText(buffer, mimeType) {
  if (mimeType === 'application/pdf') {
    const data = await pdfParse(buffer);
    return { text: data.text || '', pageCount: data.numpages || 0 };
  }

  if (mimeType === 'text/plain') {
    const text = buffer.toString('utf-8');
    return { text, pageCount: 1 };
  }

  // DOCX: kept simple for v1 - a dedicated docx text extractor can be swapped in later
  // without changing the rest of the pipeline.
  const err = new Error('DOCX extraction is not enabled yet on this deployment. Please upload a PDF or TXT file.');
  err.status = 400;
  throw err;
}

function cleanText(raw) {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

module.exports = { extractText, cleanText };
