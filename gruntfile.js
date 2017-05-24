// Test
module.exports = function(grunt) {
    grunt.initConfig({
        copy: {
            dist: {
                files: [
                    // includes files within path
                    {
                        // Copy the edge version (latest)
                        expand: true,
                        src: ['StickyHeader/**'],
                        dest: 'dist'
                    }
                ]
            }
        },
        shell: {
            buildDev: {
                // bundle packages dependencies still needs JSPM/system, build makes a self-executable with no JSPM dependencies
                command: 'jspm build --skip-rollup StickyHeader/main.js dist/sticky-header.js --global-name stickyheader --skip-source-maps',
                options: {
                    // execOptions: {
                    //   cwd: 'dist'
                    // }
                }
            }
        }
    });


    grunt.loadNpmTasks("grunt-contrib-copy");
    grunt.loadNpmTasks('grunt-shell');


    grunt.registerTask("default", ["copy:dist", "shell:buildDev"]);
};