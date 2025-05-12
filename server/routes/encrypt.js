// routes/encrypt.js

const express = require('express');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const zlib = require('zlib');
const minifyCSS = require('../tasks/minifyCSS');
const obfuscateJS = require('../tasks/obfuscateJS');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post(
  '/',
  upload.fields([{ name: 'css' }, { name: 'js' }]),
  async (req, res) => {
    // start high-resolution timer
    const startTime = process.hrtime();

    // unique timestamp for this job
    const timestamp = Date.now();
    const uploadDir = path.join(__dirname, '..', 'uploads', String(timestamp));
    const outputDir = path.join(__dirname, '..', 'output');

    try {
      // ensure directories exist
      await fs.ensureDir(uploadDir);
      await fs.ensureDir(outputDir);

      // move uploaded files into the timestamped folder
      const moveFiles = async (files) => {
        for (const file of files) {
          const dest = path.join(uploadDir, file.originalname);
          await fs.move(file.path, dest, { overwrite: true });
        }
      };
      if (req.files?.css) await moveFiles(req.files.css);
      if (req.files?.js) await moveFiles(req.files.js);

      // process CSS and JS in parallel
      const [cssResults, jsResults] = await Promise.all([
        req.files?.css ? minifyCSS(uploadDir) : Promise.resolve([]),
        req.files?.js ? obfuscateJS(uploadDir) : Promise.resolve([])
      ]);

      // sanitize user-provided filename
      const userFilename = (req.body.name || 'encrypted-files')
        .trim()
        .replace(/[^a-z0-9-_]/gi, '_');
      const archiveName = `${timestamp}.zip`;
      const archivePath = path.join(outputDir, archiveName);

      // create ZIP with default (fast) compression
      const output = fs.createWriteStream(archivePath);
      const archive = archiver('zip', {
        zlib: { level: zlib.constants.Z_DEFAULT_COMPRESSION }
      });
      archive.pipe(output);

      // append each in-memory result buffer
      cssResults.forEach(f => archive.append(f.contents, { name: f.name }));
      jsResults.forEach(f => archive.append(f.contents, { name: f.name }));

      // finalize archive
      archive.finalize();

      output.on('close', () => {
        // calculate elapsed time in seconds with 2 decimal places
        const [secs, nanos] = process.hrtime(startTime);
        const elapsedSec = (secs + nanos / 1e9).toFixed(2);

        console.log(`🚀 Encryption finished in ${elapsedSec} s`);

        // respond with download link and elapsed time in seconds
        res.json({
          downloadLink: `/download/${archiveName}?name=${userFilename}.zip`,
          elapsedSec: Number(elapsedSec)
        });
      });

      archive.on('error', err => {
        console.error('Archive error:', err);
        res.status(500).json({ error: 'Failed to create ZIP archive' });
      });
    } catch (err) {
      console.error('Encryption error:', err);
      res.status(500).json({ error: 'Encryption failed' });
    }
  }
);

router.get('/download/:filename', (req, res) => {
  const filePath = path.join(__dirname, '..', 'output', req.params.filename);
  const displayName = req.query.name || req.params.filename;

  if (fs.existsSync(filePath)) {
    res.download(filePath, displayName, err => {
      if (err) console.error('Download error:', err);
    });
  } else {
    res.status(404).send('File not found');
  }
});

module.exports = router;
