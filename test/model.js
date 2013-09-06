module('Model');
test('new Model',function(){
	var m=new sgfmmvc.Model;
	ok(m,'创建一个Model对象');
});
test('extend',function(){
	var a=sgfmmvc.Model.extend({m1:function(){
		return 1;
	}});
	var a1=new a;
	equal(1,a1.m1(),'继承方法');
});
test('init attr',function(){
	var m=new sgfmmvc.Model({defaults:{name:123}});
	equal(123,m.get('name'),'设置属性');
});
test('set attr',1,function(){
	var m=new sgfmmvc.Model({defaults:{name:123}});
	m.change=function(name,o,n){
		ok(true,name+' changed from '+o+' to '+n);
	};
	m.set('name',123);
	m.set('name',456);
});
