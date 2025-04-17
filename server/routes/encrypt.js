const express = require('express');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const minifyCSS = require('../tasks/minifyCSS');
const obfuscateJS = require('../tasks/obfuscateJS');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/', upload.fields([{ name: 'css' }, { name: 'js' }]), async (req, res) => {
  const timestamp = Date.now();
  const uploadDir = path.join(__dirname, '..', 'uploads', String(timestamp));
  const outputDir = path.join(__dirname, '..', 'output', String(timestamp));

  await fs.ensureDir(uploadDir);
  await fs.ensureDir(outputDir);

  const moveFiles = async (files) => {
    for (const file of files) {
      const destPath = path.join(uploadDir, file.originalname);
      await fs.move(file.path, destPath, { overwrite: true });
    }
  };

  try {
    if (req.files?.css) await moveFiles(req.files.css);
    if (req.files?.js) await moveFiles(req.files.js);

    if (req.files?.css) await minifyCSS(uploadDir, outputDir);
    if (req.files?.js) await obfuscateJS(uploadDir, outputDir);

    const archiveFormat = req.body.format || 'zip';
    const userFilename = (req.body.name || 'encrypted-files').trim().replace(/[^a-z0-9-_]/gi, '_');
    const archiveName = `${timestamp}.${archiveFormat}`;
    const archivePath = path.join(__dirname, '..', 'output', archiveName);

    const output = fs.createWriteStream(archivePath);
    const archive = archiver(archiveFormat === 'zip' ? 'zip' : 'tar', {
      zlib: { level: 9 },
      gzip: archiveFormat === 'tar.gz'
    });

    output.on('close', () => {
      console.log(`Archive ${archiveName} created successfully.`);
      res.json({ downloadLink: `/download/${archiveName}?name=${userFilename}.${archiveFormat}` });
    });

    archive.on('error', (err) => {
      console.error('Archiving error:', err);
      res.status(500).json({ error: 'Failed to create archive' });
    });

    archive.pipe(output);
    archive.directory(outputDir, false);
    archive.finalize();

  } catch (err) {
    console.error('Encryption error:', err);
    res.status(500).json({ error: 'Encryption failed' });
  }
});

// ✅ Download route that renames the file in the browser
router.get('/download/:filename', (req, res) => {
  const { filename } = req.params;
  const displayName = req.query.name || filename;
  const filePath = path.join(__dirname, '..', 'output', filename);

  if (fs.existsSync(filePath)) {
    res.download(filePath, displayName); // ✅ forces browser rename
  } else {
    res.status(404).send('File not found');
  }
});


module.exports = router;
