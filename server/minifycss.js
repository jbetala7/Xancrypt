const gulp = require('gulp');
const cleanCSS = require('gulp-clean-css');
const rename = require('gulp-rename');

function minifyCSS(input, output) {
  return new Promise((resolve, reject) => {
    gulp.src(`${input}/*.css`)
      .pipe(cleanCSS())
      .pipe(rename({ suffix: '.min' }))
      .pipe(gulp.dest(output))
      .on('end', resolve)
      .on('error', reject);
  });
}

module.exports = minifyCSS;
