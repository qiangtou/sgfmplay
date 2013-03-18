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
				concedepoints : "让球",
				goal : "大小球",
				sigledouble : "单双",
				redcard : "红牌",
				whole:"全场",
				half:"半场"
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
			p1,
			p2,
			ptmp,
			isHost, //主客标识
			f = frame[0][0],
			isRollingBall=f[4],
			teamInfo = f[6],
			gameArr = f[7];
			//isRollingBall=0;
			ds.setTop(isRollingBall,teamInfo);
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
			};
			//开赛时间
			o.livetime = s[2]?new Date(s[2]):0;
			//滚球时间
			o.playTime = (s[7] / 60000) | 0;
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
		//设置滚球头部比分model
		setTop : function (isRollingBall,teamInfo) {
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
				"isRollingBall":isRollingBall,
				"p1name" : p1[1],
				"p2name" : p2[1],
				"livetime":new Date
			}
			o[p1Id] = 1;
			o[p2Id] = 0;
			topModel.set(o);
		},
		
		setGames : function (gameArr) {
			var game,
			typeId, //玩法id
			gameId, //游戏id
			tradeId, //交易项id
			playerId, //球队id
			isWhole, //全半场标识
			indicator,//指标
			concedeId,//让球标识
			concedeObj,//标识表
			gameTypeModel,
			gamemodels,
			i18ns = [],
			i18n = opt.i18n.gameType;
			
			//玩法国际化
			for (var k in i18n) {
				i18ns.push(i18n[k]);
			};
			
			//取主客队名称
			var _topModel = topModel,
			p1name = _topModel.get('p1name'),
			p2name = _topModel.get('p2name');
			
			
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
					gameTypeModel=gameTypeModels.create({
						'typeId' : typeId,
						//全半场1全/2半
						1:{'model':new GameModels,'title':i18ns[5]+'-'+i18ns[typeId - 1]},
						2:{'model':new GameModels,'title':i18ns[6]+'-'+i18ns[typeId - 1]}
					});
				};
				gamemodels=gameTypeModel.get(isWhole).model;
				//游戏处理,没有则创建
				var gm = gamemodels.getById(gameId);
				if (gm == null) {
					gm = gamemodels.create({
							"gameId" : gameId,
							"p1name" : p1name,
							"p2name" : p2name
						});
				};
				
				//游戏model设置交易项
				var isHost = _topModel.get(playerId) || playerId == "big" ? 1 : 0;
				var host = [2, 1][isHost]; //[0]是客场，[1]是主场
				var gameObj = {};
				concedeObj = {
					'1' : indicator, //让球
					'0' : '-', //非让球
					'o' : indicator + '&nbsp o', //大球
					'u' : '&nbsp u' //小球
				};
				gameObj['pk' + host] = concedeObj[concedeId];
				gameObj['trade' + host] = tradeId;
				gm.update(gameObj);
			};
		},
		info : function (json) {
			//	console.log("info")
		}
	},
	tools = {
		date2String:function(date,formatStr){
				//2012-12-6 15:30
				//yyyy-MM-dd HH:mm:ss
				
				return '';
		}
	},
	//游戏模型
	GameModel = sgfmmvc.Model.extend({
			idArr : "gameId"
		}),
	//游戏模型集合类
	GameModels = sgfmmvc.Models.extend({
			model : GameModel
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
			init : function () {
				this.i18n = opt.i18n.top;
				this.listenTo(this.model, "change:isRollingBall", this._init);
				this.listenTo(this.model, "update", this.render);
			},
			_init:function(key,oldV, isRollingBall){
				//isRollingBall:0是单式;1是滚球;
				var addClass=['ds_top','gq_top'],
				removeClass=['gq_top','ds_top'],
				template=["#dstop_tmpl","#gqtop_tmpl"];
				this.$.removeClass(removeClass[isRollingBall]).addClass(addClass[isRollingBall]);
				this.template= $(template[isRollingBall]).html();
				//如果是滚球则加上滚球时间条
				if(isRollingBall){
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
				var pk=this.$.find('.other_pk');
				this.pk1=pk.eq(0);
				this.pk2=pk.eq(1);
				return this;
			},
			addTrade : function (name, v1, v2) {
				
				var isHost=name.charAt(name.length-1);
				var pk='pk'+isHost;
				var pkVal=this.model.get(pk);
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
				this.render();
				this.listenTo(this.model, "create", this.addGame);
			},
			addGame : function (m) {
				var md = this.model.getById(m.gameId);
				var gv = new GameView({
						model : md
					});
				this.$.show().append(gv.render().$);
			},
			render : function () {
				var i18n = $.extend(opt.i18n.playlist, {
						title : this.tit
					});
				this.$.html(sgfmmvc.replace(this.template, i18n)).hide();
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
				var playlist1 = new PlayListView({
						tit : md.get('1').title,
						model :md.get('1').model
					});
					var playlist2 = new PlayListView({
						tit : md.get('2').title,
						model :md.get('2').model
					});
				this.$.append(playlist1.render().$,playlist2.render().$);
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