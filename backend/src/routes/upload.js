const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const upload = require('../middleware/upload');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Upload standard attachments (single or multiple)
router.post('/files', upload.array('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files uploaded.' });
    }

    const fileInfos = req.files.map(f => ({
      originalName: f.originalname,
      filename: f.filename,
      size: f.size,
      mimetype: f.mimetype,
      path: f.path
    }));

    return res.json({ success: true, files: fileInfos });
  } catch (err) {
    console.error('Upload files error:', err);
    return res.status(500).json({ success: false, error: 'Failed to process file upload.' });
  }
});

// Upload ZIP containing per-recipient attachments
router.post('/zip-attachments', upload.single('zipFile'), (req, res) => {
  const allowedExtensions = new Set([
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.tsv',
    '.txt', '.rtf', '.odt', '.ods', '.odp',
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg',
    '.zip', '.tar', '.gz', '.json', '.xml', '.eml', '.msg'
  ]);

  const dangerousExtensions = new Set([
    '.exe', '.bat', '.cmd', '.sh', '.vbs', '.vbe', '.js', '.jse',
    '.wsf', '.wsh', '.msc', '.ps1', '.ps2', '.scr', '.msi', '.msp',
    '.dll', '.com', '.pif', '.reg', '.hta', '.cpl', '.jar', '.lnk'
  ]);

  const MAX_EXTRACT_SIZE = 50 * 1024 * 1024; // 50MB total extracted limit
  const MAX_ENTRIES = 100; // max 100 entries

  let extractDir = null;

  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No zip file uploaded.' });
    }

    const zipPath = req.file.path;
    extractDir = path.join(path.dirname(zipPath), `extracted-${path.basename(zipPath, path.extname(zipPath))}`);
    const resolvedExtractDir = path.resolve(extractDir);

    if (!fs.existsSync(resolvedExtractDir)) {
      fs.mkdirSync(resolvedExtractDir, { recursive: true });
    }

    const zip = new AdmZip(zipPath);
    const zipEntries = zip.getEntries();

    if (zipEntries.length > MAX_ENTRIES) {
      throw new Error(`Zip archive contains too many files (limit: ${MAX_ENTRIES}).`);
    }

    let totalExtractedSize = 0;
    const extractedFiles = [];

    for (const entry of zipEntries) {
      if (entry.isDirectory) {
        continue;
      }

      totalExtractedSize += entry.header.size;
      if (totalExtractedSize > MAX_EXTRACT_SIZE) {
        throw new Error(`Zip archive exceeds maximum allowed extraction size (${MAX_EXTRACT_SIZE / (1024 * 1024)}MB).`);
      }

      // 1. Path Traversal & Zip Slip verification
      const rawName = entry.entryName;
      if (rawName.includes('..') || rawName.includes('\0')) {
        throw new Error(`Zip archive contains illegal path characters in '${rawName}'.`);
      }

      const targetPath = path.resolve(resolvedExtractDir, rawName);
      if (!targetPath.startsWith(resolvedExtractDir + path.sep)) {
        throw new Error(`Zip Slip path traversal attempt detected in entry: '${rawName}'.`);
      }

      // 2. Extension validation
      const ext = path.extname(rawName).toLowerCase();
      if (dangerousExtensions.has(ext)) {
        throw new Error(`Executable or script file type not permitted in archive: '${ext}'.`);
      }

      if (!allowedExtensions.has(ext)) {
        throw new Error(`File type '${ext}' is not in the allowed attachments whitelist.`);
      }

      // 3. Safe extraction entry-by-entry
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      fs.writeFileSync(targetPath, entry.getData());

      extractedFiles.push({
        filename: path.basename(targetPath),
        path: targetPath,
        size: entry.header.size
      });
    }

    return res.json({
      success: true,
      message: `Safely extracted ${extractedFiles.length} files from archive.`,
      extractDir: resolvedExtractDir,
      files: extractedFiles
    });
  } catch (err) {
    console.error('Upload zip error:', err);
    // Cleanup if partially extracted
    if (extractDir && fs.existsSync(extractDir)) {
      try {
        fs.rmSync(extractDir, { recursive: true, force: true });
      } catch (cleanupErr) {
        console.error('Failed to clean up extraction dir:', cleanupErr);
      }
    }
    return res.status(400).json({ success: false, error: `Failed to safely extract zip: ${err.message}` });
  }
});

module.exports = router;
