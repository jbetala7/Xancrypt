// server/routes/encrypt.js

const express         = require('express');
const multer          = require('multer');
const fs              = require('fs-extra');
const path            = require('path');
const archiver        = require('archiver');
const zlib            = require('zlib');

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
const SCRAPE_INTERVAL = 15;

function getClientIp(req) {
  return (
    req.headers['x-test-ip'] ||
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.connection.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip
  );
}

router.post(
  '/',
  optionalAuthenticate,
  upload.fields([{ name: 'css' }, { name: 'js' }]),
  identifyDevice,
  async (req, res) => {
    const numCss = (req.files.css || []).length;
    const numJs  = (req.files.js || []).length;
    const filesThisRequest = numCss + numJs;

    const now = Date.now();
    lastConversionTimestamp.set(now / 1000);
    lastConversionCssCount.set(numCss);
    lastConversionJsCount.set(numJs);

    setTimeout(() => {
      lastConversionCssCount.set(0);
      lastConversionJsCount.set(0);
    }, (SCRAPE_INTERVAL + 1) * 1000);

    const endTimer  = encryptionDuration.startTimer();
    const startTime = process.hrtime();

    const ip       = getClientIp(req);
    const deviceId = req.deviceId;
    const userId   = req.user?._id || null;

    console.log('🔍 Tracking userId:', userId);
    console.log('🔍 Tracking deviceId:', deviceId);
    console.log('🔍 Tracking IP:', ip);

    const cutoff = now - 7 * 60 * 60 * 1000;

    const query = userId ? { userId } : { $or: [{ deviceId }, { ip }] };
    let usage   = await DeviceUsage.findOne(query);

    if (!usage) {
      usage = new DeviceUsage({
        userId,
        deviceId,
        ip,
        records: []
      });
    }

    usage.records = usage.records.filter(r => r.time.getTime() > cutoff);
    const filesUsed = usage.records.reduce((sum, r) => sum + r.files, 0);

    if ((filesUsed + filesThisRequest) > 5) {
      const nextAllowed = new Date(Math.min(...usage.records.map(r => r.time.getTime())) + 7 * 60 * 60 * 1000);
      return res.status(429).json({ error: 'limit_exceeded', nextAllowed });
    }

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
        req.files.js  ? obfuscateJS(uploadDir) : Promise.resolve([])
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
        usage.userId   = userId;
        usage.deviceId = deviceId;
        usage.ip       = ip;
        usage.records.push({ time: new Date(), files: filesThisRequest });
        await usage.save();

        endTimer();
        const [secs, nanos] = process.hrtime(startTime);
        const elapsedSec = Number((secs + nanos / 1e9).toFixed(2));
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

router.get('/download/:filename', (req, res) => {
  const filePath = path.join(__dirname, '..', 'output', req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }
  res.download(filePath);
});

router.get('/remaining', identifyDevice, async (req, res) => {
  const ip = getClientIp(req);
  const deviceId = req.deviceId;

  const now = Date.now();
  const cutoff = now - 7 * 60 * 60 * 1000;

  const usage = await DeviceUsage.findOne({
    $or: [{ deviceId }, { ip }]
  });

  if (!usage) {
    return res.json({ remaining: 5, nextReset: null });
  }

  usage.records = usage.records.filter(r => r.time.getTime() > cutoff);
  const totalUsed = usage.records.reduce((sum, r) => sum + r.files, 0);

  const nextReset = usage.records.length
    ? new Date(Math.min(...usage.records.map(r => r.time.getTime())) + 7 * 60 * 60 * 1000)
    : null;

  res.json({
    remaining: Math.max(0, 5 - totalUsed),
    nextReset
  });
});

module.exports = router;
