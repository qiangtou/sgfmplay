module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		uglify: {
			//文件头部输出信息
			options: {
				banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n',
				beautify:{
					ascii_only:true
				}
			},
			//具体任务配置
			sgfmplay: {
				//源文件
				src: 'jquery.sgfmplay.js',
				//目标文件
				dest: 'build/jquery.sgfmplay.js'
			},
			mvc: {
				//源文件
				src: 'sgfmmvc.js',
				//目标文件
				dest: 'build/sgfmmvc.js'
			}
		}
	});
	 // 加载指定插件任务
    grunt.loadNpmTasks('grunt-contrib-uglify');
 
    // 默认执行的任务
    grunt.registerTask('default', ['uglify:sgfmplay','uglify:mvc']);
};

