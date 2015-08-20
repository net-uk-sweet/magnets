module.exports = function(grunt) {

	// Configuration object setup here
	grunt.initConfig({

		copy: {
			main: {
				files: [{
					expand: true,
					src: [
						'index.htm', 
						'package.json', 
						'server.js',  
						'items.json', 
						'package.json',
						'css/**',
						'font/**',
						'js/**'
					],
					dest: 'dist'
				}]
			}
		},
		clean: ['dist/**'],
		buildcontrol: {
			options: {
				dir: 'dist',
				commit: true,
				push: true,
				connectCommits: false,
				message: 'Built %sourceName% from commit %sourceCommit% on branch %sourceBranch%'
			},
			openshift: {
				options: {
					remote: 'ssh://55d63d2d7628e1a2bf000110@magnets-sweetweb.rhcloud.com/~/git/magnets.git/',
					branch: 'master'
				}
			}
		}
	});

	// Import plugins
	grunt.loadNpmTasks('grunt-build-control');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-copy');

	// Define tasks
	grunt.registerTask('build', ['clean', 'copy']);
	grunt.registerTask('deploy', ['buildcontrol:openshift']);
};