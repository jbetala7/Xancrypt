const express = require('express');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const minifyCSS = require('../tasks/minifyCSS.js');
const obfuscateJS = require('../tasks/obfuscateJS.js');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/', upload.fields([{ name: 'css' }, { name: 'js' }]), async (req, res) => {
  try {
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

    if (req.files?.css) await moveFiles(req.files.css);
    if (req.files?.js) await moveFiles(req.files.js);

    if (req.files?.css) await minifyCSS(uploadDir, outputDir);
    if (req.files?.js) await obfuscateJS(uploadDir, outputDir);

    const archiveFormat = req.body.format || 'zip';
    const userFilename = (req.body.name || 'encrypted-files').trim().replace(/[^a-z0-9-_]/gi, '_');
    const archiveName = `${timestamp}.${archiveFormat}`;
    const archivePath = path.join(__dirname, '..', 'output', archiveName);

    const archive = archiver(
      archiveFormat === 'tar.gz' ? 'tar' : 'zip',
      {
        zlib: { level: 9 },
        gzip: archiveFormat === 'tar.gz'
      }
    );

    const output = fs.createWriteStream(archivePath);

    output.on('close', () => {
      return res.json({
        downloadLink: `/download/${archiveName}?name=${userFilename}.${archiveFormat}`
      });
    });

    archive.on('error', (err) => {
      console.error('Archive error:', err);
      return res.status(500).json({ error: 'Failed to create archive.' });
    });

    archive.pipe(output);
    archive.directory(outputDir, false);
    await archive.finalize(); // wait for completion

  } catch (err) {
    console.error('Encryption error:', err);
    return res.status(500).json({ error: 'Encryption failed' });
  }
});

router.get('/download/:filename', (req, res) => {
  const filePath = path.join(__dirname, '..', 'output', req.params.filename);
  const displayName = req.query.name || req.params.filename;

  if (fs.existsSync(filePath)) {
    res.download(filePath, displayName);
  } else {
    res.status(404).send('File not found');
  }
});

module.exports = router;
