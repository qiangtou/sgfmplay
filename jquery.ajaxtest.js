/**@fileoverview jquery的ajax模拟,无须服务器支持,方便本地调试
*通过$.setReturnData设置{网址:响应}的响应数据,
*支持success和complete回调
*@example $.setReturnData({"http://google.com":{'code':0},"http://baidu.com":{'code':0}});
*/
/**命名空间为jquery，所有静态方法都附加在$上
*@namespace $
*/
/**
*响应数据设置函数
*@param {Object} settings {网址1:返回的响应数据1,网址2:返回的响应数据2,....}
*@param {Object|String|function} settings.url1 返回响应1,支持动态取值
*@param {Object|String|function} settings.url2 返回响应2,支持动态取值
*@example $.setReturnData({"http://google.com":{'code':0},"http://baidu.com":function(){return 1});
*/
$.setReturnData=function(settings){
	$.testData=$.testData||{};
	$.extend($.testData,settings);
}
/**模拟ajax函数,保持原来的jquery.ajax使用方法不变
*@param {Object} settings 和jquery的一致
*@return {Object} jqXHR 一个空对象
*/
$.ajax = function (settings) {
	$.testData=$.testData||{};
	var jqXHR = {},
	opt = {
		'url' : settings.url,
		'success' : settings.success || $.noop,
		'complete' : settings.complete || $.noop
	},
	returndata = $.testData[opt.url] || '';
	if (typeof returndata == 'function') {
		returndata = returndata();
	};
	setTimeout(function () {
		console.log('url:',opt.url,+new Date);
		opt.success.call(this, returndata,"success",jqXHR);
		opt.complete.call(this, jqXHR,"complete");
	}, 50);
	return jqXHR;
};

$.post=function(url,data,success){
	if(typeof data=="function"){
		success=data;
	};
	return $.ajax({
		url:url,
		'success':success
	});
};
