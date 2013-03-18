/**
 *轻量级的mvc框架,backbone的简单实现
 *model与view的分离，html代码使用模板统一管理
 *@see http://backbonejs.org/
 */
(function ($, window) {
	var _ = window.sgfmmvc = window.sgfmmvc || {}
		,uniqueId=0;
	//Model类
	_.Model = function (settings) {
		settings = settings || {};
		var attrs = settings.defaults || {};
		// 指定Model的id属性
		this.idArr = "id";
		this.hasChange = $.noop;
		//通过属性名取得属性值
		this.get = function (key) {
			return attrs[key];
		};
		//取得属性集合对象
		this.getAttrs = function () {
			return attrs;
		};
		//重置Model的属性
		this.reset=function(json){
			attrs={};
			return this.set(json);
		};
		//属性变化时调用此方法
		this.change = function (key, oldV, newV) {
			//console && console.log && console.log(this.idArr+":" + this.get(this.idArr) + ',[' + key + '] changed from [' + oldV + '] to [' + newV + ']');
		};
		
		var _set = function (k, v) {
			if(!k)return;
			var objs,oldVal,newVal,changed = false;
			if (typeof k == "string") {
				(objs={})[k]=v;
			}else{
				objs=k;
			};
			for (var key in objs) {
				oldVal = attrs[key];
				newVal = objs[key];
				if (oldVal != newVal) {
					attrs[key] = newVal;
					changed = true;
					this.change(key, oldVal, newVal);
				}
			};
			if(changed){
				this.hasChange.call(this);
			}
			return this;
		};
		//设置Model属性，支持单个key-value,也支持对象集合
		this.set=function(k,v){
			return _set.call(this,k,v);
		};
		//更新Model属性，支持单个key-value,也支持对象集合
		this.update=function(k,v){
			return _set.call(this,k,v);
		};
		//向服务器拉数据callback暴露给外部处理响应
		this.fetch = function (callback) {
			var self = this,
			url = this.url,
			cb = callback || function (json) {
				//默认将回传的json对象当做model
				this.set(json);
			};
			if (url) {
				$.ajax({
					url : url,
					success : function (json) {
						if (typeof callback == "function") {
							cb.call(self, json);
						}
					},
					dataType : "json"
				})
			}
		};
		$.extend(this, settings);
		if(!attrs[this.idArr]){
			attrs[this.idArr]=uniqueId++;
		}
	};
//对象集合类
	_.Models = function (settings) {
		var models = {},
			length = 0;
		//取得集合大小
		this.length = function () {
			return length;
		};
		//集合类型
		this.model = null;
		//初始化方法
		this.init = $.noop;
		//创建一个新的model并加入当前集合
		this.create = function (json) {
			var m = new this.model({
					defaults : json
				});
			return _add.call(this,m);
		};
		//添加指定的model进入该集合
		var _add = function (m) {
			var id = m.get(m.idArr);
			if (!models[id]) {
				models[id] = m;
				length++;
			}
			return m;
		};
		this.add=function(m){
			return _add.call(this,m);
		};
		//删除指定的model
		this.del = function (m) {
			var id = m.get(m.idArr);
			if (models[id]) {
				delete models[id];
				length--;
			}
			return this;
		};
		//清空该集合
		this.empty = function () {
			models = {};
			length = 0;
		};
		//转换此集合成数组
		this.toArr = function () {
			var arr = [];
			for (var m in models) {
				arr.push(models[m]);
			}
			return arr;
		};
		//通过model Id取得model
		this.getById = function (id) {
			return models[id];
		};
		//通过集合的索引取得model，很耗性能
		this.get = function (index) {
			var i = 0;
			for (m in models) {
				i++;
				if (i == index) {
					return models[m];
				}
			}
		};
		this.reset=function(mArrs){
			this.empty();
			for(var i=mArrs.length;i--;){
				this.create(mArrs[i]);
			}
			return this;
		};
		//向服务器拉取数据，callback暴露给外部处理响应json
		this.fetch = function (callback) {
			var self = this,
			url = this.url;
			if (url) {
				$.ajax({
					url : url,
					success : function (json) {
						if (typeof callback == "function") {
							callback.call(self, json);
						}
					},
					dataType : "json"
				})
			}
		};
		//覆盖默认配置
		$.extend(this, settings);
		//调用初始化方法
		this.init.call(this, settings);
	},

	_.View = function (settings) {
		var self = this,
		oldFuns = {},
		listenFuns = {};
		this.f=function(){return listenFuns};
		//初始化方法
		this.init = $.noop;
		//默认绑定一个空的div给当前视图
		this.$= $('<div></div>');
		//默认的渲染方法
		this.render = $.noop;
		//默认的事件集合
		this.events = {};
		
		/**监听model的相关事件,
		*@param model 需要监听的model
		*@param event 监听model的事件名。"change:attr",可以监听model的'attr'属性改变事件
		*@param callback 监听的回调函数
		*/
		this.listenTo = function (model, event, callback) {
			if(!model)return;
			var attrArr,
			attr,
			oldFun;
			attrArr = event.split(":");
			event = attrArr[0];
			if(event=='change'){
				attr = attrArr[1];
				if(attr){
					listenFuns[attr] = callback;
				}
			}
				oldFun = oldFuns[event] || (oldFuns[event] = model[event]) || $.noop;
				model[event] =function(){
					var ret,
					listenFun,
					key = arguments[0];
					ret = oldFun.apply(model, arguments);
					if(event=="change"){
						listenFun =  listenFuns[key] ;
					}else{
						listenFun=callback;
					}
					listenFun && listenFun.apply(self, arguments);
					return ret;
				};
		};
		//为视图添加事件处理
		this.addEvents = function () {
			var es,eventType,selector,eventsStr,fun,
			events = this.events;
			for (eventsStr in events) {
				es = eventsStr.split(" ");
				selector = es[0];
				eventType = es[1];
				fun = events[eventsStr];
				if (typeof fun == "string") {
					fun = this[fun];
				}
				this.$.delegate(selector, eventType, {'view':this},fun);
			}
		};
		//覆盖默认配置
		this._init=function(){
			$.extend(self, settings);
			//调用初始化方法和添加事件处理
				//覆盖默认的jquery对象
			var tag=this.tag;
			tag && (this.$=$("<"+tag+"></"+tag+">"));
			var cls=this.cls;
			cls && this.$.addClass(cls);
			this.init.call(this, settings);
			this.addEvents.call(this, settings);
		};
		this._init();
		
	};
	//为Model,Models,View添加扩展方法，类似于继承
	_.Model.extend = _.Models.extend = _.View.extend = function (opt) {
		var self = this;
		return function (settings) {
			return new self($.extend(opt, settings));
		};
	};
	/** 模板替换函数
	 *  var tem='{name}<div>{age}</div><span>{score}</span>';
	 *  var json={name:'tom',age:10,score:99}
	 *  _.replace(tem,json)
	 *  return:'tom<div>10</div><span>99</span>' 
	 */
	_.replace = function (str, json) {
		if(!json)return str;
		if(json instanceof _.Model){
			json=json.getAttrs();
		}
		return str.replace(/{(.*?)}/igm, function (s, s1) {
			var val=json[s1];
			return val!='undefinde'?val:s;
		});
	};
})(jQuery, window);