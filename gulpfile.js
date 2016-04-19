var gulp        = require('gulp');
var browserSync = require('browser-sync').create()

gulp.task('js-watch', browserSync.reload);

gulp.task('default', function() {
    browserSync.init({
        proxy: "localhost:8004"
    });

	gulp.watch('js/*.js', ['js-watch']);
});
