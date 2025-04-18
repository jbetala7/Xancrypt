const express = require('express');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const minifyCSS = require('../tasks/minifyCSS');
const obfuscateJS = require('../tasks/obfuscateJS');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// POST /api/encrypt
router.post('/', upload.fields([{ name: 'css' }, { name: 'js' }]), async (req, res) => {
  const timestamp = Date.now();
  const uploadDir = path.join(__dirname, '..', 'uploads', String(timestamp));
  const outputDir = path.join(__dirname, '..', 'output', String(timestamp));

  try {
    await fs.ensureDir(uploadDir);
    await fs.ensureDir(outputDir);

    const moveFiles = async (files) => {
      for (const file of files) {
        const destPath = path.join(uploadDir, file.originalname);
        await fs.move(file.path, destPath, { overwrite: true });
      }
    };

    if (req.files?.css) await moveFiles(req.files.css);
    if (req.files?.js) await moveFiles(req.files.js);

    if (req.files?.css) await minifyCSS(uploadDir, outputDir);
    if (req.files?.js) await obfuscateJS(uploadDir, outputDir);

    const userFilename = (req.body.name || 'encrypted-files').trim().replace(/[^a-z0-9-_]/gi, '_');
    const archiveName = `${timestamp}.zip`;
    const archivePath = path.join(__dirname, '..', 'output', archiveName);

    // Create archive and pipe to file
    const output = fs.createWriteStream(archivePath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(output);
    archive.directory(outputDir, false);

    archive.finalize();

    // Wait for it to fully finish writing before sending response
    output.on('close', () => {
      console.log(`✅ ZIP archive ${archiveName} finalized. Size: ${archive.pointer()} bytes`);
      // Ensure the file really exists and is fully written
      fs.pathExists(archivePath).then(exists => {
        if (exists) {
          res.json({ downloadLink: `/download/${archiveName}?name=${userFilename}.zip` });
        } else {
          res.status(500).json({ error: 'ZIP file not found after creation' });
        }
      });
    });

    archive.on('error', (err) => {
      console.error('❌ Archive error:', err);
      res.status(500).json({ error: 'Failed to create ZIP archive' });
    });

  } catch (err) {
    console.error('❌ Encryption error:', err);
    res.status(500).json({ error: 'Encryption failed' });
  }
});

// GET /download/:filename
router.get('/download/:filename', (req, res) => {
  const filePath = path.join(__dirname, '..', 'output', req.params.filename);
  const displayName = req.query.name || req.params.filename;

  if (fs.existsSync(filePath)) {
    res.download(filePath, displayName); // ✅ Triggers download with renamed file
  } else {
    res.status(404).send('File not found');
  }
});

module.exports = router;
