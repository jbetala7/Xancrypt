// server/routes/encrypt.js
const express               = require('express');
const multer                = require('multer');
const fs                    = require('fs-extra');
const path                  = require('path');
const archiver              = require('archiver');
const zlib                  = require('zlib');
const optionalAuthenticate  = require('../middleware/optionalAuthenticate');
const identifyDevice        = require('../middleware/identifyDevice');
const DeviceUsage           = require('../models/DeviceUsage');
const History               = require('../models/History');
const minifyCSS             = require('../tasks/minifyCSS');
const obfuscateJS           = require('../tasks/obfuscateJS');
const {
  encryptionDuration,
  encryptionErrors,
  lastConversionTimestamp,
  lastConversionCssCount,
  lastConversionJsCount,
  lastConversionDuration
} = require('../metrics');

const router  = express.Router();
const upload  = multer({ dest: 'uploads/' });
const WINDOW_MS = 7 * 60 * 60 * 1000; // 7h
const MAX_FILES = 5;

// extract client IP (trusting proxy header if set)
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
    const numCss    = (req.files.css || []).length;
    const numJs     = (req.files.js  || []).length;
    const thisBatch = numCss + numJs;

    // Prometheus metrics
    lastConversionTimestamp.set(Date.now() / 1000);
    lastConversionCssCount.set(numCss);
    lastConversionJsCount.set(numJs);
    setTimeout(() => {
      lastConversionCssCount.set(0);
      lastConversionJsCount.set(0);
    }, WINDOW_MS / 1000 + 1);

    const timerEnd = encryptionDuration.startTimer();
    const startHR  = process.hrtime();

    const ip       = getClientIp(req);
    const deviceId = req.deviceId;
    const userId   = req.user?._id || null;
    const cutoff   = Date.now() - WINDOW_MS;

    // ——— 1) Enforce global IP/device limit ———
    // find _all_ usage docs under this IP or device
    const sharedDocs = await DeviceUsage.find({
      $or: [{ ip }, { deviceId }]
    });

    // collect and prune their records
    const sharedEvents = sharedDocs
      .flatMap(doc => doc.records)
      .filter(r => r.time.getTime() > cutoff);

    const usedShared = sharedEvents.reduce((sum, r) => sum + r.files, 0);
    if (usedShared + thisBatch > MAX_FILES) {
      const earliest = Math.min(...sharedEvents.map(r => r.time.getTime()));
      const nextAllowed = new Date(earliest + WINDOW_MS);
      return res
        .status(429)
        .json({ error: 'limit_exceeded', nextAllowed });
    }

    // ——— 2) Load or create the per-user (or per-anon) usage doc ———
    let usage;
    if (userId) {
      usage = await DeviceUsage.findOne({ userId });
      if (!usage) usage = new DeviceUsage({ userId, deviceId: null, ip: null, records: [] });
    } else {
      usage = await DeviceUsage.findOne({ $or: [{ deviceId }, { ip }] });
      if (!usage) usage = new DeviceUsage({ userId: null, deviceId, ip, records: [] });
    }

    // prune old records here too (keeps per-user doc tidy)
    usage.records = usage.records.filter(r => r.time.getTime() > cutoff);

    // ——— 3) Perform the encryption and archiving ———
    const timestamp = Date.now();
    const uploadDir = path.join(__dirname, '..', 'uploads', `${timestamp}`);
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

      // use client‐supplied name & format
      const format   = req.body.format || 'zip';
      const rawName  = (req.body.name || 'encrypted-files').trim();
      const baseName = rawName.replace(/[^\w\-]/g, '-');
      const archiveName = `${baseName}.${format}`;
      const archivePath = path.join(outputDir, archiveName);

      const outputStream = fs.createWriteStream(archivePath);
      const archive      = archiver('zip', { zlib: { level: zlib.constants.Z_DEFAULT_COMPRESSION } });

      archive.pipe(outputStream);
      cssRes.forEach(f => archive.append(f.contents, { name: f.name }));
      jsRes .forEach(f => archive.append(f.contents, { name: f.name }));
      await archive.finalize();

      outputStream.on('close', async () => {
        // record per-user (or per-anon) usage
        usage.userId   = usage.userId || userId;
        usage.deviceId = deviceId;
        usage.ip       = ip;
        usage.records.push({ time: new Date(), files: thisBatch });
        await usage.save();

        // record history for logged-in user
        if (userId) {
          const [s, n]     = process.hrtime(startHR);
          const elapsedSec = +(s + n / 1e9).toFixed(2);

          const event = {
            time:        new Date(),
            cssCount:    numCss,
            jsCount:     numJs,
            elapsedSec,
            filename:    archiveName,
            link:        `/api/encrypt/download/${archiveName}`
          };

          await History.updateOne(
            { userId },
            {
              $setOnInsert: { userId },
              $push:        { events: event }
            },
            { upsert: true }
          );
        }

        // finish metrics
        timerEnd();
        const [s2, n2] = process.hrtime(startHR);
        const totSec   = +(s2 + n2 / 1e9).toFixed(2);
        lastConversionDuration.set(totSec);
        setTimeout(() => lastConversionDuration.set(0), WINDOW_MS / 1000 + 1);

        return res.json({
          downloadLink: `/api/encrypt/download/${archiveName}`,
          elapsedSec:   totSec,
          archiveName
        });
      });

      archive.on('error', err => {
        encryptionErrors.inc();
        console.error('Archive error:', err);
        return res.status(500).json({ error: 'Failed to archive' });
      });
    } catch (err) {
      encryptionErrors.inc();
      console.error('Encryption error:', err);
      return res.status(500).json({ error: 'Encryption failed' });
    }
  }
);

router.get('/download/:filename', (req, res) => {
  const p = path.join(__dirname, '..', 'output', req.params.filename)
  if (!fs.existsSync(p)) return res.status(404).send('Not found')
  res.download(p)
})

router.get('/remaining', optionalAuthenticate, identifyDevice, async (req, res) => {
  const ip       = getClientIp(req)
  const deviceId = req.deviceId
  const userId   = req.user?._id || null
  const cutoff   = Date.now() - WINDOW_MS

  const usage = await DeviceUsage.findOne(
    userId
      ? { userId }
      : { $or: [{ deviceId }, { ip }] }
  )
  if (!usage) {
    return res.json({ remaining: MAX_FILES, nextReset: null })
  }

  usage.records = usage.records.filter(r => r.time.getTime() > cutoff)
  const used = usage.records.reduce((sum, r) => sum + r.files, 0)
  const nextReset = usage.records.length
    ? new Date(Math.min(...usage.records.map(r => r.time.getTime())) + WINDOW_MS)
    : null

  res.json({ remaining: Math.max(0, MAX_FILES - used), nextReset })
})

module.exports = router
