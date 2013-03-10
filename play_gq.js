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
			f = frame[0][0],
			gameArr = f[7];
			console.log(gameArr)
			//topModel的设置
			topModel.set({
				p1name : f[6][0][1],
				p2name : f[6][1][1]
			});
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
				gTimes = gr[j];
				//进球时间
				for (j = gTimes.length; j--; ) {
					events.push({
						id : "g" + i + j,
						action : "goal",
						type : i,
						time : gTimes[j]
					})
				}
				rTimes = gr[4];
				//红牌时间
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
			topModel.set(o);
			matchEvents.reset(events);
		},
		setPk : function (pk) {
			//每个交易项的盘口信息，[交易项ID,参考赔率,买1赔率,买1数量,买2赔率,买2数量,买3赔率,买3数量,卖1赔率,卖1数量,卖2赔率,卖2数量,卖3赔率,卖3数量]
			//console.log(pk);

		},
		setGames : function (gameArr) {
			var game,
			typeIds = {}, //玩法id集合
			typeId, //玩法id
			gameTypeModel,
			gamemodels,
			i18ns = [],
			i18n = opt.i18n.gameType;
			for (var k in i18n) {
				i18ns.push(i18n[k]);
			}

			var typeName = [],
			typeModels = {
				1 : null, //标准盘
				2 : null, //让球
				3 : goalModels, //大小球
				4 : null, //单双
				5 : redcardModels //红黄牌
			};
			for (var i = gameArr.length; i--; ) {
				game = gameArr[i];
				typeId = game[3];
				gamemodels = typeModels[typeId];
				gameTypeModel = gameTypeModels.getById(typeId);
				if (gameTypeModel == null) {
					gameTypeModels.create({
						typeId : typeId,
						gamemodels : gamemodels,
						title : i18ns[typeId - 1]
					});
				}

			};
			for (tid in typeIds) {
				gamemodels = typeModels[tid];
				gamemodels && gamemodels.reset();
			}
		},
		info : function (json) {
			//	console.log("info")
		}
	},
	dc = {},
	GameModel = sgfmmvc.Models.extend({}),
	GameModels = sgfmmvc.Models.extend({
			model : GameModel
		}),
	//暴露在外的进球玩法和红牌玩法集合,对应的view进行监听
	goalModels = new GameModels,
	redcardModels = new GameModels,
	//进球红牌的集合
	matchEvents = new sgfmmvc.Models({
			model : sgfmmvc.Model.extend()
		}),
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

	PlayTimeBarView = sgfmmvc.View.extend({
			model : matchEvents,
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

				for (i = arr.length; i--; ) {
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
	topModel = new sgfmmvc.Model,
	TopView = sgfmmvc.View.extend({
			model : topModel,
			cls : "gq_top",
			init : function () {
				this.listenTo(this.model, "hasChange", this.render);
			},
			render : function () {
				this.$.html(sgfmmvc.replace(this.template, $.extend({}, this.model.getAttrs(), opt.i18n.top)));
				new PlayTimeBarView({
					$ : this.$.find(".play_time_bar"),
					template : $("#timebar_tmpl").html()
				});
				return this;
			}
		}),
	PlayListView = sgfmmvc.View.extend({
			cls : "play_list_frame",
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
	gameTypeModels = new sgfmmvc.Models({
			model : sgfmmvc.Model.extend({
				idArr : "typeId"
			})
		}),
	Play = sgfmmvc.View.extend({
			model : gameTypeModels,
			init : function () {
				this.top = new TopView({
						template : $("#top_tmpl").html()
					});
				this.listenTo(this.model, "create", this.addGameType);
				this.render();
				dr.fecth(opt);
			},
			render : function () {
				this.$.append(this.top.$);
			},
			addGameType : function (m) {
				var mds = this.model;
				md = mds.getById(m.typeId);
				var playlist = new PlayListView({
						tit : md.get("title"),
						model : md.get("gamemodels"),
						template : $("#playlist_tmpl").html()
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
		console.time("show");
		instence.show.call(this, settings);
		console.timeEnd("show");
		return this;
	};
})(jQuery, window);