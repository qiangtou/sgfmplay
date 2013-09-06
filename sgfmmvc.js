/**
 *轻量级的mvc框架,backbone的简单实现
 *model与view的分离，html代码使用模板统一管理
 *@see http://backbonejs.org/
 *@time :2013-09-06 17:43:55
 */
(function ($, window) {
	var _ = window.sgfmmvc = window.sgfmmvc || {};
	var uniqueId=0;
	var e={
		/**监听model的相关事件,
		*@param model 需要监听的model
		*@param event 监听model的事件名。"change:attr",可以监听model的'attr'属性改变事件
		*@param callback 监听的回调函数
		*/
		listenTo:function (model, event, callback) {
			if (!model){ return;}
			var originEvent=event.split(':')[0],//处理change:attr中的change
			funs=model._listenFuns=model._listenFuns||{};

			funs[event]=funs[event]||[];
			funs[event].push({c:callback,ctx:this});

			if(!funs[originEvent]){
				if(model[originEvent]){
					funs[originEvent]=[{c:model[originEvent],ctx:model}];
				}
			}
			model[originEvent]=function(){
				var i,len,cbs,cb,ret,_ret,attrEvents;
				attrEvents=this._listenFuns['change:'+arguments[0]];
				if(attrEvents){
					for(i=0,len=attrEvents.length;i<len;i++){
						cb=attrEvents[i];
						cb.c.apply(cb.ctx,arguments);
					}
				}
				cbs=this._listenFuns[originEvent]||[];
				for(i=0,len=cbs.length;i<len;i++){
					cb=cbs[i];
					_ret=cb.c.apply(cb.ctx,arguments);
					if(i==0)ret=_ret;
				}
				return ret;
			}
		}
	}
	//Model类
	_.Model = function (settings) {
		settings = settings || {};
		var attrs = this.attrs=settings.defaults || {};
		// 指定Model的id属性
		$.extend(this, settings);
		if(!attrs[this.idArr]){
			attrs[this.idArr]=uniqueId++;
		}
	};
	$.extend(_.Model.prototype,e,{
		idArr : "id",
		hasChange : function(){},
		//通过属性名取得属性值
		get : function (key) {
			return this.attrs[key];
		},
		//取得属性集合对象
		getAttrs : function () {
			return this.attrs;
		},
		//重置Model的属性
		reset:function(json){
			this.attrs={};
			return this.set(json);
		},
		_set : function (k, v) {
			if(!k){return;}
			var objs,oldVal,newVal,key,
			attrs=this.attrs,changed = false;
			if (typeof k === "string") {
				(objs={})[k]=v;
			}else{
				objs=k;
			}
			for (key in objs) {
				oldVal = attrs[key];
				newVal = objs[key];
				if (oldVal != newVal) {
					attrs[key] = newVal;
					changed = true;
					this.change && this.change(key, oldVal, newVal);
				}
			}
			if(changed){
				this.hasChange.call(this);
			}
			return this;
		},
		//设置Model属性，支持单个key-value,也支持对象集合
		update:function(k,v){
			return this._set(k,v);
		},
		set:function(k,v){
			return this._set(k,v);
		},
		//向服务器拉数据callback暴露给外部处理响应
		fetch:function (callback) {
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
						if (typeof cb === "function") {
							cb.call(self, json);
						}
					},
					dataType : "json"
				});
			}
		}
	});
//对象集合类
	_.Models = function (settings) {
		this.models = {};
		this._models = [];
		//覆盖默认配置
		$.extend(this, settings);
		//调用初始化方法
		this.init.call(this, settings);
	};
	$.extend(_.Models.prototype,e,{
		//集合类型
		model : null,
		//初始化方法
		init:function(){},
		//创建一个新的model并加入当前集合
		create:function(json){
			var m = new this.model({
					defaults:json
				});
			return this._add(m);
		},
		size:function(){
			return this._models.length;
		},
		//添加指定的model进入该集合
		_add : function (m) {
			var id = m.get(m.idArr);
			if (!this.models[id]) {
				this.models[id] = m;				
				this._models.push(m);
				this.listenTo(m,"destroy",function(){
					this.del(m);
				});
			}
			return m;
		},
		add:function(m){
			return this._add(m);
		},
		//删除指定的model
		del:function (m) {
			var i=0,id = m.get(m.idArr);
			if (this.models[id]) {
				delete this.models[id];
				while(this._models[i++]!==m);
				this._models.splice(--i,1);
			}
			if(this._models.length==0)this.empty();
			return this;
		},
		empty : function(){
			this._models=[];
			this.models={};
		},
		//转换此集合成数组
		toArr : function () {
			return this._models;
		},
		//通过model Id取得model
		getById : function (id) {
			return this.models[id];
		},
		//通过集合的索引取得model，很耗性能
		get : function (index) {
			return this.models[index];
		},
		reset:function(mArrs){
			this.empty();
			for(var i=mArrs.length;i--;){
				this.create(mArrs[i]);
			}
			return this;
		},
		//向服务器拉取数据，callback暴露给外部处理响应json
		fetch : function (callback) {
			var self = this,
			url = this.url;
			if (url) {
				$.ajax({
					url : url,
					success : function (json) {
						if (typeof callback === "function") {
							callback.call(self, json);
						}
					},
					dataType : "json"
				});
			}
		}
	});
	_.View = function (settings) {
		var tag,cls;
		//覆盖默认配置
		$.extend(this, settings);
		//默认绑定一个空的div给当前视图
		this.$=this.$||$('<div/>');
		this.events=this.events||{};
		//调用初始化方法和添加事件处理
		//覆盖默认的jquery对象
		tag=this.tag;
		tag && (this.$=$("<"+tag+"></"+tag+">"));
		cls=this.cls;
		cls && this.$.addClass(cls);
		this.template=this.template.replace(/[\r\n\t]/g,'');
		this.init(settings);
		this.addEvents(settings);
		this.listenTo(this.model,'destroy',function(keepHtml){ !keepHtml && this.$.remove(); });	
	};
	$.extend(_.View.prototype,e,{
		init:function(){},
		template:'',
		//默认的事件集合
		show:function(){
			return this.$.show();
		},
		hide:function(){
			return this.$.hide();
		},
		//为视图添加事件处理
		addEvents : function () {
			var es,eventType,selector,eventsStr,fun,
			events = this.events;
			for (eventsStr in events) {
				es = eventsStr.split(" ");
				selector = es[0];
				eventType = es[1];
				fun = events[eventsStr];
				if (typeof fun === "string") {
					fun = this[fun];
				}
				this.$.delegate(selector, eventType, {'view':this},fun);
			}
		}
	});
	_.Model.extend = _.Models.extend = _.View.extend = function (opt) {
		var parent = this;
		var child= function () {
			return parent.apply(this,arguments);
		};
		$.extend(child.prototype,parent.prototype,opt);
		return child;
	};
	
	/** 模板替换函数
	 *  var tem='{name}<div>{age}</div><span>{score}</span>';
	 *  var json={name:'tom',age:10,score:99}
	 *  _.replace(tem,json)
	 *  return:'tom<div>10</div><span>99</span>' 
	 */
	_.replace = function (str, json) {
		if(!json || !str){return '';}
		if(json instanceof _.Model){
			json=json.getAttrs();
		}
		return str.replace(/{(.*?)}/igm, function (s, s1) {
			var val=json[s1];
			return val!=undefined?val:'';
		});
	};
})(jQuery, window);
