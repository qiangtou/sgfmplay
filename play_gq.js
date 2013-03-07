/**
 * 1.单场全量
 * 2.轮循状态
 */
(function ($, window) {
	var content = window,
	opt = {},
	defaults = {
		i18n : {
			top : {
				first : "上半场",
				second : "下半场",
				half : "半场",
				playing : "进行中",
				pause:"暂停中"
			},
			playlist : {
				title : this.tit,
				buy : "下注（买）",
				sell : "（卖）吃货",
				refresh : "刷新",
				pk : "盘口",
				pl : "参考赔率"
			}
		}
		},
	templates = {},
	dr = {
		fecth : function (settings) {
			//取全量信息
			dr.dispatch(settings.allUrl, settings.allRefreshCycle, "all");
			//取变化信息
			//dr.dispatch(settings.infoUrl, settings.infoRefreshCycle, "info");
		},
		dispatch : function (url, refreshCycle, method) {
			//执行周期任务
			dr.ajax(url, ds[method]);
			setTimeout(function () {
				dr.ajax(url, ds[method]);
				setTimeout(arguments.callee, refreshCycle);
			}, refreshCycle);
		},
		//ajax封装
		ajax : function (url, success) {
			return $.ajax({
				type : "post",
				url : url,
				success : success || $.noop,
				dataType : "json"
			});
		}
	},
	ds = {
		all : function (json) {
			var d;			
			if (json.c == 0) {
				d = json.d;
				ds.setFrame(d[0]);
				ds.setStatus(d[1]);
				ds.setPk(d[2]);
			}
		},
		setFrame : function (frame) {
			//框架frame[0][0]
			var mId,mName,isRoll,p1,p2;
			f=frame[0][0];
			console.log(f);
			//topModel的重置
			topModel.set({				
				p1name:f[6][0][1],
				p2name:f[6][1][1],
			});
		},
		setStatus : function (status) {
			//状态信息，[0]赛事下的各游戏的进球红牌[5]以及状态[6](状态：1待开市、2开市待审核、3集合竞价中、4结束竞价待审核、5待开盘、6开盘待审核、7开盘中、8暂停中、9收盘待审核、10已收盘、11停盘待审核、12已停盘、13赛果待审核、14待结算、15待发送、16已发送、17已结束、18交易已停止,99状态需要锁定)
			var s = status[0];
			console.log(s);
			var i,j,k,gr,o = {}, 
			attr = ["goal", "red"],
			c=["goal","red_card"],
			events=[],
			goalred = s[5];
			for ( i = 0; i < 2; i++) {
				gr = goalred[i];
				for ( j = 1; j < 3; j++) {
					o["p" + (i + 1) + attr[j-1]] = gr[j];
				}
				gTimes=gr[3];
				//进球时间
				for(j=gTimes.length;j--;){
					events.push({
						id:"g"+i+j,
						action:"goal",
						type:i,
						time:gTimes[j]
					})
				}
				rTimes=gr[4];
				//红牌时间
				for(j=rTimes.length;j--;){
					events.push({
						id:"r"+i+j,
						action:"red_card",
						type:i,
						time:rTimes[j]
					})
				}
				
			}
			o.playTime = (s[2] / 60000) | 0;
			topModel.set(o);
			matchEvents.reset(events);
		},
		setPk : function (pk) {
			//每个交易项的盘口信息，[交易项ID,参考赔率,买1赔率,买1数量,买2赔率,买2数量,买3赔率,买3数量,卖1赔率,卖1数量,卖2赔率,卖2数量,卖3赔率,卖3数量]
			//console.log(pk);
		},
		info : function (json) {
			//	console.log("info")
		},

	},
	dc = {},
	GameModel = sgfmmvc.Models.extend({}),
	GameModels = sgfmmvc.Models.extend({
			model : GameModel
		}),
	goalModels = new GameModels,
	redcardModels = new GameModels,
	matchEvents=new sgfmmvc.Models({
		model:sgfmmvc.Model.extend()
	}),
	matchEventsView=sgfmmvc.View.extend({
		//$:$("<span></span>"),
		init:function(){
			var m=this.model,
				location=["t","d"];//主队客队红黄牌上下位置标识 
			var cls=m.get("action")+"_"+location[m.get("type")];
			this.$.addClass(cls).css("left",m.get("left"));
		},
		render:function(){
			var time=this.model.get("time");
			this.$.html(time+"'");
			return this;
		}
	}),
	
	PlayTimeBarView=sgfmmvc.View.extend({
			model:matchEvents,
			init:function(){
				this.render();
				this.listenTo(this.model,"reset",this.reset);
			},
			render:function(){
				this.$.html(this.template);
				var c=this.$.children();
				this.first=c.eq(0);
				this.second=c.eq(1);
				this.width=this.first.width();
			},
			reset:function(){
					this.render();
					
					var left,m,time,bar, arr = this.model.toArr();
					for (i = arr.length; i--; ) {
						m=arr[i];
						time = m.get("time");
						if (time <= 45) {
							bar = this.first;
						} else if (time > 45) {
							time-=45;
							bar = this.second;
						}
						left=-10+(time/45*bar.width())|0;
						m.set("left",left)
						//console.log(m.id)
						var me = new matchEventsView({model : m});
						bar.append(me.render().$);
					}
			}
	}),
	topModel=new sgfmmvc.Model,
	TopView = sgfmmvc.View.extend({
			model:topModel,
			cls:"gq_top",
			init : function () {
				this.listenTo(this.model,"hasChange",this.render);
			},
			render : function () {
				this.$.html(sgfmmvc.replace(this.template,$.extend({},this.model.getAttrs(),opt.i18n.top)));
				new PlayTimeBarView({$:this.$.find(".play_time_bar"),template:$("#timebar_tmpl").html()});
				return this;
			}
		}),
	PlayListView = sgfmmvc.View.extend({
			cls:"play_list_frame",
			init : function () {
				this.render();
			},
			render : function () {
				var i18n = $.extend(opt.i18n.playlist, {
						title : this.tit
					});
				this.$.html(sgfmmvc.replace(this.template, i18n));
				return this;
			}
		}),
	Play = sgfmmvc.View.extend({
			init : function () {
				this.top = new TopView({
						template : $("#top_tmpl").html()
					});
				var playlist_tmpl = $("#playlist_tmpl").html();
				this.goalList = new PlayListView({
						model : goalModels,
						tit : "总进球数",
						template : playlist_tmpl
					});
				this.redCardList = new PlayListView({
						tit : "红牌数",
						model : redcardModels,
						template : playlist_tmpl
					});
				this.render();
				dr.fecth(opt);
			},
			render : function () {
				this.$.append(this.top.$, this.goalList.$, this.redCardList.$);
			}
		}),
	instence = {
		/**初始化*/
		init : function (settings) {
			/**设置全局上下文*/
			content = this;
			return $.extend(opt, defaults, settings);
		},
		/**显示赛事*/
		show : function (settings) {
			new Play({
				$ : this
			});
		}
	};
	$.fn.sgfmplay = function (settings) {
		settings = instence.init.call(this, settings);
		console.time("show");
		instence.show.call(this, settings);
		console.timeEnd("show");
		return this;
	};
})(jQuery, window);