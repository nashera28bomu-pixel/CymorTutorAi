function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'This origin is not permitted to access Cymor Tutor.' });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Some information was invalid.', details: err.message });
  }

  if (err.name === 'MulterError') {
    return res.status(400).json({ error: 'File upload failed.', details: err.message });
  }

  const status = err.status || 500;
  const message =
    status === 500
      ? 'Something went wrong on our side. Please try again in a moment.'
      : err.message;

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
