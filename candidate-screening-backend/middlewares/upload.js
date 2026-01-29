import multer from 'multer';

// Multer with memory storage (NO filesystem usage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx/;

    const isValid =
      allowedTypes.test(file.mimetype) ||
      allowedTypes.test(file.originalname.toLowerCase());

    if (isValid) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
    }
  },
});

export default upload;