var gulp = require('gulp');
var webserver = require('gulp-webserver');

gulp.task('default', function() {
    gulp.src('src').pipe(webserver( {
        livereload: true,
        fallback: 'src\index.html',
        open: true
    }));
});