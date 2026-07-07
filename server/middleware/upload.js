const multer = require('multer');

// Store files in memory so we can upload them directly to Supabase
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Accept only image MIME types
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error(`File type "${file.mimetype}" is not allowed. Only image files are accepted.`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 6, // soft cap of 6 photos per upload
  },
});

// Error handling middleware for multer errors
function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Maximum is 6 photos per upload.' });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
}

module.exports = { upload, handleUploadError };
