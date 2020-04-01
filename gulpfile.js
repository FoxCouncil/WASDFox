const { series, parallel, src, dest, watch } = require('gulp');

const sass = require('gulp-sass');
const clean = require('gulp-clean');
const merge = require('gulp-merge-json');
const concat = require('gulp-concat');
const connect = require('gulp-connect');
const sourcemaps = require('gulp-sourcemaps');

function cleanBin() {
  return src('bin', {read: false, allowEmpty: true}).pipe(clean());
}

function copyFavicon() {
  return src('src/assets/favicon.ico').pipe(dest('bin'));
}

function assetsArt() {
  return src('src/assets/**/*.png').pipe(dest('bin'));
}

function assetsMaps() {
  return src('src/assets/maps/*.json').pipe(dest('bin/maps'));
}

function assetsItems() {
  return src('src/assets/items/*.json').pipe(merge({ startObj: { type: "items" }, concatArrays: true, fileName: "items.json" })).pipe(dest('bin/'));
}

function js() {
  return src([
    'src/js/utils.js', 
    'src/js/stats.js', 
    'src/js/map.js', 
    'src/js/item.js', 
    'src/js/player.js', 
    'src/js/agent.js', 
    'src/js/game.js', 
    'src/js/main.js'
  ], { base: 'src' })
  .pipe(sourcemaps.init())
  .pipe(concat('game.js'))
  .pipe(sourcemaps.write({includeContent: false, sourceRoot: '../src'}))
  .pipe(dest('bin/'));
}

function css() {
  return src('./src/scss/*.scss').pipe(sass().on('error', sass.logError)).pipe(dest('bin'));
}

function html(done) {
  return src('src/*.html').pipe(dest('bin'));
}

function server(done) {
  connect.server({
    livereload: true,
    root: 'bin'
  });
  done();
}

function watcher(done) {
  watch('./src/**/*.*', build);
  watch('./bin/**/*.*').on('change', function() { src('bin/').pipe(connect.reload()); });
  done();
}

const build = parallel(copyFavicon, assetsArt, assetsMaps, assetsItems, js, css, html);

exports.build = build;
exports.clean = cleanBin;
exports.default = series(cleanBin, build, server, watcher);