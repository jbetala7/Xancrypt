const fs       = require('fs-extra');
const path     = require('path');
const archiver = require('archiver');
const zlib     = require('zlib');

async function compressFiles(files, outputPath) {
  // Ensure output directory exists
  await fs.ensureDir(path.dirname(outputPath));

  return new Promise((resolve, reject) => {
    const output  = fs.createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: zlib.constants.Z_DEFAULT_COMPRESSION }
    });

    archive.pipe(output);

    for (const file of files) {
      archive.append(file.contents, { name: file.name });
    }

    archive.finalize();

    output.on('close', () => resolve(outputPath));
    archive.on('error', err => reject(err));
  });
}

module.exports = compressFiles;
