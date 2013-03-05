/**
 * 1.单场全量
 * 2.轮循状态
 */
(function ($, window) {
	var content = window,
	opt = {},
	defaults = {
		info : {
			"position" : "点击查看盘口信息",
			"buy" : "买",
			"sell" : "卖",
			"brv" : "买盘能量:{0}%",
			"srv" : "卖盘能量:{0}%",
			"refresh" : "刷新(R)",
			"countDown" : "倒计时：",
			"wait" : "请稍后..."
		},
		isPoint : true,
		pointTime : 3,
		refreshTime : 6000,
		redRE : /^[23]$/,
		multCurr : {
			"currencyFlag" : "CNY",
			"multRate" : 1
		}
	},
	templates = {
		play:'<div class="ds_top">',
		top : '<div class="ds_top">'
		 + '<div class="live_name">{name}</div><div class="live_time">{time}</div>  '
		 + '</div>',
		tab : '<ul>'
		 + '<li class="ons"><a href="###">大小球</a></li>'
		 + '<li><a href="###">让球</a></li>'
		 + '<li><a href="###">波胆</a></li>'
		 + '<li><a href="###">半/全场</a></li>'
		 + '<li><a href="###">上半场波胆</a></li>'
		 + '</ul>',
		game : '<div class="play_list_tit_all"><span class="floatleft">全场玩法</span><span class="floatright"><input type="submit" class="bt_refurbish" value="刷新" id="button" name="button"></span></div>'
		 + '<div class="play_ac_tit"><span class="pk_th">盘口</span><span class="other_th">参考赔率</span><span class="buy_th">下注（买）&nbsp;</span><span class="sell_th">&nbsp;（卖）吃货</span></div>',
		},
	dr = {
		ajax : function (url, callback) {
			return $.ajax({
				url : url,
				content : content,
				type : 'post',
				dataType : 'json',
				success : callback
			});
		}
	},
	dc = {
		showTop : function (json) {
			if (json.returncode == 0) {
				var data = json.data;
				this.set({
					"name" : data.pi.gtn + " vs " + data.pi.htn,
					"time" : new Date
				});
			}
		},
		showMatch : function (json) {
			if (json.returncode == 0) {
				var data = json.data;
				for (var i = data.length; i--; ) {
					this.create(data[i]);
				}
			}
		},
		refreshStatus : function (json) {
			console.log(JSON.stringify(json.data[0]));
			if (json.returncode == 0) {
				var dada = json.data;
				for (var i = dada.length; i--; ) {
					var id = dada[i].i;
					var t = trades.getById(id);
					t && t.set(dada[i]);
				}
			}
		}
	},
	TopView = sgfmmvc.View.extend({
			init : function () {
				var $this = this.$;
				$this.addClass("ds_top");
				this.model.fetch(dc.showTop);
				this.listenTo(this.model, "hasChange", this.render);
			},
			template : templates.top,
			render : function () {
				var html = sgfmmvc.replace(this.template, this.model.getAttrs())
					this.$.html(html);
				return this.$;
			}
		}),
	TabView = sgfmmvc.View.extend({
			init : function () {
				var $this = this.$;
				$this.addClass("other_play");
				this.render();
			},
			template : templates.tab,
			render : function () {
				this.$.html(this.template);
				return this.$;
			}
		}),
	game = sgfmmvc.Model.extend({
			id : "i"
		}),
	games = new sgfmmvc.Models({
			model : game
		}),
	gameView=sgfmmvc.View.extend({
		template : templates.game,
		init:function(){
			this.$.addClass("play_list_frame");
		},
		render:function(){
			this.$.append(this.template);
			return this;
		}
	}),
	playlistView = sgfmmvc.View.extend({
			model : games,
			init : function () {
				this.$.addClass("other_list");
				this.listenTo(this.model, "create", this.addGame);
				this.model.url = opt.url.match;
				this.model.fetch(dc.showMatch);
			},
			addGame : function (m) {
				var gv=new gameView
				this.$.append(gv.render().$);
			},
			render : function () {
				return this.$;
			}
		}),
	Play = sgfmmvc.View.extend({
			init : function () {
				this.render();
				
			},
			render:function(){
				var top = new TopView({
						model : new sgfmmvc.Model({
							"url" : opt.url.info
						})
					}),
				tab = new TabView,
				playlist = new playlistView;
				this.$.append(top.$, tab.$, playlist.$);
				return this;
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
			console.time("Play")
			new Play({
				$ : this
			});
			console.timeEnd("Play")

		},
		/**轮循赛事状态*/
		refreshStatus : function (settings) {
			var refreshTime = defaults.refreshTime;
			refreshTime = 2500; //test
			setTimeout(function () {
				games.fetch(settings.url.status, dc.refreshStatus);
				setTimeout(arguments.callee, refreshTime);
			}, refreshTime);
		}
	};
	$.fn.sgfmplay = function (settings) {
		settings = instence.init.call(this, settings);
		instence.show.call(this, settings);
		instence.refreshStatus.call(this, settings);
		return this;
	};
})(jQuery, window);