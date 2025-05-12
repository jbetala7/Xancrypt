const CleanCSS = require('clean-css');
const fs = require('fs').promises;
const path = require('path');

module.exports = async function minifyCSS(inputDir) {
  const cleaner = new CleanCSS();
  const files = await fs.readdir(inputDir);
  const cssFiles = files.filter(f => path.extname(f).toLowerCase() === '.css');

  return Promise.all(cssFiles.map(async file => {
    const filePath = path.join(inputDir, file);
    const src = await fs.readFile(filePath, 'utf8');
    const out = cleaner.minify(src).styles;

    return {
      name: file.replace(/\.css$/i, '.css'),
      contents: Buffer.from(out, 'utf8')
    };
  }));
};
