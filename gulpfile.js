var gulp = require('gulp');  
var sass = require('gulp-sass');
var clean = require('gulp-clean');
var concat = require('gulp-concat');
var connect = require('gulp-connect');
var livereload = require('gulp-livereload');

gulp.task('webserver', function() {
  connect.server({
      livereload: true,
      root: 'bin'
  });
});

gulp.task('assets', function() {
    return gulp.src('src/assets/**/*.png').pipe(gulp.dest('bin'));
});

gulp.task('scripts', function() {
  return gulp.src(['src/js/player.js', 'src/js/game.js', 'src/js/main.js'])
    .pipe(concat('game.js'))
    .pipe(gulp.dest('bin/'));
});

gulp.task('styles', function () {
  return gulp.src('./src/scss/*.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(gulp.dest('bin'));
});

gulp.task('html', function() {
    return gulp.src('src/index.html').pipe(gulp.dest('bin'));
})

gulp.task('clean', function() {
    return gulp.src('bin', {read: false}).pipe(clean());
});

gulp.task('build', ['assets', 'html', 'scripts', 'styles']);

gulp.task('watch', ['build'], function() {
  gulp.watch('./src/**/*.*', ['build']);
  gulp.watch('./bin/**/*.*').on('change', function(file) {
	gulp.src(file.path).pipe(connect.reload());
  });
});

gulp.task('default', ['webserver', 'build', 'watch']);