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
			topModel.set($.extend({				
				p1name:"中国",
				p1goal:5,
				p2name:"日本",
				p2goal:2,
				now:50
			},defaults.i18n.top));
		},
		setStatus : function (status) {
			//状态信息，[0]赛事下的各游戏的进球红牌[5]以及状态[6](状态：1待开市、2开市待审核、3集合竞价中、4结束竞价待审核、5待开盘、6开盘待审核、7开盘中、8暂停中、9收盘待审核、10已收盘、11停盘待审核、12已停盘、13赛果待审核、14待结算、15待发送、16已发送、17已结束、18交易已停止,99状态需要锁定)
			var s=status[0];
			console.log(s);
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
	topModel=new sgfmmvc.Model({
	}),
	TopView = sgfmmvc.View.extend({
			model:topModel,
			init : function () {
				this.listenTo(this.model,"hasChange",this.render);
			},
			render : function () {
				this.$.addClass("gq_top");
				this.$.html(sgfmmvc.replace(this.template,this.model.getAttrs()));
				return this;
			}
		}),
	PlayListView = sgfmmvc.View.extend({
			init : function () {
				this.render();
			},
			render : function () {
				this.$.addClass("play_list_frame");
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