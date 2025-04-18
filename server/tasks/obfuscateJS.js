const gulp = require('gulp');
const obfuscator = require('gulp-javascript-obfuscator');
const rename = require('gulp-rename');

function obfuscateJS(input, output) {
  return new Promise((resolve, reject) => {
    gulp.src(`${input}/*.js`)
      .pipe(obfuscator({
        compact: true,
        identifierNamesGenerator: 'hexadecimal',
        rotateStringArray: true,
        stringArray: true,
        stringArrayThreshold: 0.75,
        selfDefending: false,
        controlFlowFlattening: false,
        deadCodeInjection: false
      }))
      .pipe(rename({ suffix: '.obf' }))
      .pipe(gulp.dest(output))
      .on('end', resolve)
      .on('error', reject);
  });
}

module.exports = obfuscateJS;
