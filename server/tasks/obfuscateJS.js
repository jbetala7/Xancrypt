const obfuscator = require('javascript-obfuscator');
const fs = require('fs').promises;
const path = require('path');

module.exports = async function obfuscateJS(inputDir) {
  const files = await fs.readdir(inputDir);
  const jsFiles = files.filter(f => path.extname(f).toLowerCase() === '.js');

  return Promise.all(jsFiles.map(async file => {
    const filePath = path.join(inputDir, file);
    const src = await fs.readFile(filePath, 'utf8');
    const obfCode = obfuscator.obfuscate(src, {
      // ── Other Transformations ──
      compact:                 true,
      simplify:                true,            // ✅ Simplify checked
    
      // ── Strings Transformations ──
      stringArray:             true,
      stringArrayThreshold:    0.75,
      stringArrayShuffle:      true,            // ✅ String Array Shuffle
      rotateStringArray:       true,
      stringArrayIndexShift:   true,            // ✅ String Array Index Shift
      stringArrayIndexesType:  ['hexadecimal-number'],   // ✅ Hexadecimal indexes
      stringArrayWrappersCount:        1,        // ✅ Wrappers count
      stringArrayWrappersType:  'variable',      // ✅ Wrappers type
      stringArrayWrappersChainedCalls: true,     // ✅ Chained calls
      stringArrayEncoding:     [],              // ✅ “None” encoding
    
      // ── Identifiers Transformations ──
      identifierNamesGenerator: 'hexadecimal',
      // renameGlobals: false,        // unchecked by default
      // renameProperties: false,     // unchecked by default
    
      // ── Other Transformations Continued ──
      controlFlowFlattening:   false,
      deadCodeInjection:       false,
    
      // ── Misc ──
      // seed:                    0               // match Seed = 0
    }).getObfuscatedCode();

    return {
      name: file.replace(/\.js$/i, '.js'),
      contents: Buffer.from(obfCode, 'utf8')
    };
  }));
};
