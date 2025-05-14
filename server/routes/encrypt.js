// File: routes/encrypt.js
const express         = require('express');
const multer          = require('multer');
const fs              = require('fs-extra');
const path            = require('path');
const archiver        = require('archiver');
const zlib            = require('zlib');

const identifyDevice  = require('../middleware/identifyDevice');
const DeviceUsage     = require('../models/DeviceUsage');
const minifyCSS       = require('../tasks/minifyCSS');
const obfuscateJS     = require('../tasks/obfuscateJS');

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
const SCRAPE_INTERVAL = 15;

router.post(
  '/',
  identifyDevice,                              // assign/track deviceId
  upload.fields([ { name: 'css' }, { name: 'js' } ]),
  async (req, res) => {
    // record timing & counts
    lastConversionTimestamp.set(Date.now() / 1000);
    lastConversionCssCount.set((req.files.css || []).length);
    lastConversionJsCount.set((req.files.js  || []).length);
    setTimeout(() => {
      lastConversionCssCount.set(0);
      lastConversionJsCount.set(0);
    }, (SCRAPE_INTERVAL + 1) * 1000);

    const endTimer  = encryptionDuration.startTimer();
    const startTime = process.hrtime();

    // device-limit: max 5 per 7 hours
    const deviceId = req.deviceId;
    let usage = await DeviceUsage.findOne({ deviceId }) || new DeviceUsage({ deviceId, encryptedAt: [] });
    const cutoff = Date.now() - 7*60*60*1000;
    usage.encryptedAt = usage.encryptedAt.filter(d => d.getTime() > cutoff);

    if (usage.encryptedAt.length >= 5) {
      const nextAllowed = new Date(Math.min(...usage.encryptedAt.map(d => d.getTime())) + 7*60*60*1000);
      return res.status(429).json({ error: 'limit_exceeded', nextAllowed });
    }

    // prepare directories
    const timestamp = Date.now();
    const uploadDir = path.join(__dirname, '..', 'uploads', String(timestamp));
    const outputDir = path.join(__dirname, '..', 'output');
    await fs.ensureDir(uploadDir);
    await fs.ensureDir(outputDir);

    const moveFiles = async files => {
      for (const file of files) {
        await fs.move(file.path, path.join(uploadDir, file.originalname), { overwrite: true });
      }
    };

    try {
      if (req.files.css) await moveFiles(req.files.css);
      if (req.files.js)  await moveFiles(req.files.js);

      const [cssResults, jsResults] = await Promise.all([
        req.files.css ? minifyCSS(uploadDir) : Promise.resolve([]),
        req.files.js  ? obfuscateJS(uploadDir)  : Promise.resolve([])
      ]);

      const archiveName = `${timestamp}.zip`;
      const archivePath = path.join(outputDir, archiveName);
      const output      = fs.createWriteStream(archivePath);
      const archive     = archiver('zip', { zlib: { level: zlib.constants.Z_DEFAULT_COMPRESSION } });

      archive.pipe(output);
      cssResults.forEach(f => archive.append(f.contents, { name: f.name }));
      jsResults.forEach(f  => archive.append(f.contents, { name: f.name }));
      await archive.finalize();

      output.on('close', async () => {
        // record usage
        usage.encryptedAt.push(new Date());
        await usage.save();

        endTimer();
        const [secs, nanos] = process.hrtime(startTime);
        const elapsedSec = Number((secs + nanos/1e9).toFixed(2));
        lastConversionDuration.set(elapsedSec);
        setTimeout(() => lastConversionDuration.set(0), (SCRAPE_INTERVAL + 1) * 1000);

        res.json({ downloadLink: `/api/encrypt/download/${archiveName}`, elapsedSec });
      });

      archive.on('error', err => {
        encryptionErrors.inc();
        console.error('Archive error:', err);
        res.status(500).json({ error: 'Failed to create ZIP archive' });
      });
    } catch (err) {
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
  res.download(filePath);
});

module.exports = router;