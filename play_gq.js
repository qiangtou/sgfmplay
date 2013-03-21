/**
 * 1.单场全量
 * 2.轮循状态
 */
(function ($, window) {
	var content = window,
	opt = {},
	defaults = {
		gameType : 1, //默认显示的玩法标签
		i18n : {
			gameType : {
				standard : "标准盘",
				concedepoints : "让球",
				goal : "大小球",
				sigledouble : "单双",
				redcard : "红牌",
				whole : "全场",
				half : "半场"
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
				pkxm : "玩法",
				pk : "盘口",
				pl : "参考赔率"
			}
		}
	},
	//请求封装
	dr = {
		fecth : function (settings) {
			//取全量信息
			dr.dispatch(settings.allUrl, settings.allRefreshCycle, "all");
			//取变化信息
			dr.dispatch(settings.infoUrl, settings.infoRefreshCycle, "info");
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
	//模型填充
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
			var f = frame[0][0],
			isRollingBall = f[4],
			teamInfo = f[6],
			gameArr = f[7],
			totalTime = f[9]; //赛事总时长
			ds.setTop(isRollingBall, teamInfo, totalTime);
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
			time, //时间点
			isFirst, //上下半场标识(1上2下)
			o = {},
			pid,
			player,
			isHost,
			halfGoal = 0,
			attr = ["goal", "red"],
			events = [],
			mStatus = s[1], //(状态：0删除、1新建、2准备、3普通盘交易、(41,42,43)滚球盘上中下场、5交易已停止、6结束),
			mStatusObj = {
				41 : '',
				42 : opt.i18n.top.pause,
				43 : ''
			},
			goalred = s[5];
			for (i = 0; i < 2; i++) {
				gr = goalred[i];
				pid = gr[0];
				player = playerModels.getById(pid);
				//双方信息
				gTimes = gr[3] || [];
				//进球时间
				for (j = gTimes.length; j--; ) {
					time = gTimes[j][0];
					isFirst = gTimes[j][1];
					isFirst && ++halfGoal //半场进球累加
					events.push({
						'id' : "g" + isHost + j,
						'action' : "goal",
						'type' : i,
						'time' : time
					})
				}
				player.set('goal', gr[1]); //设置进球数
				player.set('redcard', gr[2]); //设置红牌数
				player.set('halfGoal', halfGoal); //设置半场进球数
				//红牌时间
				rTimes = gr[4] || [];
				for (j = rTimes.length; j--; ) {
					events.push({
						'id' : "r" + isHost + j,
						'action' : "red_card",
						'type' : i,
						'time' : rTimes[j][0]
					})
				}
			};
			if (/4[123]/.test(mStatus)) {
				o.mStatus = mStatusObj[mStatus];
			}
			//开赛时间
			var u = Utils.date2String;
			o.livetime = s[2] ? (u(new Date, 'yyyy-MM-dd ') + u(new Date(s[2] + 8 * 3600 * 1000), 'HH:mm')) : '';
			//滚球时间
			o.playTime = (s[7] / 60000) | 0;
			o['p1goal'] = playerModels.host.get('goal');
			o['p2goal'] = playerModels.custom.get('goal');
			o['p1halfgoal'] = playerModels.host.get('halfGoal');
			o['p2halfgoal'] = playerModels.custom.get('halfGoal');
			topModel.update(o);
			matchEvents.reset(events);
		},
		setPk : function (pk) {
			//每个交易项的盘口信息，[交易项ID,参考赔率,买1赔率,买1数量,买2赔率,买2数量,买3赔率,买3数量,卖1赔率,卖1数量,卖2赔率,卖2数量,卖3赔率,卖3数量]
			var tm,
			pkArr,
			tradeId,
			o,
			pkLen = pk.length;
			var attrs = ['tradeId', 'pdata', 'b1', 'b1n', 'b2', 'b2n', 'b3', 'b3n', 's1', 's1n', 's2', 's2n', 's3', 's3n'],
			attrsLen = attrs.length;
			while (pkLen--) {
				pkArr = pk[pkLen];
				tradeId = pkArr[0];
				tm = tradeModels.getById(tradeId);
				if (tm) {
					o = {};
					for (var j = 0; j < attrsLen; j++) {
						o[attrs[j]] = pkArr[j];
					}
					tm.set(o);
				}
			}

		},
		//设置滚球头部比分model
		setTop : function (isRollingBall, teamInfo, totalTime) {
			var p1, //主队
			p2, //客队
			p1m,
			p2m,
			_playerModels = playerModels, //缓存外部变量
			isHost, //p1主客标识

			p1 = teamInfo[0];
			p2 = teamInfo[1];
			isHost = p1[2]; //取第一个队的主客标识


			if (_playerModels.length == 0) {
				p1m = _playerModels.create({
						'playerId' : p1[0],
						'name' : p1[1],
						'isHost' : p1[2]
					});
				p2m = _playerModels.create({
						'playerId' : p2[0],
						'name' : p2[1],
						'isHost' : p2[2]
					});
				_playerModels.host = isHost ? p1m : p2m;
				_playerModels.custom = isHost ? p2m : p1m;
			}
			//取出主客队
			host = _playerModels.host;
			custom = _playerModels.custom;

			//topModel的设置
			topModel.set({
				"isRollingBall" : isRollingBall,
				"p1name" : host.get('name'),
				"p2name" : custom.get('name'),
				'totalTime' : totalTime / 60000 | 0 //总时间
			});
		},

		setGames : function (gameArr) {
			var game,
			typeId, //玩法id
			gameId, //游戏id
			tradeId, //交易项id
			playerId, //球队id
			isWhole, //全半场标识
			indicator, //指标
			concedeId, //让球标识
			concedeObj, //标识表
			_playerModels = playerModels, //缓存外部变量
			typeName, //玩法名
			player,
			gameTypeModel,
			gamemodels,
			i18ns = [],
			i18n = opt.i18n.gameType;

			//玩法国际化
			for (var k in i18n) {
				i18ns.push(i18n[k]);
			};
			for (var i = gameArr.length; i--; ) {
				//解析数组
				game = gameArr[i];
				playerId = game[0];
				tradeId = game[1];
				gameId = game[2];
				typeId = game[3];
				indicator = game[4];
				concedeId = game[5];
				isWhole = game[6];

				//玩法处理,没有则创建
				gameTypeModel = gameTypeModels.getById(typeId);
				if (gameTypeModel == null) {
					typeName = i18ns[typeId - 1];
					gameTypeModel = gameTypeModels.create({
							'typeId' : typeId,
							'typeName' : typeName,
							'isShow' : opt.gameType == typeId,
							//全半场1全/2半
							1 : {
								'model' : new GameModels,
								'title' : i18ns[5] + ' - ' + typeName
							},
							2 : {
								'model' : new GameModels,
								'title' : i18ns[6] + ' - ' + typeName
							}
						});
				};
				gamemodels = gameTypeModel.get(isWhole).model;
				//游戏处理,没有则创建
				var gm = gamemodels.getById(gameId);
				if (gm == null) {
					gm = gamemodels.create({
							"gameId" : gameId,
							"p1name" : _playerModels.host.get('name'),
							"p2name" : _playerModels.custom.get('name')
						});
					gamemodels.showhide(opt.gameType == typeId);
				};
				concedeObj = {
					'1' : indicator, //让球
					'0' : '-', //非让球
					'o' : indicator + '&nbsp o', //大球
					'u' : '&nbsp u' //小球
				};
				//游戏model设置交易项
				var hostcustomId;
				if (/(big|small)/.test(playerId)) {
					hostcustomId = playerId == "big" ? 1 : 2;
				} else {
					hostcustomId = _playerModels.getById(playerId).hostcustomId();
				}
				var gameObj = {};
				gameObj['pk' + hostcustomId] = concedeObj[concedeId];
				gameObj['trade' + hostcustomId] = tradeId;
				gm.update(gameObj);
			};
		},
		info : function (json) {
			//	console.log("info")
		}
	},
	//工具函数
	Utils = {
		date2String : function (d, formatStr) {
			//2012-12-6 15:30:22
			formatStr = formatStr || 'yyyy-MM-dd HH:mm:ss';
			var dateObj = {
				'dd' : d.getDate(),
				'MM' : d.getMonth(),
				'yyyy' : d.getFullYear(),
				'HH' : d.getHours(),
				'mm' : d.getMinutes(),
				'ss' : d.getSeconds()
			};
			for (var attr in dateObj) {
				formatStr = formatStr.replace(attr, dateObj[attr]);
			}
			return formatStr;
		}
	},
	//球队集合
	playerModels = new sgfmmvc.Models({
			model : sgfmmvc.Model.extend({
				defaults : {
					'goal' : 0,
					'halfGoal' : 0
				},
				idArr : 'playerId',
				hostcustomId : function () {
					return this.get('isHost') ? 1 : 2; //主场返回1,否则返回2
				}
			})
		}),
	//游戏模型
	GameModel = sgfmmvc.Model.extend({
			idArr : "gameId"
		}),
	//游戏模型集合类
	GameModels = sgfmmvc.Models.extend({
			model : GameModel,
			isShow : false,
			showhide : function (isShow) {
				this.isShow = isShow;
			}
		}),
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
				this.showTimeLine(topModel.get("playTime"), topModel.get("totalTime"));
			},
			/** 设置时间条颜色
			 *@pram playTime 滚球进行时间，相对全场
			 *@pram totalTime 全场时间
			 */
			showTimeLine : function (playTime, totalTime) {
				var timeLine = this.first.children(".time_line"),
				barWidth = this.width,
				halfTime = totalTime / 2 | 0; //与0或取整
				if (playTime > halfTime) {
					timeLine.css("width", barWidth); //填满上半场
					playTime -= halfTime; //如果是下半场，自减掉半场时间
					timeLine = this.second.children(".time_line"); //切换到下半场
				}
				width = (playTime / halfTime * barWidth) | 0; //计算时间条比例
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
			init : function () {
				this.i18n = opt.i18n.top;
				this.listenTo(this.model, "change:isRollingBall", this._init);
				this.listenTo(this.model, "update", this.render);
			},
			_init : function (key, oldV, isRollingBall) {
				//isRollingBall:0是单式;1是滚球;
				var addClass = ['ds_top', 'gq_top'],
				removeClass = ['gq_top', 'ds_top'],
				template = ["#dstop_tmpl", "#gqtop_tmpl"];
				this.$.removeClass(removeClass[isRollingBall]).addClass(addClass[isRollingBall]);
				this.template = $(template[isRollingBall]).html();
				//如果是滚球则加上滚球时间条
				if (isRollingBall) {
					this.timebar = $('<div></div>');
					new PlayTimeBarView({
						$ : this.timebar
					});
					this.$.append(this.timebar);
				}
			},
			render : function () {
				var html = sgfmmvc.replace(this.template, $.extend({}, this.model.getAttrs(), this.i18n));
				this.$.html(html).append(this.timebar);
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
				var pk = this.$.find('.other_pk');
				this.pk1 = pk.eq(0);
				this.pk2 = pk.eq(1);
				return this;
			},
			addTrade : function (name, v1, v2) {
				var isHost = name.charAt(name.length - 1);
				var pk = 'pk' + isHost;
				var pkVal = this.model.get(pk);
				this[pk].html(pkVal);

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
				this.listenTo(this.model, "create", this.addGame);
				this.listenTo(this.model, "showhide", this.showhide);
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
				this.$.hide().html(sgfmmvc.replace(this.template, i18n));
				return this;
			},
			showhide : function (isShow) {
				if (isShow) {
					this.model.length > 0 && this.show();
				} else {
					this.hide();
				}
			}
		}),
	//玩法集合
	gameTypeModels = new sgfmmvc.Models({
			model : sgfmmvc.Model.extend({
				idArr : "typeId",
				showType : null,
				getShowType : function () {
					return this.showType;
				},
				setShowType : function (md) {
					if (this.getById(md.get(md.idArr))) {
						this.showType = md;
					}
				},
				defaults : {
					'show' : false
				}
			})
		}),
	TabView = sgfmmvc.View.extend({
			template : $('#tab_tmpl').html(),
			tag : 'li',
			init : function () {
				this.cls = 'ons';
				this._init();
				this.listenTo(this.model, "change:isShow", this.showhide);
			},
			_init:function(){
				var html = sgfmmvc.replace(this.template, this.model.getAttrs());
				this.$.html(html);
			},
			render : function () {
				this.isShow() ? this.highlight() : this.removeHighlight();
				return this;
			},
			clickTab : function (e) {
				var v = e.data.view;
				v.model.set('isShow', true);
			},
			isShow : function () {
				return this.model.get('isShow') || false;
			},
			highlight : function () {
				this.$.addClass(this.cls);
				return this;
			},
			removeHighlight : function (e) {
				this.$.removeClass(this.cls);
				return this;
			},
			showhide : function (name, o, isShow) {
				this.render();
				this.model.get('1').model.showhide(isShow);
				this.model.get('2').model.showhide(isShow);
			}
		}),
	//玩法选项卡视图
	TabsView = sgfmmvc.View.extend({
			model : gameTypeModels,
			cls : 'other_play',
			init : function () {
				this.currenTab = null;
				this.listenTo(this.model, "create", this.addTypeTab);
			},
			events : {
				'li click' : 'toggleTab'
			},
			toggleTab : function (e) {
				var currenTab = $(this),
				v = e.data.view;
				//把先前的选项卡样式去掉
				var id = v.currenTab.children().attr('typeId');
				v.model.getById(id).set('isShow', false);
				//将现在的选项卡样式加上
				var typeId = currenTab.children().attr('typeId');
				v.currenTab = currenTab;
				v.model.getById(typeId).set('isShow', true);
			},
			addTypeTab : function (m) {
				var typeId = m.typeId;
				var md = this.model.getById(typeId);
				var tv = new TabView({
						model : md
					});
				this.ul.append(tv.render().$);
				if (m.isShow) {
					this.currenTab = tv.$;
				}
			},
			render : function () {
				this.ul = $('<ul></ul>');
				this.$.append(this.ul);
				return this;
			}
		}),
	//整个应用视图
	Play = sgfmmvc.View.extend({
			model : gameTypeModels,
			cls : 'ac_frame',
			model : gameTypeModels,
			init : function () {
				this.top = new TopView();
				this.tab = new TabsView();
				this.listenTo(this.model, "create", this.addGameType);
				this.render();
				dr.fecth(opt);
			},
			render : function () {
				this.$.append(this.top.$, this.tab.render().$);
			},
			addGameType : function (m) {
				var mds = this.model,
				md = mds.getById(m.typeId);
				this.playlist1 = new PlayListView({
						tit : md.get('1').title,
						model : md.get('1').model
					});
				this.playlist2 = new PlayListView({
						tit : md.get('2').title,
						model : md.get('2').model
					});
				this.$.append(this.playlist1.render().$, this.playlist2.render().$);
			}
		}),
	instence = {
		/**初始化*/
		init : function (settings) {
			/**设置全局上下文*/
			content = this;
			return $.extend(true,opt, defaults, settings);
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