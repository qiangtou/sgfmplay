module('Models');
test('new Models',2,function(){
	new sgfmmvc.Models;
	ok(1,'创建Models');
	var m= sgfmmvc.Model;
	var ms=new sgfmmvc.Models({model:m});
	ok(ms,'创建Models2');
});
test('create',4,function(){
	var ms=new sgfmmvc.Models({model:sgfmmvc.Model});
	equal(0,ms.size(),'Models 大小为0');
	
	var m1=ms.create({foo:123});
	equal(1,ms.size(),'Models 大小为1');
	equal(123,m1.get('foo'),'Models创建Model');

	var m2=ms.create();
	equal(2,ms.size(),'Models 大小为2');
});
test('toArr',2,function(){
	var ms=new sgfmmvc.Models({model:sgfmmvc.Model});
	ms.create();
	var arr=ms.toArr();
	equal(1,arr.length,'Models 大小为1');
	equal(sgfmmvc.Model,arr[0].constructor,'构造函数相同');
});
test('listenTo destroy',function(){
	var ms=new sgfmmvc.Models({model:sgfmmvc.Model});
	var m=ms.create();
	m.destroy();
	equal(0,ms.size(),'Models 大小为0');
});
test('listenTo',4,function(){
	var ms=new sgfmmvc.Models({model:sgfmmvc.Model});
	var m=ms.create();
	ms.listenTo(m,'set',function(){
		ok('ok','listenTo set');
	});
	ms.listenTo(m,'set',function(){
		ok('ok','listenTo set2');
	});
	m.set('name','123');
	m.set('name','456');
});
test('listenTo change:attr',5,function(){
	var ms=new sgfmmvc.Models({model:sgfmmvc.Model});
	var m=ms.create();
	m.set('name','hehe');
	var a=0;
	m.change=function(){
		ok('ok','change');
	}
	ms.listenTo(m,'change:name',function(name,o,n){
		equal(o,'hehe','旧值hehe');
		equal(n,123,'新值123');
		a++;
	});
	ms.listenTo(m,'change:name',function(){
		a++;
	});
	m.set('name','123');
	m.set('age','456');
	equal(a,2,'多个监听');
});
test('监听很多个change',5,function(){
	var ms=new sgfmmvc.Models({model:sgfmmvc.Model});
	var m=ms.create();
	m.change=function(){ ok('ok','origin change'); }
	ms.listenTo(m,'change:name',function(){
		ok('ok','change name');
	});
	ms.listenTo(m,'change',function(){
		ok('ok','change1');
	});
	ms.listenTo(m,'change',function(){
		ok('ok','change2');
	});
	ms.listenTo(m,'change',function(){
		ok('ok','change3');
	});
	m.set('name','hehe');
	
});
