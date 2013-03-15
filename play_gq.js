/**
 * 1.单场全量
 * 2.轮循状态
 */
(function ($, window) {
	var content = window,
	opt = {},
	defaults = {
		i18n : {
			gameType : {
				standard : "标准盘",
				concedepoints : "让球玩法",
				goal : "大小球玩法",
				sigledouble : "单双玩法",
				redcard : "红牌玩法"
			},
			top : {
				first : "上半场",
				second : "下半场",
				half : "半场",
				playing : "进行中",
				pause : "暂停中"
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
		//框架的设置
		setFrame : function (frame) {
			//框架frame[0][0]
			var mId,
			mName,
			isRoll,
			p1,
			p2,
			ptmp,
			isHost, //主客标识
			f = frame[0][0],
			teamInfo = f[6],
			gameArr = f[7];
			ds.setTop(teamInfo);
			ds.setGames(gameArr);
		},
		setStatus : function (status) {
			//状态信息，[0]赛事下的各游戏的进球红牌[5]以及状态[6](状态：1待开市、2开市待审核、3集合竞价中、4结束竞价待审核、5待开盘、6开盘待审核、7开盘中、8暂停中、9收盘待审核、10已收盘、11停盘待审核、12已停盘、13赛果待审核、14待结算、15待发送、16已发送、17已结束、18交易已停止,99状态需要锁定)
			var s = status[0],
			i,
			j,
			gr,
			gTimes,
			rTimes,
			o = {},
			attr = ["goal", "red"],
			events = [],
			goalred = s[5];
			for (i = 0; i < 2; i++) {
				gr = goalred[i];
				//双方信息
				for (j = 1; j < 3; j++) {
					o["p" + (i + 1) + attr[j - 1]] = gr[j];
				}
				gTimes = gr[3]||[];
				//进球时间
				for (j = gTimes.length; j--; ) {
					events.push({
						id : "g" + i + j,
						action : "goal",
						type : i,
						time : gTimes[j]
					})
				}
				//红牌时间
				rTimes = gr[4]||[];
				for (j = rTimes.length; j--; ) {
					events.push({
						id : "r" + i + j,
						action : "red_card",
						type : i,
						time : rTimes[j]
					})
				}

			}
			o.playTime = (s[2] / 60000) | 0;
			topModel.update(o);
			matchEvents.reset(events);
		},
		setPk : function (pk) {
			//每个交易项的盘口信息，[交易项ID,参考赔率,买1赔率,买1数量,买2赔率,买2数量,买3赔率,买3数量,卖1赔率,卖1数量,卖2赔率,卖2数量,卖3赔率,卖3数量]
			var _tradeModels = tradeModels,
			tm,
			pkArr,
			tradeId,
			o,
			pkLen = pk.length;
			var attrs = ['tradeId', 'pdata', 'b1', 'b1n', 'b2', 'b2n', 'b3', 'b3n', 's1', 's1n', 's2', 's2n', 's3', 's3n'],
			attrsLen = attrs.length;
			while (pkLen--) {
				pkArr = pk[pkLen];
				tradeId = pkArr[0];
				tm = _tradeModels.getById(tradeId);
				if (tm) {
					o = {};
					for (var j = 0; j < attrsLen; j++) {
						o[attrs[j]] = pkArr[j];
					}
					tm.set(o);
				}
			}

		},
		//设置头部比分model
		setTop : function (teamInfo) {
			var p1, //主队
			p2, //客队
			p1Id,
			p2Id,
			ptmp, //交换临时变量
			isHost; //p1主客标识
			p1 = ptmp = teamInfo[0];
			p2 = teamInfo[1];
			isHost = p1[2];
			if (!isHost) { //如果p1是客队，交换处理
				isHost = false;
				p1 = p2;
				p2 = ptmp;
			}
			//topModel的设置
			p1Id = p1[0];
			p2Id = p2[0];
			var o = {
				"p1name" : p1[1],
				"p2name" : p2[1]
			}
			o[p1Id] = 1;
			o[p2Id] = 0;
			topModel.set(o);
		},
		setGames : function (gameArr) {
			var game,
			typeIds = {}, //玩法id集合
			typeId, //玩法id
			gameIds = {},
			gameId, //游戏id
			tradeId, //交易项id
			playerId, //球队id
			gameTypeModel,
			gamemodels,
			i18ns = [],
			i18n = opt.i18n.gameType;
			for (var k in i18n) {
				i18ns.push(i18n[k]);
			}
			var typeName = [],
			typeModels = {
				1 : standardModels, //标准盘
				2 : concedepointsModels, //让球
				3 : goalModels, //大小球
				4 : sigledoubleModels, //单双
				5 : redcardModels //红黄牌
			};
			var _topModel = topModel,
			p1name = _topModel.get('p1name'),
			p2name = _topModel.get('p2name');
			for (var i = gameArr.length; i--; ) {
				game = gameArr[i];
				playerId = game[0];
				tradeId = game[1];
				gameId = game[2];
				typeId = game[3];
				gamemodels = typeModels[typeId];
				gameTypeModel = gameTypeModels.getById(typeId);
				//玩法处理
				if (gameTypeModel == null) {
					gameTypeModels.create({
						typeId : typeId,
						gamemodels : gamemodels,
						title : i18ns[typeId - 1]
					});
				}
				var gm = gamemodels.getById(gameId);
				if (gm == null) {
					gm = gamemodels.create({
							"gameId" : gameId,
							"p1name" : p1name,
							"p2name" : p2name,
							"pk1" : (game[5]?game[4]:'-'),
							"pk2" : (game[5]?'-':game[4]),
						});
				}
				//交易项的处理
				//tradeModels.create({tradeId:tradeId});
				var isHost = _topModel.get(playerId);
				var host = [2, 1][isHost]; //[0]是客场，[1]是主场
				var gameObj = {};
				gameObj['trade' + host] = tradeId;
				gm.update(gameObj);
			};
			for (tid in typeIds) {
				gamemodels = typeModels[tid];
				if (gamemodels) {
					gamemodels.reset();

				}
			}
		},
		info : function (json) {
			//	console.log("info")
		}
	},
	dc = {},
	//游戏模型
	GameModel = sgfmmvc.Model.extend({
			idArr : "gameId"
		}),
	//游戏模型集合类
	GameModels = sgfmmvc.Models.extend({
			model : GameModel
		}),
	//暴露在外的进球玩法和红牌玩法集合,对应的view进行监听
	goalModels = new GameModels,
	redcardModels = new GameModels,
	standardModels = new GameModels,
	concedepointsModels = new GameModels,
	sigledoubleModels = new GameModels,
	//进球红牌的集合
	matchEvents = new sgfmmvc.Models({
			model : sgfmmvc.Model.extend()
		}),
	//进球，红牌视图，放在时间条里面的
	matchEventsView = sgfmmvc.View.extend({
			tag : 'span',
			init : function () {
				var m = this.model,
				location = ["t", "d"]; //主队客队红黄牌上下位置标识
				var cls = m.get("action") + "_" + location[m.get("type")];
				this.$.addClass(cls).css("left", m.get("left"));
			},
			render : function () {
				var time = this.model.get("time");
				this.$.html(time + "'");
				return this;
			}
		}),
	//头部时间条视图
	PlayTimeBarView = sgfmmvc.View.extend({
			model : matchEvents,
			cls : 'play_time_bar',
			template : $("#timebar_tmpl").html(),
			init : function () {
				this.render();
				this.listenTo(this.model, "reset", this.reset);
			},
			render : function () {
				this.$.html(this.template);
				var c = this.$.children();
				this.first = c.eq(0);
				this.second = c.eq(1);
				this.width = this.first.width();
				this.showTimeLine(topModel.get("playTime"));
			},
			showTimeLine : function (playTime) {
				var timeLine = this.first.children(".time_line"),
				barWidth = this.width,
				width = (playTime / 45 * barWidth) | 0;
				if (playTime > 45) {
					timeLine.css("width", barWidth);
					width = width - barWidth;
					timeLine = this.second.children(".time_line");
				}
				timeLine.css("width", width).html(playTime + "'");
			},
			reset : function () {
				this.render();
				var left,
				width = this.width,
				m,
				time,
				bar,
				fragment,
				first = document.createDocumentFragment(),
				second = document.createDocumentFragment(),
				arr = this.model.toArr();

				for (var i = arr.length; i--; ) {
					m = arr[i];
					time = m.get("time");
					if (time <= 45) {
						fragment = first;
					} else if (time > 45) {
						time -= 45;
						fragment = second;
					}
					left = -10 + (time / 45 * width) | 0;
					m.set("left", left)
					var me = new matchEventsView({
							model : m
						});
					fragment.appendChild(me.render().$[0]);
				}
				this.first.append(first);
				this.second.append(second);
			}
		}),
	//头部模型
	topModel = new sgfmmvc.Model,
	//头部视图，用于显示滚球比分红牌进球等信息
	TopView = sgfmmvc.View.extend({
			model : topModel,
			cls : "gq_top",
			template : $("#top_tmpl").html(),
			init : function () {
				this.i18n = opt.i18n.top;
				this.timebar = $('<div></div>');
				this.$.append(this.timebar);
				new PlayTimeBarView({
					$ : this.timebar
				});
				this.listenTo(this.model, "update", this.render);
			},
			render : function () {
				var html = sgfmmvc.replace(this.template, $.extend({}, this.model.getAttrs(), this.i18n));
				this.$.html(html).append(this.timebar);
				return this;
			}

		}),
	//玩法选项卡视图
	TabView=sgfmmvc.View.extend({
		model:new sgfmmvc.Model,
		cls:'other_play',
		template:$('#tab_tmpl').html(),
		init:function(){
			this.model.set(opt.i18n.gameType);
			this.render();
			this.currentTab=this.$.find('li').first();
			this.currentCls='ons';
			this.currentTab.addClass(this.currentCls);
		},
		events:{
			'li click':'toggletab'
		},
		toggletab:function(e){
			var view=e.data.view;
			view.currentTab.removeClass(view.currentCls);
			view.currentTab=$(this);
			view.currentTab.addClass(view.currentCls);
		},
		render:function(){			var html=sgfmmvc.replace(this.template,this.model.getAttrs());
			this.$.html(html);
			return this;
		}	
	}),
	//交易项集合
	tradeModels = new sgfmmvc.Models({
			model : sgfmmvc.Model.extend({
				idArr : "tradeId"
			})
		}),
	//交易项视图
	TradeView = sgfmmvc.View.extend({
			template : $('#trade_tmpl').html(),
			init : function () {
				this.listenTo(this.model, "hasChange", this.render);
			},
			events : {
				"a click" : function (e) {
					alert($(this).html());
				}
			},
			render : function () {
				var $el = this.$;
				var html = sgfmmvc.replace(this.template, this.model.getAttrs());
				var origin = $el.html();
				$el.html(origin + html);
				return this;
			}
		}),
	//游戏视图
	GameView = sgfmmvc.View.extend({
			cls : "play_list_ul",
			tag : "ul",
			template : $("#game_tmpl").html(),
			init : function () {
				this.listenTo(this.model, "change:trade1", this.addTrade);
				this.listenTo(this.model, "change:trade2", this.addTrade);
			},
			render : function () {
				this.$.html(sgfmmvc.replace(this.template, this.model.getAttrs()));
				var children = this.$.children();
				this.trade1 = children.first();
				this.trade2 = children.last();
				return this;
			},
			addTrade : function (name, v1, v2) {
				var tradeId = this.model.get(name);
				var m = tradeModels.create({
						tradeId : tradeId
					});

				var tv = new TradeView({
						$ : this[name],
						model : m
					});
			}
		}),
	//玩法视图
	PlayListView = sgfmmvc.View.extend({
			cls : "play_list_frame",
			template : $("#playlist_tmpl").html(),
			init : function () {
				this.render();
				this.listenTo(this.model, "create", this.addGame);
			},
			addGame : function (m) {
				var md = this.model.getById(m.gameId);
				var gv = new GameView({
						model : md
					});
				this.$.append(gv.render().$);
			},
			render : function () {
				var i18n = $.extend(opt.i18n.playlist, {
						title : this.tit
					});
				this.$.html(sgfmmvc.replace(this.template, i18n));
				return this;
			}
		}),
	//玩法集合
	gameTypeModels = new sgfmmvc.Models({
			model : sgfmmvc.Model.extend({
				idArr : "typeId"
			})
		}),
	//单式视图
	Play = sgfmmvc.View.extend({
			model : gameTypeModels,
			init : function () {
				this.top = new TopView();
				this.tab= new TabView();
				this.listenTo(this.model, "create", this.addGameType);
				this.render();
				dr.fecth(opt);
			},
			render : function () {
				this.$.append(this.top.$,this.tab.$);
			},
			addGameType : function (m) {
				var mds = this.model,
				md = mds.getById(m.typeId);
				var playlist = new PlayListView({
						tit : md.get("title"),
						model : md.get("gamemodels")
					});
				this.$.append(playlist.render().$);
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
		//console.time("show");
		instence.show.call(this, settings);
		//console.timeEnd("show");
		return this;
	};
})(jQuery, window);