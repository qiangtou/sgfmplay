module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		qunit:{
			all:['test/test.html']
		},
		uglify: {
			//文件头部输出信息
			options: {
				banner: '/*! <%= grunt.template.today("yyyy-mm-dd") %> */\n',
				report:'min',
				beautify:{
					ascii_only:true
				}
			},
			//具体任务配置
			sgfmplay: {
				options: {
					banner: '/* jquery.sgfmplay.js <%= grunt.template.today("yyyy-mm-dd HH:MM:ss") %> */\n',
				},
				src: 'jquery.sgfmplay.js',
				dest: 'build/jquery.sgfmplay.js'
			},
			mvc: {
				options: {
					banner: '/*! sgfmmvc.js <%= grunt.template.today("yyyy-mm-dd HH:MM:ss") %> */\n',
				},
				src: 'sgfmmvc.js',
				dest: 'build/sgfmmvc.js'
			}
		}
	});
	 // 加载指定插件任务
    grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-qunit');
 
    // 默认执行的任务
    grunt.registerTask('default', ['uglify:sgfmplay','uglify:mvc','qunit:all']);
};

