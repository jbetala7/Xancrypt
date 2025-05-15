// server/routes/encrypt.js
const express     = require('express');
const multer      = require('multer');
const fs          = require('fs-extra');
const path        = require('path');
const archiver    = require('archiver');
const zlib        = require('zlib');
const optionalAuthenticate = require('../middleware/optionalAuthenticate');
const identifyDevice       = require('../middleware/identifyDevice');
const DeviceUsage          = require('../models/DeviceUsage');
const minifyCSS            = require('../tasks/minifyCSS');
const obfuscateJS          = require('../tasks/obfuscateJS');
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
const WINDOW_MS = 7 * 60 * 60 * 1000; // 7h
const MAX_FILES = 5;

function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.ip
  );
}

router.post(
  '/',
  optionalAuthenticate,
  identifyDevice,
  upload.fields([{ name: 'css' }, { name: 'js' }]),
  async (req, res) => {
    // count files in this request
    const numCss = (req.files.css || []).length;
    const numJs  = (req.files.js  || []).length;
    const thisBatch = numCss + numJs;

    // update Prometheus
    lastConversionTimestamp.set(Date.now() / 1000);
    lastConversionCssCount.set(numCss);
    lastConversionJsCount.set(numJs);
    setTimeout(() => {
      lastConversionCssCount.set(0);
      lastConversionJsCount.set(0);
    }, WINDOW_MS/1000 + 1);

    const timerEnd = encryptionDuration.startTimer();
    const startHR  = process.hrtime();

    const ip       = getClientIp(req);
    const deviceId = req.deviceId;
    const userId   = req.user?._id || null;

    // look up or create usage doc
    const cutoff = Date.now() - WINDOW_MS;
    let usage = await DeviceUsage.findOne(
      userId
        ? { userId }
        : { $or: [{ deviceId }, { ip }] }
    );
    if (!usage) {
      usage = new DeviceUsage({ userId, deviceId, ip, records: [] });
    }

    // drop old records
    usage.records = usage.records.filter(r => r.time.getTime() > cutoff);
    const used = usage.records.reduce((sum, r) => sum + r.files, 0);

    if (used + thisBatch > MAX_FILES) {
      const earliest = Math.min(...usage.records.map(r => r.time.getTime()));
      const nextAllowed = new Date(earliest + WINDOW_MS);
      return res.status(429).json({ error: 'limit_exceeded', nextAllowed });
    }

    // now do the actual file handling
    const timestamp = Date.now();
    const uploadDir = path.join(__dirname, '..', 'uploads', String(timestamp));
    const outputDir = path.join(__dirname, '..', 'output');
    await fs.ensureDir(uploadDir);
    await fs.ensureDir(outputDir);

    const moveFiles = async files => {
      for (const f of files) {
        await fs.move(f.path, path.join(uploadDir, f.originalname), { overwrite: true });
      }
    };

    try {
      if (req.files.css) await moveFiles(req.files.css);
      if (req.files.js)  await moveFiles(req.files.js);

      const [cssRes, jsRes] = await Promise.all([
        numCss ?     minifyCSS(uploadDir)   : Promise.resolve([]),
        numJs  ?     obfuscateJS(uploadDir) : Promise.resolve([])
      ]);

      const archiveName = `${timestamp}.zip`;
      const archivePath = path.join(outputDir, archiveName);
      const outStream   = fs.createWriteStream(archivePath);
      const archive     = archiver('zip', { zlib: { level: zlib.constants.Z_DEFAULT_COMPRESSION } });

      archive.pipe(outStream);
      cssRes.forEach(f => archive.append(f.contents, { name: f.name }));
      jsRes .forEach(f => archive.append(f.contents, { name: f.name }));
      await archive.finalize();

      outStream.on('close', async () => {
        // record this batch
        usage.userId   = userId;
        usage.deviceId = deviceId;
        usage.ip       = ip;
        usage.records.push({ time: new Date(), files: thisBatch });
        await usage.save();

        // finish metrics
        timerEnd();
        const [s, n] = process.hrtime(startHR);
        const elapsedSec = +(s + n/1e9).toFixed(2);
        lastConversionDuration.set(elapsedSec);
        setTimeout(() => lastConversionDuration.set(0), WINDOW_MS/1000 + 1);

        res.json({ downloadLink: `/api/encrypt/download/${archiveName}`, elapsedSec });
      });

      archive.on('error', err => {
        encryptionErrors.inc();
        console.error(err);
        res.status(500).json({ error: 'Failed to archive' });
      });
    } catch (err) {
      encryptionErrors.inc();
      console.error(err);
      res.status(500).json({ error: 'Encryption failed' });
    }
  }
);

// download endpoint unchanged...
router.get('/download/:filename', (req, res) => {
  const p = path.join(__dirname, '..', 'output', req.params.filename);
  if (!fs.existsSync(p)) return res.status(404).send('Not found');
  res.download(p);
});

// remaining endpoint for dashboard
router.get('/remaining', identifyDevice, async (req, res) => {
  const ip       = getClientIp(req);
  const deviceId = req.deviceId;
  const userId   = req.user?._id || null;
  const cutoff   = Date.now() - WINDOW_MS;

  const usage = await DeviceUsage.findOne(
    userId
      ? { userId }
      : { $or: [{ deviceId }, { ip }] }
  );
  if (!usage) {
    return res.json({ remaining: MAX_FILES, nextReset: null });
  }

  usage.records = usage.records.filter(r => r.time.getTime() > cutoff);
  const used = usage.records.reduce((sum, r) => sum + r.files, 0);
  const nextReset = usage.records.length
    ? new Date(Math.min(...usage.records.map(r=>r.time.getTime())) + WINDOW_MS)
    : null;

  res.json({ remaining: Math.max(0, MAX_FILES - used), nextReset });
});

module.exports = router;
