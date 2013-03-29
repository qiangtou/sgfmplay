/**
 * 1.单场全量
 * 2.轮循状态
 */
(function ($, window) {
	//window.//console={log:$.noop};
	var content = window,
	opt = {},
	defaults = {
		i18n : {
			gameType : {
				standard : "标准盘",
				concedepoints : "让球",
				bigsmall : "大小球",
				sigledouble : "单双",
				redcard : "红牌",
				whole : "全场",
				half : "半场"
			},
			trade : {
				big : '大球',
				small : '小球'
			},
			top : {
				first : "上半场",
				second : "下半场",
				half : "半场",
				playing : "进行中",
				pause : "中场"
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
		firstGetPlaylist : function () {
			dc.stopTimeout();
			dr.ajax({
				url : opt.playlist[0],
				success : function (json) {
					if (json.c == 0) {
						ds._addType(json.d);
						dr.getAll();
					}
				}
			});
		},
		//取全量信息
		getAll : function () {
			var data = {
				p : ds.getDefaultType()
			};
			dr.ajax({
				url : opt.allData,
				data : data,
				success : function (json) {
					if (json.c == 0) {
						ds.all(json.d);
						dr.getIncrease(json.v);
					}
				}
			});
		},
		getIncrease : function (v) {
			dr.getFrameInfo(v);
			dr.getGameInfo(v);
			dr.getMarketInfo(v);
			dr.getPlaylist();
		},
		getPlaylist : function () {
			var fun = arguments.callee,
			url = opt.playlist[0],
			refreshCycle = opt.playlist[1] || 30000;
			dr.ajax({
				url : url,
				success : function (json) {
					if (json.c == 0) {
						ds._addType(json.d);
						dr.timeoutIndex['playlist'] = setTimeout(fun, refreshCycle);
					}
				}
			});
		},
		//取框架信息
		getFrameInfo : function (v) {
			var fun = arguments.callee,
			url = opt.frameInfo[0],
			_v = v || fun.v,
			refreshCycle = opt.frameInfo[1] || 3000;
			dr.ajax({
				url : url,
				data : {
					p : ds.getDefaultType(),
					v : _v
				},
				success : function (json) {
					if (json.c == 0) {
						ds.setFrame(json.d[0]);
						fun.v = json.v;
						dr.timeoutIndex['frameInfo'] = setTimeout(fun, refreshCycle);
					}
				}
			});
		},
		//取状态信息
		getGameInfo : function (v) {
			var fun = arguments.callee,
			_v = v || fun.v,
			url = opt.gameInfo[0],
			refreshCycle = opt.gameInfo[1] || 3000;
			dr.ajax({
				url : url,
				data : {
					p : ds.getDefaultType(),
					v : _v
				},
				success : function (json) {
					if (json.c == 0) {
						ds.setStatus(json.d);
						fun.v = json.v;
						dr.timeoutIndex['gameInfo'] = setTimeout(fun, refreshCycle);
					}
				}
			});
		},
		//取盘口信息
		getMarketInfo : function (v) {
			var fun = arguments.callee,
			url = opt.marketInfo[0],
			_v = v || fun.v,
			refreshCycle = opt.marketInfo[1] || 3000;
			dr.ajax({
				url : url,
				data : {
					p : ds.getDefaultType(),
					v : _v
				},
				success : function (json) {
					if (json.c == 0) {
						ds.setStatus(json.d[0]);
						fun.v = json.v;
						dr.timeoutIndex['marketInfo'] = setTimeout(fun, refreshCycle);
					}
				}
			});
		},
		timeoutIndex : {},
		//ajax封装
		ajax : function (settings) {
			console.log(settings.url, settings.data);
			return $.ajax($.extend({
					type : "post",
					dataType : "json"
				}, settings));
		}
	},
	//模型填充
	ds = {
		all : function (d) {
			var mIndex = 0; //赛事索引
			ds.setFrame(d[0][mIndex]);
			ds.setStatus(d[1][mIndex]);
			ds.setPk(d[2]);
		},
		//框架的设置
		setFrame : function (frame) {
			//框架frame[0][0]
			if (!frame)
				return;
			var f = frame,
			isRollingBall = f[4],
			teamInfo = f[6],
			gameArr = f[7],
			totalTime = f[9]; //赛事总时长
			ds.setTop(f);
			gameArr && ds.setGames(gameArr);
		},
		setStatus : function (status) {
			//状态信息，[0]赛事下的各游戏的进球红牌[5]以及状态[6](状态：1待开市、2开市待审核、3集合竞价中、4结束竞价待审核、5待开盘、6开盘待审核、7开盘中、8暂停中、9收盘待审核、10已收盘、11停盘待审核、12已停盘、13赛果待审核、14待结算、15待发送、16已发送、17已结束、18交易已停止,99状态需要锁定)
			if (!status)
				return;
			var s = status,
			o = {},
			attr = ["goal", "red"],
			events,
			matchId=s[0],
			mStatus = s[1], //(赛事状态：0删除、1新建、2准备、3普通盘交易、(41,42,43)滚球盘上中下场、5交易已停止、6结束),
			mStatusObj = {
				41 : '',
				42 : opt.i18n.top.pause,
				43 : ''
			},
			goalred = s[5],
			gameStatusArr=s[6];
			events = ds._handlerGoalRed(goalred);
			ds.setGameStatus(gameStatusArr);
			
			o.mStatus = mStatus;
			o.matchId=matchId;
			o.showHalfScore = /4[23]/.test(mStatus) || false;
			if (/4[123]/.test(mStatus)) {
				o.statusStr = mStatusObj[mStatus];
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
		//处理状态数据中的进球和红牌
		_handlerGoalRed : function (goalred) {
			var events = [],
			player,
			gTimes,
			isFirst, //上下半场标识(1上2下)
			rTimes,
			time, //时间点
			pid,
			gr,
			isHost,
			halfGoal = 0;
			if (goalred) {
				for (var i = 0; i < 2; i++) {
					gr = goalred[i];
					pid = gr[0];
					player = playerModels.getById(pid);
					isHost = player.hostcustomId();
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
					for (var j = rTimes.length; j--; ) {
						events.push({
							'id' : "r" + isHost + j,
							'action' : "red_card",
							'type' : i,
							'time' : rTimes[j][0]
						})
					}
				};
			};
			return events;
		},
		
		setGameStatus:function(gameStatusArr){
			var gameId,gameStatus,gm;
			for(var i=gameStatusArr.length;i--;){
				gameId=gameStatusArr[i][0];
				gStatus=gameStatusArr[i][1];
				gm=allGameModels.getById(gameId);
				gm.set({'gStatus':gStatus});
			}
		},
		
		setPk : function (pk) {
			//每个交易项的盘口信息，[交易项ID,参考赔率,买1赔率,买1数量,买2赔率,买2数量,买3赔率,买3数量,卖1赔率,卖1数量,卖2赔率,卖2数量,卖3赔率,卖3数量]
			if (!pk)
				return;
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
					tm.update(o);
				}
			}
		},
		//设置滚球头部比分model
		setTop : function (f) {
			var p1, //主队
			p2, //客队
			p1m,
			p2m,
			host,
			custom,
			matchId=f[0],
			matchName=f[1],
			isRollingBall = f[4],
			teamInfo = f[6],
			totalTime = f[9],//赛事总时长
			_playerModels = playerModels, //缓存外部变量
			isHost; //p1主客标识
			if (teamInfo) {
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
			}
			//取出主客队
			host = _playerModels.host;
			custom = _playerModels.custom;
			//topModel的设置
			topModel.set({
				"matchId":matchId,
				"matchName":matchName,
				"isRollingBall" : isRollingBall,
				"p1name" : host.get('name'),
				"p2name" : custom.get('name'),
				'totalTime' : totalTime || 90 //总时间
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
			typeName, //玩法名
			player,
			gameTypeModel,
			gamemodels,
			i18ns = [],
			i18n = opt.i18n.gameType,
			_defaultType = ds.getDefaultType(),
			_playerModels = playerModels; //缓存外部变量
			//玩法国际化
			for (var k in i18n) {
				i18ns.push(i18n[k]);
			};
			for (var i = 0, len = gameArr.length; i < len; i++) {
				//解析交易项数组
				game = gameArr[i];
				playerId = game[0];
				tradeId = game[1];
				gameId = game[2];
				typeId = game[3];
				indicator = game[4];
				concedeId = game[5];
				isWhole = game[6];
				if (typeId != _defaultType) {
					//只显示一种玩法
					continue;
				}
				//玩法处理,没有则创建
				gameTypeModel = gameTypeModels.getById(typeId);
				gamemodels = gameTypeModel.getGameModels(isWhole);
				if (!gamemodels)
					return;
				//游戏处理,没有则创建
				var gm = gamemodels.getById(gameId);
				if (gm == null) {
					gm = gamemodels.create({
							"gameId" : gameId
						});
					gamemodels.showhide(opt.gameType[0] == typeId);
				};
				concedeObj = {
					'1' : indicator, //让球
					'0' : '-', //非让球
					'o' : indicator, //大球
					'u' : '' //小球
				};
				//游戏model设置交易项
				var tm = tradeModels.getById(tradeId);
				var tmObj = {
					'tradeId' : tradeId,
					'gameId' : gameId,
					'typeId' : typeId,
					'isWhole':isWhole,
					'name' : game[0],
					'pk' : concedeObj[concedeId]
				};
				if (!tm) {
					tm = new TradeModel;
					tm.set(tmObj);
					gm.addTrade(tm);
				} else {
					gm.update(tmObj);
				}
			};
		},
		firstAddType : function (json) {
			if (json.c == 0) {
				ds._addType(json.d);
				ds.gecth(opt);
			}
		},
		addType : function (json) {
			//console.log('--addType,return: ',json);
			if (json.c == 0) {
				ds._addType(json.d);
			}
		},
		_addType : function (d) {
			//console.log('--_addType,return: ',d);
			var i18n = opt.i18n.gameType;
			var typeHandler = {
				1 : 'standard', //标准
				2 : 'concedepoints', //让球
				3 : 'bigsmall', //大小球
				4 : 'sigledouble' //单双
			};
			if (d) {
				opt.gameType = d;
				var typeId,
				gameTypeModel;
				for (var i = 0, len = d.length; i < len; i++) {
					typeId = d[i];
					gameTypeModel = gameTypeModels.getById(typeId);
					//console.log('--check gameTypeModel',gameTypeModel)
					if (!gameTypeModel) {
						//console.log('--create gameTypeModel',typeId);
						gameTypeModel = gameTypeModels.create({
								'typeId' : typeId,
								'typeName' : i18n[typeHandler[typeId]],
								'isShow' : i == 0
							});
					}
				}
			} else {
				//console.log('--_addType,data is null: ');
			}
		},
		//获得默认玩法
		getDefaultType : function () {
			return opt.gameType[0];
		}
	},
	dc = {
		stopTimeout : function () {
			var timeoutIndex = dr.timeoutIndex,
			method;
			for (var name in timeoutIndex) {
				timeoutIndex[name] && clearTimeout(timeoutIndex[name]);
				method = 'get' + name.replace(/\w/, name.charAt(0).toUpperCase());
				dr[method] && (dr[method].v = undefined)
			}
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
			idArr : "gameId",
			addTrade : function (m) {
				tradeModels.add(m);
			}
		}),
	//游戏模型集合类
	GameModels = sgfmmvc.Models.extend({
			model : GameModel,
			isShow : false,
			showhide : function (isShow) {
				this.isShow = isShow;
			}
		}),
	//暴露在外的所有游戏集合
	allGameModels=new GameModels(),
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
			showTime : function () {
				$(this).show();
			},
			hideTime : function () {
				$(this).hide();
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
				var width = (playTime / halfTime * barWidth) | 0; //计算时间条比例
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
			showhalf : function (n, old, mStatus) {},
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
				var showHalfScore = this.model.get("showHalfScore");
				if (!showHalfScore) {
					this.$.find('.p_helf_ac').hide();
				};
				return this;
			}
		}),
	TradeModel = sgfmmvc.Model.extend({
			idArr : "tradeId"
		}),
	//暴露在外的交易项集合
	tradeModels = new sgfmmvc.Models({
			model : TradeModel
		}),
	//交易项视图
	TradeView = sgfmmvc.View.extend({
			tag : 'li',
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
				var typeId = this.model.get('typeId');
				var name = this.model.get('name');
				if (/(big|small)/.test(name)) {
					this.model.set('nameStr', opt.i18n.trade[name]);
				} else {
					this.model.set('nameStr', playerModels.getById(name).get('name'));
				}
				var html = sgfmmvc.replace(this.template, this.model.getAttrs());
				$el.html(html);
				return this;
			}
		}),
	//游戏视图
	GameView = sgfmmvc.View.extend({
			cls : "play_list_ul",
			tag : "ul",
			template : $("#game_tmpl").html(),
			init : function () {
				this.listenTo(this.model, "addTrade", this.addTrade);
			},
			render : function () {
				return this;
			},
			addTrade : function (m) {
				var tradeId = this.model.get(name);
				var tv = new TradeView({
						model : m
					});
				this.$.append(tv.render().$);
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
				allGameModels.add(md);
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
				getGameModels : function (isWhole) {
					var gms = {
						2 : this.half,
						1 : this.whole
					}
					[isWhole];
					//TODO 其他游戏集合
					return gms;
				},
				getAllGameModels : function () {
					var arr = [];
					this.half && arr.push(this.half);
					this.whole && arr.push(this.whole);
					//TODO 其他游戏集合
					return arr;
				},
				getShowType : function () {
					return this.showType;
				},
				setShowType : function (md) {
					if (this.getById(md.get(md.idArr))) {
						this.showType = md;
					}
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
			_init : function () {
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
				var arr = this.model.getAllGameModels();
				for (var i = arr.length; i--; ) {
					arr[i].showhide(isShow);
				}
			}
		}),
	//玩法选项卡视图
	TabsView = sgfmmvc.View.extend({
			model : gameTypeModels,
			cls : 'other_play',
			init : function () {
				this.i18n = opt.i18n.gameType;
				this.typeHandler = {
					1 : 'standard', //标准
					2 : 'concedepoints', //让球
					3 : 'bigsmall', //大小球
					4 : 'sigledouble' //单双
				};
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
				if (v.currenTab) {
					var id = v.currenTab.children().attr('typeId');
					v.model.getById(id).set('isShow', false);
				}
				//将现在的选项卡样式加上
				var typeId = currenTab.children().attr('typeId');
				v.currenTab = currenTab;
				var md = v.model.getById(typeId).set('isShow', true);
				v.setDefault(typeId);
			},
			setDefault : function (typeId) {
				typeId = parseInt(typeId);
				var arr = opt.gameType;
				for (var i = 0, len = arr.length; i < len; i++) {
					if (typeId == arr[i]) {
						arr.splice(i, 1);
						arr.unshift(typeId);
						break;
					}
				}
				dr.firstGetPlaylist();
			},
			addTypeTab : function (m) {
				//console.log('***listen to gameTypemodels create,addTypeTab');
				var typeId = m.typeId;
				var gameTypeModel = this.model.getById(typeId);
				var tv = new TabView({
						model : gameTypeModel
					});
				//console.log('***addTypeTab create new TabView');
				this.ul.append(tv.render().$);
				if (m.isShow) {
					//console.log('***addTypeTab,set currenTab is show');
					this.currenTab = tv.$;
				}
			},
			render : function () {
				this.ul = $('<ul></ul>');
				this.$.append(this.ul);
				return this;
			}
		}),
	TagContentView = sgfmmvc.View.extend({
			model : gameTypeModels,
			init : function () {
				this.i18n = opt.i18n.gameType;
				this.typeHandler = {
					1 : 'standard', //标准
					2 : 'concedepoints', //让球
					3 : 'bigsmall', //大小球
					4 : 'sigledouble' //单双
				};
				this.listenTo(this.model, "create", this.render);
			},
			render : function (md) {
				if (md) {
					//this.$.empty();
					this.addGameType(md);
				}
			},
			addGameType : function (m) {
				var typeId = m.typeId || m.get('typeId');
				var fun = this.typeHandler[typeId];
				fun && this[fun](typeId, fun);
				return this;
			},
			standard : function (typeId) {},
			concedepoints : function (typeId, title) {
				title = this.i18n[title];
				var whole = new PlayListView({
						tit : this.i18n.whole + '-' + title,
						model : new GameModels
					});
				var half = new PlayListView({
						tit : this.i18n.half + '-' + title,
						model : new GameModels
					});
				var md = this.model.getById(typeId);
				md.half = half.model;
				md.whole = whole.model;
				this.$.append(whole.render().$, half.render().$);
			},
			bigsmall : function (typeId, title) {
				this.concedepoints(typeId, title);
			},
			sigledouble : function (typeId) {},
			standard : function (typeId) {}
		}),
	//整个应用视图
	Play = sgfmmvc.View.extend({
			cls : 'ac_frame',
			init : function () {
				this.top = new TopView(); //头部
				this.tagContent = new TagContentView(); //内容
				this.tabs = new TabsView(); //标签选项卡
				this.render();
				dr.firstGetPlaylist();
			},
			render : function () {
				this.$.append(this.top.$, this.tabs.render().$, this.tagContent.$);
			}
		}),
	instence = {
		/**初始化*/
		init : function (settings) {
			/**设置全局上下文*/
			content = this;
			$.extend(true, opt, defaults, settings);
			return opt;
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
		// console.time("show");
		instence.show.call(this, settings);
		// console.timeEnd("show");
		return this;
	};
	//外部api
	window.tmatch = {
		//通过交易项ID获取游戏ID
		getGamingId : function (tradeId) {
			var tm=tradeModels.getById(tradeId);
			return tm.get('gameId');
		}, 
		//通过交易项ID获取赛事ID
		getMatchId : function (tradeId) {
			return topModel.get('matchId');
		}, 
		//通过交易项ID获取玩法ID
		getPlayId : function (tradeId) {
			var tm=tradeModels.getById(tradeId);
			return tm.get('typeId');
		}, 
		//通过交易项ID获取赛事名称
		getMatchName : function (tradeId) {
		return topModel.get('matchName');
		}, 
		//通过交易项ID获取联赛名称
		getLeMatchName : function (tradeId) {
		//TODO
		}, 
		//通过交易项ID获取游戏状态
		getGamingState : function (tradeId) {
			var tradeModel,gameId,gameModel;
			tradeModel=tradeModels.getById(tradeId);
			gameId=tm.get('gameId');
			gameModel=allGameModels.getById(gameId);
			return gameModel.get('gStatus');
		}, 
		//通过交易项ID获取胜队名称
		getHostname : function (tradeId) {
		//TODO
		}, 
		//通过交易项ID获取负队名称
		getNextname : function (tradeId) {
		//TODO
		}, 
		//通过交易项ID获取交易项的让球指标
		isGiveBall : function (tradeId) {}, 
		//通过交易项ID获取交易项名称
		getTradeItemName : function (tradeId) {}, 
		//通过交易项ID获取交易项全场半场标识
		getFullTimeSign : function (tradeId) {
			var tm=tradeModels.getById(tradeId);
			return tm.get('isWhole');
		}, 
		//通过交易项ID获取游戏指标
		getTradeItemNorm : function (tradeId) {}, 
		//通过交易项ID获取全半场国际化显示信息
		getFullTimeName : function (tradeId) {
		//TODO
		}, 
		//通过交易项ID获取指标类型
		getTradeIndexType : function (tradeId) {
		//TODO
		}, 
		//通过交易项ID获取赛事类型ID
		getMatchTypeId : function (tradeId) {
		//TODO
		}, 
		//单式滚球标识
		getPlaySign : function () {
		//TODO
		} 
	};
})(jQuery, window);