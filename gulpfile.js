var gulp        = require('gulp');
var browserSync = require('browser-sync').create()

gulp.task('watch', function() {
    browserSync.reload();
});

gulp.task('default', function() {
    browserSync.init({
        proxy: "localhost:8004"
    });

	gulp.watch('js/index.js', ['watch']);
    gulp.watch('index.html', ['watch']);
    gulp.watch('css/style.css', ['watch']);
});
