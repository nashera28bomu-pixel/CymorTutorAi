const multer = require('multer');

const maxSizeMb = Number(process.env.MAX_PDF_SIZE_MB) || 15;

const allowedMimeTypes = new Set([
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: maxSizeMb * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return cb(new Error('Unsupported file type. Please upload a PDF, TXT, or DOCX file.'));
    }
    cb(null, true);
  }
});

module.exports = upload;
