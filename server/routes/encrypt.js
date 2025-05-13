// routes/encrypt.js

const express     = require('express');
const multer      = require('multer');
const fs          = require('fs-extra');
const path        = require('path');
const archiver    = require('archiver');
const zlib        = require('zlib');
const minifyCSS   = require('../tasks/minifyCSS');
const obfuscateJS = require('../tasks/obfuscateJS');

// Prometheus metrics
const {
  encryptionDuration,
  encryptionErrors,
  lastConversionTimestamp,
  lastConversionCssCount,
  lastConversionJsCount,
  lastConversionDuration
} = require('../metrics');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// How often Prometheus scrapes your /metrics (in seconds)
const SCRAPE_INTERVAL = 15;

router.post(
  '/',
  upload.fields([
    { name: 'css' },
    { name: 'js' }
  ]),
  async (req, res) => {
    // ─── SIMULATE ERROR FOR TESTING ─────────────────────────────
    // Hit this endpoint with ?simulateError=1 to force an error
    if (req.query.simulateError === '1') {
      encryptionErrors.inc();
      return res.status(500).send('💥 simulated error');
    }
    // ────────────────────────────────────────────────────────────

    // 1) Stamp start time and file counts
    const nowSec = Date.now() / 1000;
    lastConversionTimestamp.set(nowSec);

    const cssCount = (req.files.css || []).length;
    const jsCount  = (req.files.js  || []).length;

    lastConversionCssCount.set(cssCount);
    lastConversionJsCount.set(jsCount);

    // Schedule a reset of those two gauges after one scrape interval
    setTimeout(() => {
      lastConversionCssCount.set(0);
      lastConversionJsCount.set(0);
    }, (SCRAPE_INTERVAL + 1) * 1000);

    // 2) Begin histogram timer
    const endTimer  = encryptionDuration.startTimer();
    // 3) High-res timer for frontend elapsedSec
    const startTime = process.hrtime();

    // 4) Prepare directories
    const timestamp = Date.now();
    const uploadDir = path.join(__dirname, '..', 'uploads', String(timestamp));
    const outputDir = path.join(__dirname, '..', 'output');
    await fs.ensureDir(uploadDir);
    await fs.ensureDir(outputDir);

    // Helper to move uploaded files
    const moveFiles = async files => {
      for (const file of files) {
        const dest = path.join(uploadDir, file.originalname);
        await fs.move(file.path, dest, { overwrite: true });
      }
    };

    try {
      // 5) Move files
      if (req.files.css) await moveFiles(req.files.css);
      if (req.files.js)  await moveFiles(req.files.js);

      // 6) Minify/obfuscate in parallel
      const [cssResults, jsResults] = await Promise.all([
        req.files.css ? minifyCSS(uploadDir) : Promise.resolve([]),
        req.files.js  ? obfuscateJS(uploadDir) : Promise.resolve([])
      ]);

      // 7) Build ZIP
      const archiveName = `${timestamp}.zip`;
      const archivePath = path.join(outputDir, archiveName);
      const output      = fs.createWriteStream(archivePath);
      const archive     = archiver('zip', {
        zlib: { level: zlib.constants.Z_DEFAULT_COMPRESSION }
      });
      archive.pipe(output);
      cssResults.forEach(f => archive.append(f.contents, { name: f.name }));
      jsResults.forEach(f  => archive.append(f.contents, { name: f.name }));
      await archive.finalize();

      // 8) When ZIP is done
      output.on('close', () => {
        // a) record histogram
        endTimer();

        // b) compute elapsed seconds
        const [secs, nanos] = process.hrtime(startTime);
        const elapsedSec    = Number((secs + nanos/1e9).toFixed(2));

        // c) spike the duration gauge
        lastConversionDuration.set(elapsedSec);

        // d) reset duration gauge after one scrape
        setTimeout(() => {
          lastConversionDuration.set(0);
        }, (SCRAPE_INTERVAL + 1) * 1000);

        console.log(`🚀 Encryption finished in ${elapsedSec} s`);

        // e) respond
        res.json({
          downloadLink: `/api/encrypt/download/${archiveName}`,
          elapsedSec
        });
      });

      // 9) Archive errors
      archive.on('error', err => {
        encryptionErrors.inc();
        console.error('Archive error:', err);
        res.status(500).json({ error: 'Failed to create ZIP archive' });
      });
    } catch (err) {
      // 10) Catch-all errors
      encryptionErrors.inc();
      console.error('Encryption error:', err);
      res.status(500).json({ error: 'Encryption failed' });
    }
  }
);

// Download route
router.get('/download/:filename', (req, res) => {
  const filePath = path.join(__dirname, '..', 'output', req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }
  res.download(filePath, err => {
    if (err) console.error('Download error:', err);
  });
});

module.exports = router;
