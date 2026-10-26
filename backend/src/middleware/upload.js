const multer = require('multer');
const path = require('path');
const fs = require('fs');

const defaultUploadsDir = process.env.VERCEL
  ? '/tmp/uploads'
  : path.resolve(__dirname, '../../uploads');
const uploadsDir = process.env.UPLOADS_DIR || defaultUploadsDir;
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${basename}-${uniqueSuffix}${ext}`);
  }
});

const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt', '.rtf',
  '.odt', '.ods', '.odp', '.png', '.jpg', '.jpeg', '.gif', '.webp',
  '.zip', '.tar', '.gz', '.json'
]);

const fileFilter = (req, file, cb) => {
  // Check for null bytes in filename
  if (file.originalname.includes('\0')) {
    const err = new Error('Invalid filename: null bytes detected.');
    err.status = 400;
    return cb(err, false);
  }

  const ext = path.extname(file.originalname).toLowerCase();

  // Check against strict whitelist
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    const err = new Error(`File type ${ext || '(none)'} is not allowed. Permitted types: PDF, Office docs, CSV/TXT, images, and ZIP archives.`);
    err.status = 400;
    return cb(err, false);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 5 // Max 5 attachments
  },
  fileFilter
});

module.exports = upload;
