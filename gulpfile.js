var gulp = require('gulp');  
var sass = require('gulp-sass');
var clean = require('gulp-clean');
var merge = require('gulp-merge-json');
var concat = require('gulp-concat');
var concatS = require('gulp-concat-sourcemap');
var connect = require('gulp-connect');
var livereload = require('gulp-livereload');

gulp.task('webserver', function() {
  connect.server({
      livereload: true,
      root: 'bin'
  });
});

gulp.task('favicon', function() {
    return gulp.src('src/assets/favicon.ico').pipe(gulp.dest('bin'));
});

gulp.task('assets-art', function() {
    return gulp.src('src/assets/**/*.png').pipe(gulp.dest('bin'));
});

gulp.task('assets-maps', function() {
    return gulp.src('src/assets/maps/*.json').pipe(gulp.dest('bin/maps'));
});

gulp.task('assets-items', function() {
    return gulp.src('src/assets/items/*.json').pipe(merge({ startObj: { type: "items" }, concatArrays: true, fileName: "items.json" })).pipe(gulp.dest('bin/'));
});

gulp.task('scripts', function() {
  return gulp.src(['src/js/utils.js', 'src/js/stats.js', 'src/js/map.js', 'src/js/item.js', 'src/js/player.js', 'src/js/game.js', 'src/js/main.js'])
    .pipe(concatS('game.js'))
    .pipe(gulp.dest('bin/'));
});

gulp.task('styles', function () {
  return gulp.src('./src/scss/*.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(gulp.dest('bin'));
});

gulp.task('html', function() {
    return gulp.src('src/*.html').pipe(gulp.dest('bin'));
})

gulp.task('clean', function() {
    return gulp.src('bin', {read: false}).pipe(clean());
});

gulp.task('build', ['favicon', 'assets-art', 'assets-maps', 'assets-items', 'html', 'scripts', 'styles']);

gulp.task('watch', ['build'], function() {
  gulp.watch('./src/**/*.*', ['build']);
  gulp.watch('./bin/**/*.*').on('change', function(file) {
	gulp.src(file.path).pipe(connect.reload());
  });
});

gulp.task('default', ['webserver', 'build', 'watch']);