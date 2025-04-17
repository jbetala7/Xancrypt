const gulp = require('gulp');
const obfuscator = require('gulp-javascript-obfuscator');
const rename = require('gulp-rename');

function obfuscateJS(input, output) {
  return new Promise((resolve, reject) => {
    gulp.src(`${input}/*.js`)
      .pipe(obfuscator({
        compact: true,
        controlFlowFlattening: true,
        deadCodeInjection: true,
        stringArray: true,
        selfDefending: true,
      }))
      .pipe(rename({ suffix: '.obf' }))
      .pipe(gulp.dest(output))
      .on('end', resolve)
      .on('error', reject);
  });
}

module.exports = obfuscateJS;
