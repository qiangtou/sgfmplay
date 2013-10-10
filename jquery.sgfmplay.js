/**
 *@description: 单场赛事js,包括单式和滚球。
 *@date:2013-10-10 14:51:01
 */
(function($, window) {
	//多币种处理
	var play,multCurr, 
	opt = {},
	defaults = {
		ratioPromptTime:3,//赔率变化闪动时间
		ratioClick: $.noop,
		typeChange: $.noop,
		//需要显示有游戏状态
		REGNOTREMOVE: /^([1-8]|11)$/,
		//正常游戏状态,锁定时需要解锁
		REGUNLOCK: /^[37]$/,
		typeHolder:{
			1: 'standard', //标准
			2: 'concedepoints', //让球
			3: 'bigsmall', //大小球
			4: 'sigledouble' //单双
		},
		i18n: {
			gameType: {
				standard: "1×2",
				concedepoints: "让球",
				bigsmall: "大小球",
				sigledouble: "单双",
				redcard: "红牌",
				whole: "全场",
				half: "半场"
			},
			trade: {
				big: '大球',
				small: '小球',
				draw:'和局'
			},
			top: {
				first: "上半场",
				second: "下半场",
				half: "半场",
				playing: "进行中",
				pause: "中场"
			},
			playlist: {
				buy: "下注（买）",
				sell: "（卖）吃货",
				refresh: "刷新",
				pkxm: "玩法",
				pk: "盘口",
				pl: "参考赔率"
			}
		}
	},
	//请求封装
	dr = {
		firstGetPlaylist: function() {
			dc.stopTimeout();
			var fun = arguments.callee,
			refreshCycle = opt.playlist[1] || 30000;
			dr.ajax({
				url: opt.playlist[0],
				error: function() {
					dr.timeoutIndex['firstplaylist'] = setTimeout(fun, refreshCycle);
				},
				success: function(json) {
					if (json.c == 0) {
						ds._addType(json.d);
						dr.getAll();
					} else {
						opt.getAlldataError(json)
					}
				}
			});
		},
		//取全量信息
		getAll: function(success) {
			dc.stopTimeout();
			dr.ajax({
				url: opt.allData,
				data: {p:gameTypeModels.getCurrentGameType()},
				success: success||function(json) {
					if (json.c == 0) {
						ds.all(json.d);
						dr.getIncrease(json.v);
					}
				}
			});
		},
		getIncrease: function(v) {
			//增量的框架和市场请求都不用了
			//dr.getFrameInfo(v);
			dr.getGameInfo(v);
			//dr.getMarketInfo(v);
			dr.getPlaylist();
		},
		getPlaylist: function() {
			var fun = arguments.callee,
			url = opt.playlist[0],
			refreshCycle = opt.playlist[1] || 30000;
			dr.ajax({
				url: url,
				complete: function() {
					dr.timeoutIndex['playlistInfo'] = setTimeout(fun, refreshCycle);
				},
				success: function(json) {
					if (json.c == 0) {
						ds._addType(json.d);
					}
				}
			});
		},
		//取框架信息
		getFrameInfo: function(v) {
			var fun = arguments.callee,
			url = opt.frameInfo[0],
			_v = v || fun.v;
			dr.ajax({
				url: url,
				data: {
					p: gameTypeModels.getCurrentGameType(),
					v: _v
				},
				success: function(json) {
					if (json.c == 0) {
						json.d && ds.setFrame(json.d[0]);
						fun.v = json.v;
					}
				}
			});
		},
		//取状态信息
		getGameInfo: function(v) {
			var fun = arguments.callee,
			_v = v || fun.v,
			url = opt.gameInfo[0],
			refreshCycle = opt.gameInfo[1] || 3000;
			dr.ajax({
				url: url,
				data: {
					p: gameTypeModels.getCurrentGameType(),
					v: _v
				},
				complete: function() {
					dr.timeoutIndex['gameInfo'] = setTimeout(fun, refreshCycle);
				},
				success: function(json) {
					if (json.c == 0) {
						if(json.d && json.d[0]){
							ds.setStatus(json.d[0]);
						}
						fun.v = json.v;
					}
					if(json.d==null){
						dr.getAll(function(json){
							if(json.c==1 && typeof opt.matchEnd==='function'){
								console.log('取状态为空，再取全量');
								opt.matchEnd();
							}
						});
					}
				}
			});
		},
		//取盘口信息,刷新参考赔率
		getMarketInfo: function(v) {
			var fun = arguments.callee,
			url = opt.marketInfo[0],
			_v = v || fun.v,
			refreshCycle = opt.marketInfo[1] || 3000;
			dr.ajax({
				url: url,
				data: {
					p: gameTypeModels.getCurrentGameType(),
					v: _v
				},
				success: function(json) {
					if (json.c == 0) {
						ds.setPdata(json.d);
						fun.v = json.v;
						dr.timeoutIndex['marketInfo'] = setTimeout(fun, refreshCycle);
					}
				}
			});
		},
		timeoutIndex: {},
		//ajax封装
		ajax: function(settings) {
			return $.ajax($.extend({
				type: "post",
				dataType: "text",
				cache: false,
				dataFilter: function(data, type) {
					return (new Function("return " + data))();
				},
			error: function(jqXHR,textStatus,errorThrown) {
				       if(textStatus=="parsererror"&&jqXHR){
					       try{
						       var str,responseText,conerr;
						       responseText=jqXHR.responseText;
						       conerr=opt.conerr||'';  
						       if(responseText.indexOf("system.conerr")!=-1){
							       str=$.trim(responseText.split("=")[1]);
							       if($.sgfmdialog){
								       $.sgfmdialog(str,function(){if(conerr){window.location.href=conerr;}/*这个跳转地址由传入外部提供*/});
							       }else{
								       alert(str);
								       if(conerr){window.location.href=conerr;}//这个跳转地址由传入外部提供
							       }
						       }
					       }catch(e){
						       if(typeof(console)==="object"){
							       console.log("errorInfo:["+jqXHR+"]");
						       }
					       }
				       }
			       }
			},
			settings));
		}
	},
	//模型填充
	ds = {
		all: function(d) {
			var mIndex = 0; //赛事索引
			ds.setFrame(d[0][mIndex]);
			ds.setStatus(d[1][mIndex]);
			ds.setPk(d[2]);
		},
		//框架的设置
		setFrame: function(frame) {
			//框架frame[0][0]
			if (!frame) return;
			var tradeArr,matchId;
			matchId = frame[0],
			tradeArr = frame[7];
			//确保赛事相同
			if (matchModel.checkMatch(matchId)) {
				ds.setTop(frame);
				tradeArr && ds.setGames(tradeArr);
				//检测将只有一个交易项的游戏给除掉
				allGameModels.checkGame();
			}
		},
		setStatus: function(status) {
            //如果状态数组为空的话，则不处理
            if (!status || status.toString().indexOf(',,,,,,,')!=-1) return;
			//赛事状态信息，[0]赛事下的各游戏的进球红牌[5]以及状态[6](状态：1待开市、2开市待审核、3集合竞价中、4结束竞价待审核、5待开盘、6开盘待审核、7开盘中、8暂停中、9收盘待审核、
			//10已收盘、11停盘待审核、12已停盘、13赛果待审核、14待结算、15待发送、16已发送、17已结束、18交易已停止,99状态需要锁定)
			var s = status,
			tp=matchModel,
			o={},
			attr = ["goal", "red"],
			events,
			u,
			timezone,
			matchId = s[0],
			mStatus = s[1],
			//(赛事状态：0删除、1新建、2准备、3普通盘交易、(41,42,43)滚球盘上中下场、5交易已停止、6结束),
			livetime = s[2],
			mStatusObj = {
				41: '',
				42: opt.i18n.top.pause,
				43: ''
			},
			goalred = s[5],
			gameStatusArr = s[6];
			//检查赛事id
			if (tp.checkMatch(matchId)) {
				events = ds._handlerGoalRed(goalred); //处理红牌,进球事件
				ds.setGameStatus(gameStatusArr); //设置游戏状态
				o.mStatus = mStatus;
				o.matchId = matchId;
				o.showHalfScore =tp.isHalfAnd2nd(mStatus);
				if(tp.isRoll(mStatus)){
					o.statusStr = mStatusObj[mStatus];
				}
				//开赛时间
				if (livetime) {
					u = Utils.date2String;
					timezone = eval(opt.timezone || 0);
					livetime = new Date(livetime);
					livetime = livetime.getTime() + livetime.getTimezoneOffset() * 60000 + timezone * 3600 * 1000;
					o.livetime = u(new Date(livetime), 'yyyy-MM-dd HH:mm');
				}
				//滚球时间
				if(typeof(s[7])==="number" && typeof(mStatus)==="number"){
					o.playTime = (s[7] / 60000) | 0;
					tp.is2nd(mStatus)&&(o.playTime+=45);
				}
				o['p1goal'] = playerModels.host.get('goal');
				o['p2goal'] = playerModels.custom.get('goal');
				o['p1halfgoal'] = playerModels.host.get('halfGoal');
				o['p2halfgoal'] = playerModels.custom.get('halfGoal');
				tp.update(o);
				if(events.length>0){
					matchEvents.reset(events);
				}
			}
		},
		//处理状态数据中的进球和红牌
		_handlerGoalRed: function(goalred) {
			var i,j,
			events = [],
			player,
			gTimes,
			isFirst,
			//上下半场标识(1上2下)
			rTimes,
			time,
			//时间点
			pid,
			gr,
			isHost,
			halfGoal;
			if (goalred) {
				for (i = 0; i < 2; i++) {
					halfGoal = 0;
					gr = goalred[i];
					pid = gr[0];
					player = playerModels.getById(pid);
					isHost = player.hostcustomId();
					//双方信息
					gTimes = gr[3] || [];
					//进球时间
					for (j = gTimes.length; j--;) {
						time = gTimes[j][0];
						isFirst = !gTimes[j][1];//0上半场，1下半场
						isFirst && ++halfGoal //半场进球累加
						events.push({
							'id': "g" + isHost + j,
							'action': "goal",
							'type': i,
							'isFirst':isFirst,
							'time': time
						})
					}
					player.set('goal', gr[1]); //设置进球数
					player.set('redcard', gr[2]); //设置红牌数
					player.set('halfGoal', halfGoal); //设置半场进球数
					//红牌时间
					rTimes = gr[4] || [];
					for (j = rTimes.length; j--;) {
						time=rTimes[j][0];
						isFirst=!rTimes[j][1];
						events.push({
							'id': "r" + isHost + j,
							'action': "red_card",
							'type': i,
							'isFirst':isFirst,
							'time': time
						})
					}
				};
			};
			return events;
		},
		setGameStatus: function(gameStatusArr) {
			var gameId, gameStatus, gStatus, gm,i,gmChange=false;
			for (i = gameStatusArr.length; i--;) {
				gameId = gameStatusArr[i][0];
				gStatus = gameStatusArr[i][1];
				gm = allGameModels.getById(gameId);
				if(gm){
					gm.set({ 'gStatus': gStatus });
				}
				}
			},
		//只设置参考赔率
		setPdata:function(pk){
			if (!pk) return;
			var i,pkArr,tradeId,pdata,tm;
			for (i = pk.length; i--;) {
				pkArr = pk[i];
				tradeId = pkArr[0];
				pdata=pkArr[1]||'--';
				tm = tradeModels.getById(tradeId);
				tm && tm.set('pdata',pdata);
			}
		},
		setPk: function(pk) {
			//每个交易项的盘口信息，[交易项ID,参考赔率,买1赔率,买1数量,买2赔率,买2数量,买3赔率,买3数量,卖1赔率,卖1数量,卖2赔率,卖2数量,卖3赔率,卖3数量]
			if (!pk) return;
			var i,j,pkLen,tm, pkArr, tradeId, attrs, tradeAttr, tradeObj, pkVal, 
			attrs = ['tradeId', 'pdata', 'b2', 'b2n', 'b1', 'b1n', 'b0', 'b0n', 's0', 's0n', 's1', 's1n', 's2', 's2n'],
			attrsLen = attrs.length;
			for (i = 0, pkLen = pk.length; i < pkLen; i++) {
				pkArr = pk[i];
				tradeId = pkArr[0];
				tm = tradeModels.getById(tradeId);
				if (tm) {
					tradeObj = {};
					for (j = 0; j < attrsLen; j++) {
						tradeAttr = attrs[j];
						pkVal = pkArr[j];
						(pkVal == 'n') && (pkVal = "");
						//如果赔率是0的话就用两根横线替换
						if (tradeAttr == 'pdata') { ! pkVal && (pkVal = '--');
						} else if (tradeAttr.indexOf('n') > 0) {
							pkVal = Utils.getBets(pkVal); //多币种处理
							pkVal = Utils.getMaxBets(pkVal); //过多位数处理
						};
						tradeObj[tradeAttr] = pkVal;
					}
					tm.update(tradeObj);
				}
			}
		},
		//设置滚球头部比分model
		setTop: function(f) {
			var p1, //主队
			p2, //客队
			p1m, p2m, host, custom, matchId = f[0],
			matchName = f[1],
			leagueName = f[3],
			isRollingBall = f[4],
			teamInfo = f[6],
			matchTypeId = f[8],
			totalTime = f[9],
			//赛事总时长
			_playerModels = playerModels,
			//缓存外部变量
			isHost; //p1主客标识
			if (_playerModels.size() == 0 && teamInfo) {
				p1 = teamInfo[0];
				p2 = teamInfo[1];
				isHost = p1[2]; //取第一个队的主客标识
				p1m = _playerModels.create({
					'playerId': p1[0],
					'name': p1[1],
					'isHost': p1[2]
				});
				p2m = _playerModels.create({
					'playerId': p2[0],
					'name': p2[1],
					'isHost': p2[2]
				});
				_playerModels.host = isHost ? p1m: p2m;
				_playerModels.custom = isHost ? p2m: p1m;
			}
			//取出主客队
			host = _playerModels.host;
			custom = _playerModels.custom;
			//matchModel的设置
			matchModel.set({
				"matchTypeId": matchTypeId,
				//后台用到的赛事ID
				"leagueName": leagueName,
				"matchId": matchId,
				"matchName": matchName,
				"isRollingBall": isRollingBall,
				"p1name": host.get('name'),
				"p2name": custom.get('name'),
				'totalTime': totalTime || 90 //总时间
			});
		},
		setGames: function(tradeArr) {
			var i,len,game, typeId, //玩法id
			gameId, //游戏id
			tradeId, //交易项id
			playerId, //球队id
			isWhole, //全半场标识
			indicator, //指标
			concedeId, //让球标识
			concedeObj, //标识表
			typeName, //玩法名
			tradeIndexType, //指标类型
			order,//排序码
			trade,player,gameTypeModel,gamemodels,
			i18n = opt.i18n.gameType,
			_defaultType = gameTypeModels.getCurrentGameType();
			//原来的数据与全量对比，找出在全量中不存在的游戏并删除之
			gameTypeModels.delNotExistGame(tradeArr);
			for (i = 0, len = tradeArr.length; i < len; i++) {
				//解析交易项数组
				trade = tradeArr[i];
				name = trade[0];
				tradeId = trade[1];
				gameId = trade[2];
				typeId = trade[3];
				indicator = trade[4];
				concedeId = trade[5];
				isWhole = trade[6];
				tradeIndexType = trade[7];
				order=trade[8];
				if (typeId != _defaultType) {
					//只显示一种玩法
					continue;
				}
				//玩法处理,没有则创建
				gameTypeModel = gameTypeModels.getById(typeId);
				gamemodels = gameTypeModel.getGameModels(isWhole);
				if (!gamemodels) return;
				//游戏处理,没有则创建
				var gm = gamemodels.getById(gameId);
				if (!gm ) {
					gm = gamemodels.create({ "gameId": gameId });
					gamemodels.showhide(_defaultType == typeId);
				};
				var tm = tradeModels.getById(tradeId);
				//让球显示相关
				concedeObj = {
					'1': indicator, //让球
					'0': '', //非让球
					'o': indicator, //大球
					'u': '' //小球
				};
				//游戏model设置交易项
				var tmObj = {
					'tradeId': tradeId,
					'gameId': gameId,
					'typeId': typeId,
					'isWhole': isWhole,
					'indicator': indicator,
					'name': name,
					'concedeId': concedeId,
					'tradeIndexType': tradeIndexType,
					'order': order,
					'pk': concedeObj[concedeId]
				};
				if (!tm) {
					if (gm.get('gameId') == gameId) {
						tm = new TradeModel;
						tm.set(tmObj);
						gm.addTrade(tm);
					}
				} else {
					gm.update(tmObj);
				}
			};
		},
		_addType: function(d) {
			var i,len,typeId, gameTypeModel,
			_opt = opt,
			gts = gameTypeModels,
			i18n = _opt.i18n.gameType;
			if (d) {
				var currentgt=gts.getCurrentGameType();
				if (!currentgt) {
					gts.setCurrentGameType(d[0]);
				};
				for (i = 0, len = d.length; i < len; i++) {
					typeId = d[i];
					gameTypeModel = gts.getById(typeId);
					if (!gameTypeModel) {
						gameTypeModel = gts.create({
							'typeId': typeId,
							'typeName': i18n[opt.typeHolder[typeId]],
							'isShow': currentgt?false:i==0
						});
					}else{
						gameTypeModel.set('close',false);
					}
				}
			}
		}
	},
	dc = {
		stopTimeout: function() {
			var name,timeoutIndex = dr.timeoutIndex,method;
			for (name in timeoutIndex) {
				timeoutIndex[name] && clearTimeout(timeoutIndex[name]);
				method = 'get' + name.replace(/\w/, name.charAt(0).toUpperCase());
				dr[method] && (dr[method].v = undefined)
			}
		}
	},
	//工具函数
	Utils = {
		add: function(num1, num2) {
			var result, PRECISION = 1000;
			num1 = num1 * PRECISION | 0;
			num2 = num2 * PRECISION | 0;
			result = (num1 + num2) / PRECISION|0;
			return result;
		},
		getBets: function(bet) {
			//没有注额时返回空字符串
			if ("" == bet) {
				return bet;
			}
			//新的注额
			var nBet = Math.ceil(Math.round(bet / multCurr.multRate * 100) / 100);
			//印尼盾特殊处理
			//if (multCurr.currencyFlag == "IDR") {
			//	nBet = Math.ceil(nBet / 1000);
			//}
			return nBet;
		},
		getMaxBets: function(bet) {
			//注额过大的显示处理
			if (bet !== "" && bet > 9999999) {
				return 9999999;
			}
			return bet;
		},
		date2String: function(d, formatStr) {
			var dateObj, attr, val;
			//2012-12-6 15:30:22
			formatStr = formatStr || 'yyyy-MM-dd HH:mm:ss';
			dateObj = {
				'dd': d.getDate(),
				'MM': d.getMonth() + 1,
				'yyyy': d.getFullYear(),
				'HH': d.getHours(),
				'mm': d.getMinutes(),
				'ss': d.getSeconds()
			};
			for (attr in dateObj) {
				val = dateObj[attr];
				//补齐两位数
				if (val < 10) {
					val = '0' + val;
				}
				formatStr = formatStr.replace(attr, val);
			}
			return formatStr;
		}
	},
	//球队集合
	playerModels = new sgfmmvc.Models({
		model: sgfmmvc.Model.extend({
			defaults: {
				'goal': 0,
				'halfGoal': 0
			},
			idArr: 'playerId',
			hostcustomId: function() {
				return this.get('isHost') ? 1: 2; //主场返回1,否则返回2
			}
		})
	}),
	//游戏模型
	GameModel = sgfmmvc.Model.extend({
		idArr: "gameId",
		addTrade: function(m) {
			tradeModels.add(m);
			this.trades=this.trades||[];
			this.trades.push(m);
		},
		isRemoved:function(status){
			return !opt.REGNOTREMOVE.test(status);
		},
		isUnlocked:function(status){
			return opt.REGUNLOCK.test(status)
		},
		destroyAll:function(){
			this.destroyTades();
			this.destroy();
		},
		destroyTades:function(){
			var i,trades=this.trades;
			for(i=trades.length;i--;){
				trades[i].destroy();
			}
		}
	}),
	//游戏模型集合类
	GameModels = sgfmmvc.Models.extend({
		model: GameModel,
		isShow: false,
		showhide: function(isShow) {
			this.isShow = this.length===0?false:isShow;
		}
	}),
	//暴露在外的所有游戏集合
	allGameModels =new GameModels({
		checkGame:function(){
				var game,gs=allGameModels.toArr();
				for(var i=gs.length;i--;){
					(game=gs[i]) && game.trades.length==1 && game.destroy();
				}
		}
	}),
	//进球红牌的集合
	matchEvents = new sgfmmvc.Models({
		model: sgfmmvc.Model.extend()
	}),
	//进球，红牌视图，放在时间条里面的
	matchEventsView = sgfmmvc.View.extend({
		tag: 'span',
		init: function() {
			var m = this.model,
			location = ["t", "d"]; //主队客队红黄牌上下位置标识
			var cls = m.get("action") + "_" + location[m.get("type")];
			this.$.css('text-align','center').addClass(cls).css("left", m.get("left"));
		},
		showTime: function() {
			$(this).show();
		},
		hideTime: function() {
			$(this).hide();
		},
		render: function() {
			var m=this.model,
			time = m.get("time"),
			//下半场时间处理
			isFirst=m.get("isFirst");
			!isFirst&&(time=45+parseInt(time));
			this.$.data('time',time + "'");
			return this;
		}
	}),
	//头部时间条视图
	PlayTimeBarView = sgfmmvc.View.extend({
		model: matchEvents,
		cls: 'play_time_bar',
		template: $("#timebar_tmpl").html(),
		init: function() {
			this.render();
			this.listenTo(this.model, "reset", this.reset);
		},
		events:{
			'span mouseenter':'showTime',
			'span mouseleave':'hideTime'
		},
		render: function() {
			this.$.html(this.template);
			var c = this.$.children();
			this.first = c.eq(0);
			this.second = c.eq(1);
			this.showTimeLine(matchModel.get('playTime'),matchModel.get('totalTime'));
		},
		hideTime:function(){
			this.innerHTML='';
		},
		showTime:function(){
			this.innerHTML=$.data(this,'time')||'';
		},
		/** 设置时间条颜色
		*@pram playTime 滚球进行时间，相对全场
		*@pram totalTime 全场时间
		*/
		showTimeLine: function(playTime, totalTime) {
			var _time=playTime,timeLine = this.first.children(".time_line"),
			barWidth = this.getTimebarWidth(),
			halfTime = totalTime / 2 | 0; 
			if (matchModel.is2nd()) { //滚球下半场
				timeLine.css("width", barWidth); //填满上半场
				timeLine = this.second.children(".time_line"); //切换到下半场
				_time-=halfTime;
				if(playTime>totalTime)playTime=totalTime+'+';
			}else{
				if(playTime>halfTime)playTime=halfTime+'+';
			}
			if(_time>halfTime)_time=halfTime;
			var width = (_time / halfTime * barWidth) | 0; //计算时间条比例
			if(width>15) timeLine.html(playTime + "'");
			timeLine.css("width", width);
		},
		getTimebarWidth:function(){
			return this.first.width();
		},
		reset: function() {
			this.render();
			var i,left, width = this.getTimebarWidth(),
			m, time,isFirst, fragment, first = document.createDocumentFragment(),
			second = document.createDocumentFragment(),
			arr = this.model.toArr();
			width-=12;//修正偏移
			for (i = arr.length; i--;) {
				m = arr[i];
				time = m.get("time");
				isFirst=m.get("isFirst");
				fragment = isFirst?first:second;
				left = -2+(time / 45 * width) | 0;
				m.set("left", left)
				var me = new matchEventsView({
					model: m
				});
				fragment.appendChild(me.render().$[0]);
			}
			this.first.append(first);
			this.second.append(second);
		}
	}),
	//头部模型
	matchModel= new sgfmmvc.Model({
		checkMatch: function(matchId) {
			var originId = this.get('matchId');
			return originId ? (originId == matchId) : true;
		},
		checkStatus:function(reg,mStatus){
			mStatus=mStatus||this.get('mStatus');
			return reg.test(mStatus);
		},
		isRoll:function(mStatus){
			mStatus=mStatus||this.get('mStatus');
			return this.checkStatus(/4[123]/,mStatus);
		},
		is2nd:function(mStatus){
			mStatus=mStatus||this.get('mStatus');
			return this.checkStatus(/43/,mStatus);
		},
		isHalfAnd2nd:function(mStatus){
			mStatus=mStatus||this.get('mStatus');
			return this.checkStatus(/4[23]/,mStatus);
		},
		end:function(){
			this.set('mStatus',6);
		},
		getMatchName:function(){
			var p1, p2, p1vsp2;
			p1 = this.get('p1name');
			p2 = this.get('p2name');
			p1vsp2 = p1 + ' VS ' + p2;
			return p1vsp2;
		}
	}),
	//头部视图，用于显示滚球比分红牌进球等信息
	TopView = sgfmmvc.View.extend({
		model: matchModel,
		init: function() {
			var m=this.model;
			this.i18n = opt.i18n.top;
			this.listenTo(m, "change:isRollingBall", this._init);
			this.listenTo(m, "change:playTime", this.setPlayTime);
			this.listenTo(m, "change:p2name", this.setMatchName);
			this.listenTo(m, "change:mStatus", this.statusChange);
			this.listenTo(m, "update", this.render);
		},
		_init: function(key, oldV, isRollingBall) {
			//isRollingBall:0是单式;1是滚球;
			var addClass = ['ds_top', 'gq_top'],
			removeClass = ['gq_top', 'ds_top'],
			template = ["#dstop_tmpl", "#gqtop_tmpl"];
			this.$.removeClass(removeClass[isRollingBall]).addClass(addClass[isRollingBall]);
			this.template = $(template[isRollingBall]).html();
			this.timbar=null;
			//如果是滚球则加上滚球时间条
			if (isRollingBall) {
				this.timebar = new PlayTimeBarView({
					$: $('<div/>')
				});
				this.$.append(this.timebar.$);
			}
		},
		setPlayTime:function(name,old,playTime){
			this.timebar && this.timebar.showTimeLine(playTime,matchModel.get("totalTime"));
		},
		render: function() {
			var html,timebar,m=this.model,
			isRollingBall= m.get('isRollingBall'),
			showHalfScore = m.get("showHalfScore"),
			attrs=m.getAttrs(),
			time=attrs.playTime,
			totalTime=matchModel.get("totalTime"),
			compareTime;
			if(isRollingBall){
				compareTime=showHalfScore?totalTime:totalTime/2|0;
				if(time>compareTime)attrs.playTime=compareTime+'+';
			}
			html = sgfmmvc.replace(this.template, $.extend({}, attrs, this.i18n));
			if(isRollingBall){
				timebar=this.timebar.$.detach();
			}
			this.$.html(html);
			if(isRollingBall){
				this.$.append(timebar);
			}
			if (!showHalfScore) {
				this.$.find('.p_helf_ac').hide();
			};
			return this;
		},
		statusChange:function(name,oldVal,newVal){
			if(newVal && !/^4?[123]$/.test(newVal)){
				var i,gms=gameTypeModels.getCurrentGameModels();
				for(i=gms.length;i--;){
					gms[i].destroyAll();
				}
				if(typeof opt.matchEnd==='function'){
				console.log('状态变化',newVal);
					opt.matchEnd();
				}
			}
		},
		setMatchName: function() {
			var p1vsp2=this.model.getMatchName();
			$('#matchName').html(p1vsp2);
		}
	}),
	TradeModel = sgfmmvc.Model.extend({
		idArr: "tradeId",
		containBigSmall:function(name){
			name=name||this.get('name');
			return /(big|small)/.test(name);
		},
		handleName:function(){
			var name=this.get('name');
			var nameStr,playerModel;
			if (this.containBigSmall(name)) {
				nameStr=opt.i18n.trade[name];
			}else if(name=='e'){
				//处理和局
				nameStr=opt.i18n.trade['draw'];
			}else {
				playerModel = playerModels.getById(name)
				nameStr=playerModel?playerModel.get('name'):'';
			}
			this.set('nameStr', nameStr);
			return this;
		}
	}),
	//暴露在外的交易项集合
	tradeModels = new sgfmmvc.Models({
		model: TradeModel
	}),
	//交易项视图
	TradeView = sgfmmvc.View.extend({
		tag: 'li',
		template: $('#trade_tmpl').html(),
		init: function() {
			this.listenTo(this.model, "change", this.pkchange);
		},
		events: {
			"a click": "ratioClick"
		},
		render: function() {
			var html,$el = this.$,
			m=this.model.handleName();
			html = sgfmmvc.replace(this.template, m.getAttrs());
			$el.html(html);
			this.pdata = $el.find('.other_data');
			return this;
		},
		pkchange: function(name, _old, _new) {
			var el,cls,up,down,flash,isPk,isBsRatio,isBsQuantity;
			flash=false;
			isPk=name == 'pdata';//参考赔率
			isBsRatio=/^[bs]\d$/.test(name);//买卖盘赔率
			isBsQuantity=/^[bs]\dn$/.test(name);//买卖盘货量
			if (isPk) {
				el=this.pdata.html(_new);
				up='other_data_red'; down='other_data_grn';
				flash=true;
			} else {
				flash=name.indexOf('0')!=-1;//最优赔率b0,b0n,s0,s0n都有这个class,
				if (isBsRatio) {
					_new=_new=='n'?'':_new;
					el = this[name] = this[name] || this.$.find('a[pos="' + name + '"]');
					el.b = el.b || el.find('b');
					el.b.html(_new);
					up='span_red'; down='span_grn';
				} else if (isBsQuantity) {
					_new=_new=='n'?'':_new;
					el = this[name.slice(0, 2)];
					el.empty().append(el.b, _new);
					up=down='span_yel';
				}
			}
			cls=_new>_old?up:down;
			if(flash && _old && _new){ this.flash(el,cls,isPk) }
		},
		flash:function(el,cls,isPk){
			var p,flag;
			flag=el.p;
			p=flag||el.n();
			el.p=p.n(function(){
				!isPk && el.removeClass('ons');
				el.addClass(cls);
			}).w(opt.ratioPromptTime)
			.n(function(){
				el.removeClass(cls);
				!isPk && el.addClass('ons')
				if(flag ||isPk) {
					delete el.p;
				}
			});
		},
		ratioClick: function(e) {
			var i,view, model, pos, action, tid, bors, site, r, q, qs, isFirstsd;
			view = e.data.view;
			model = view.model;
			pos = $(this).attr('pos');
			tid = model.get('tradeId');
			action = pos.charAt(0);
			bors = {b:1,s:2}[action];
			site = pos.charAt(1);
			site = parseInt(site);
			r = model.get(pos) || '';
			q = model.get(pos + 'n') || '';
			isFirstsd = false;
			qs = 0;
			if (site >= 0) {
				for (i = site; i >= 0; i--) {
					qs = Utils.add(qs, model.get(action + i + 'n') || 0);
				}
				qs = Utils.getMaxBets(qs); //过多位数处理
			}
			opt.ratioClick({
				"tradeItemId": tid, //交易项ID
				"tradeType": bors, //买卖方向
				"site": site, //当前点击的赔率位置
				"ratio": r, //当前点击的赔率
				"qty": q, //当前货量
				"allQty": qs, //扫货货量
				"isFirstsd": isFirstsd //这个值现在没有，传false就可以了
			});
		}
	}),
	//游戏视图
	GameView = sgfmmvc.View.extend({
		cls: "game",
		template: $("#game_tmpl").html(),
		init: function() {
			var m=this.model;
			this.hide();
			this.order=[];
			this.listenTo(m, "addTrade", this.addTrade);
			this.listenTo(m, "change:gStatus", this.changeGStatus);
		},
		render: function() {
			this.$.html(this.template);
			this.ul = this.$.find(".play_list_ul");
			this.lock = this.$.find(".lock_layout").height('100%');
			return this;
		},
		addTrade: function(m) {
			this.show();
			var tv= new TradeView({model: m});
			var order=m.get('order');
			tv.$.attr('order',order);
			//为了排序码
			for(var i=0,len=this.order.length;i<len;i++){
				if(order<this.order[i]){
					tv.render().$.insertBefore(this.ul.children().eq(i));
					this.order.splice(i,0,order);
					return;
				}
			}
			this.ul.append(tv.render().$);
			this.order.push(order);
		},
		changeGStatus: function(k, oldStatus, status) {
			var m=this.model,
			_opt = opt,
			gameId = m.get('gameId');
			if (this.$.is(':visible')) {
				if (m.isRemoved(status)) { //不是需要显示的游戏状态删除
					this.remove(gameId);
				} else if (m.isUnlocked(status)) { //正常游戏状态需要解锁
					this.unlockGame(gameId);
				} else { //其它状态都锁定
					this.lockGame(gameId);
				}
			}
		},
		remove: function(gameId) {
			this.model.destroyAll();
			this.$.remove();
			opt.typeChange([{
				"remove": gameId
			}]);
		},
		unlockGame: function(gameId) {
			this.lock.hide();
			opt.typeChange([{
				"unlock": gameId
			}]);
		},
		lockGame: function(gameId) {
			this.lock.show();
			opt.typeChange([{
				"lock": gameId
			}]);
		}
	}),
	//玩法视图
	PlayListView = sgfmmvc.View.extend({
		cls: "play_list_frame",
		template: $("#playlist_tmpl").html(),
		init: function() {
			var m=this.model;
			this.listenTo(m, "create", this.addGame);
			this.listenTo(m, "showhide", this.showhide);
			this.listenTo(m, "empty", this.removeTab);
		},
		render: function() {
			var i18n = $.extend({},opt.i18n.playlist, this.i18n);
			this.$.hide().html(sgfmmvc.replace(this.template, i18n));
			this.fresh = this.$.find('.bt_refurbish');
			return this;
		},
		removeTab:function(){
				this.hide(); 
				var gms,tabs=play.tabs;
				gms=gameTypeModels.getCurrentGameModels();
				if(gms.length===0){
					gameTypeModels.closeCurrent();
				}
		},
		addGame: function(m) {
			var md = this.model.getById(m.gameId),
			gv = new GameView({
				model: md
			});
			allGameModels.add(md);
			this.$.append(gv.render().$);
		},
		freshEvent: function(fresh) {
			fresh.countdown({
				time: 30, //倒计时
				freeze: 3, //冻结时间
				circulation: true, //是否循环
				timeEnd: function() {
					$(".bt_refurbish:visible").countdown("restart");
					dr.getAll();
					return false;
				},
				click: function() {
					$(".bt_refurbish:visible").countdown("restart");
					dr.getAll();
				}
			});
		},
		showhide: function(isShow) {
			if (isShow) {
				if (this.model.size() > 0) {
					this.show();
					this.freshEvent(this.fresh);
				}
			} else {
				this.hide();
				this.fresh.countdown('stop');
			}
		}
	}),
	//玩法集合
	gameTypeModels = new sgfmmvc.Models({
		model: sgfmmvc.Model.extend({
			idArr: "typeId",
			getGameModels: function(isWhole) {
				var gms = {
					2: this.half,
					1: this.whole
				} [isWhole];
				//TODO 其他游戏集合
				return gms;
			},
			getAllGameModels: function() {
				var arr = [];
				this.half && (arr=arr.concat(this.half.toArr()));
				this.whole && (arr=arr.concat(this.whole.toArr()));
				//TODO 其他游戏集合
				return arr;
			},
			showhide:function(isShow){
				this.half && this.half.showhide(isShow);
				this.whole && this.whole.showhide(isShow);
			}
		}),
		currentGameType: null,
		getCurrentGameType: function() {
			return this.currentGameType;
		},
		setCurrentGameType: function(typeId) {
			this.currentGameType = typeId;
		},
		getCurrentGameModels:function(){
			var gtm=this.getById(this.currentGameType);
			return gtm && gtm.getAllGameModels()||[];
		},
		closeCurrent:function(){
			var m= this.getById(this.currentGameType);
			m && m.set('close',true);
		},
		delNotExistGame:function(tradeArr){
			var ga,gm,gmId,_gmId,i,j,arr=[],gms=this.getCurrentGameModels();
			if(tradeArr.length===0 || gms.length===0)return;
			for(i=gms.length;i--;){
				gm=gms[i];
				gId=gm.get('gameId');
				for(j=tradeArr.length;j--;){
					ga=tradeArr[j];
					_gId=ga[2];
					if(gId==_gId){
						gms.splice(i);
						break;
					}
				}
			}
			for(i=gms.length;i--;){
				(gm=gms[i]) && gm.destroyAll();
			}
		}
	}),
	TabView = sgfmmvc.View.extend({
		template: $('#tab_tmpl').html(),
		init: function() {
			this.cls = 'selectTag';
			this._init();
			this.listenTo(this.model, "change:isShow", this.showhide);
			//this.listenTo(this.model, "change:close", this.close);
		},
		_init: function() {
			var html = sgfmmvc.replace(this.template, this.model.getAttrs());
			this.$.html(html);
		},
		render: function() {
			this.isShow() ? this.highlight() : this.removeHighlight();
			return this;
		},
		clickTab: function(e) {
			var v = e.data.view;
			v.model.set('isShow', true);
		},
		isShow: function() {
			return this.model.get('isShow') || false;
		},
		highlight: function() {
			this.$.addClass(this.cls);
			return this;
		},
		removeHighlight: function(e) {
			this.$.removeClass(this.cls);
			return this;
		},
		showhide: function(name, o, isShow) {
			this.render();
			this.model.showhide(isShow);
		},
		//收盘操作
		close:function(name,o,close){
		if(close){
			this.hide();
			var next=this.$.next()||this.$.prev();
			if(next){
				next.click();
			}
			}else{
			!o && this.show();
			}
		}
	}),
	//玩法选项卡视图
	TabsView = sgfmmvc.View.extend({
		template: $('#tabs_tmpl').html()||'<ul><li></li><li></li><li></li></ul>',
		model: gameTypeModels,
		cls: 'other_play',
		init: function() {
			var m=this.model;
			this.i18n = opt.i18n.gameType;
			this.hide();
			this.currenTab = null;
			this.type=[];
			this.listenTo(m, "create", this.addTypeTab);
			this.listenTo(m, "showhide", this.showhide);
		},
		events: {
			'li click': 'toggleTab'
		},
		toggleTab: function(e) {
			var id,typeId,md,currenTab = $(this),
			v = e.data.view;
			//把先前的选项卡样式去掉
			if (v.currenTab) {
				//如果是同一个标签就不操作
				if(v.currenTab[0]===this)return;
				id = v.currenTab.children().attr('typeId');
				var h=v.currenTab.html();
				prev=v.model.getById(id);
				prev && prev.set('isShow', false);
			}
			//将新的选项卡样式加上
			typeId = currenTab.children().attr('typeId');
			v.currenTab = currenTab;
			md = v.model.getById(typeId);
			md && md.set('isShow', true);
			gameTypeModels.setCurrentGameType(typeId);
			//dr.firstGetPlaylist();
			dr.getAll();
		},
		addTypeTab: function(m) {
			var typeId,gameTypeModel,type,li;
			typeId = m.typeId;
			gameTypeModel = this.model.getById(typeId);
			li=this.li.eq(typeId-1);
			new TabView({ 
				model: gameTypeModel,
				$:li
			}).render();
			this.show();
			if (m.isShow) {
				this.currenTab = li;
			}
		},
		render: function() {
			var html = sgfmmvc.replace(this.template,{});
			this.$.html(html);
			this.li=this.$.find('li');
			return this;
		},
		showhide: function(name, old, isShow) {
			isShow ? this.show() : this.hide();
		}
	}),
	TagContentView = sgfmmvc.View.extend({
		model: gameTypeModels,
		init: function() {
			this.i18n = opt.i18n.gameType;
			this.listenTo(this.model, "create", this.render);
		},
		render: function(md) {
			if (md) {
				this.addGameType(md);
			}
		},
		addGameType: function(m) {
			var typeId = m.typeId || m.get('typeId'),
			type = opt.typeHolder[typeId];
			type && this[type](typeId, type);
			return this;
		},
		standard: function(typeId,title) {
			var pk='';
			this.concedepoints(typeId,title,pk);
		},
		//让球
		concedepoints: function(typeId,title,pk) {
			var whole,half,md;
			title = this.i18n[title];
			whole = new PlayListView({
				model: new GameModels,
				i18n:{title:this.i18n.whole + '-' + title}
			});
			half = new PlayListView({
				model: new GameModels,
				i18n:{title:this.i18n.half + '-' + title}
			});
			if(arguments.length>=3){//pk是否传进来
				whole.i18n.pk=half.i18n.pk=pk;
			}
			md = this.model.getById(typeId);
			md.half = half.model;
			md.whole = whole.model;
			this.$.append(whole.render().$, half.render().$);
		},
		bigsmall: function(typeId, title) {
			this.concedepoints(typeId, title);
		},
		sigledouble: function(typeId) {}
	}),
	//整个应用视图
	Play = sgfmmvc.View.extend({
		cls: 'ac_frame',
		init: function() {
			this.top = new TopView; //头部
			this.tagContent = new TagContentView(); //内容
			this.tabs = new TabsView; //标签选项卡
			this.render();
			dr.firstGetPlaylist();
		},
		render: function() {
			this.$.append(this.top.$, this.tabs.render().$, this.tagContent.$);
		}
	}),
	instence = {
		/**初始化*/
		init: function(settings) {
			multCurr = (window.sgfm && window.sgfm.multiCurrency) || {
				currencyFlag: "CNY",
				multRate: 1
			};
			$.extend(opt, defaults, settings);
		},
		initI18n: function(settings) {
			var opti18n, _i18n, info, key, keys, attr, module;
			opti18n = $.extend(opt.i18n, defaults.i18n);
			_i18n = settings.i18n || {};
			for (key in _i18n) {
				info = _i18n[key];
				keys = key.split('_');
				module = keys[0];
				attr = keys[1];
				module && attr && (opti18n[module][attr] = info);
			}
		},
		/**显示赛事*/
		show: function() {
			play=new Play({ $: this });
		}
	};
	$.fn.sgfmplay = function(settings) {
		instence.init.call(this, settings);
		instence.initI18n.call(this, settings);
		instence.show.call(this);
		return this;
	};
	//外部api扩展
	window.tmatch = (function(t) {
		//通过交易项ID获取游戏ID
		t.getGamingId = function(tradeId) {
			var tm = tradeModels.getById(tradeId);
			return tm.get('gameId');
		};
		//通过交易项ID获取赛事ID
		t.getMatchId = function(tradeId) {
			return matchModel.get('matchId');
		};
		//通过交易项ID获取玩法ID
		t.getPlayId = function(tradeId) {
			var tm = tradeModels.getById(tradeId);
			return tm.get('typeId');
		};
		//通过交易项ID获取赛事名称
		t.getMatchName = function(tradeId) {
			return matchModel.get('matchName');
		};
		//通过交易项ID获取联赛名称
		t.getLeMatchName = function(tradeId) {
			return matchModel.get('leagueName');
		};
		//通过交易项ID获取游戏状态
		t.getGamingState = function(tradeId) {
			var tradeModel, gameId, gameModel;
			tradeModel = tradeModels.getById(tradeId);
			gameId = tm.get('gameId');
			gameModel = allGameModels.getById(gameId);
			return gameModel.get('gStatus');
		};
		//通过交易项ID获取胜队名称
		t.getHostname = function(tradeId) {
			var tm, name, player;
			tm = tradeModels.getById(tradeId);
			name = tm.get('name');
			if (isNaN(parseInt(name))) { //如果不是一个数字(big,small),取主队,否则作为playerId
				player = playerModels.host;
			} else {
				player = playerModels.getById(name);
			}
			return player && player.get('name') || '';
		};
		//通过交易项ID获取负队名称
		t.getNextname = function(tradeId) {
			var tm, name, player;
			tm = tradeModels.getById(tradeId);
			name = tm.get('name');
			if (isNaN(parseInt(name))) { //如果不是一个数字(big,small),取主队,否则作为playerId
				player = playerModels.custom;
			} else {
				player = playerModels.getById(name);
				player = player.get('isHost') ? playerModels.custom: playerModels.host;
			}
			return player && player.get('name') || '';
		};
		//通过交易项ID获取交易项的让球指标
		t.isGiveBall = function(tradeId) {
			var tm = tradeModels.getById(tradeId);
			return tm.get('concedeId');
		};
		//通过交易项ID获取交易项名称,(大小为:大或小，让球为球队名)
		t.getTradeItemName = function(tradeId) {
			var tm, name;
			tm = tradeModels.getById(tradeId);
			name = tm.get('nameStr');
			return name;
		};
		//通过交易项ID获取交易项全场半场标识
		t.getFullTimeSign = function(tradeId) {
			var tm = tradeModels.getById(tradeId);
			return tm.get('isWhole');
		};
		//通过交易项ID获取游戏指标
		t.getTradeItemNorm = function(tradeId) {
			var tm, name;
			tm = tradeModels.getById(tradeId);
			name = tm.get('indicator') || '';
			return name;
		};
		//通过交易项ID获取全半场国际化显示信息
		t.getFullTimeName = function(tradeId) {
			var tm, isWhole, i18n;
			i18n = opt.i18n.gameType;
			tm = tradeModels.getById(tradeId);
			isWhole = tm.get('isWhole');
			return {
				1: i18n.whole,
				2: i18n.half
			} [isWhole];
		};
		//通过交易项ID获取指标类型
		t.getTradeIndexType = function(tradeId) {
			var tm = tradeModels.getById(tradeId);
			return tm.get('tradeIndexType');
		};
		//通过交易项ID获取赛事类型ID
		t.getMatchTypeId = function(tradeId) {
			return matchModel.get('matchTypeId');
		};
		//单式滚球标识
		t.getPlaySign = function() {
			return matchModel.get('isRollingBall');
		};
		//取得当前货量
		t.getNowQty = function(bet) {
			return Utils.getBets(bet);
		};
		//通过交易项id获取队id，交易项数组的第一个元素
		t.getAttenderId=function(tradeId){
			var tm = tradeModels.getById(tradeId);
			return tm.get('name');
		};
		//获取比分
		t.getScore=function(tradeId,splitStr){
			var s1,s2;
			splitStr=splitStr||':';
			s1= playerModels.host.get('goal')||0;
			s2= playerModels.custom.get('goal')||0;
			return s1+splitStr+s2;
		}
		return t;
	})(window.tmatch || {});
})(jQuery, window);
/**
 *倒计时插件
 */
(function($) {
	var $this,defaults,init,start,clear,restart,control,checkVisible;
	$.fn.countdown = function(settings) {
		var i,$this, fun;
		for (i = this.length; i--;) {
			$this = this.eq(i);
			if (typeof settings == 'string') {
				fun = control[settings];
				fun && fun.call($this, defaults);
			} else {
				init.call($this, settings);
			}
		}
		return this;
	};
	defaults = {
		time: 10,
		freeze: 3,
		circulation: false,
		timeEnd: $.noop,
		click: $.noop
	};

	init = function(settings) {
		var opt, _opt, $this;
		$this = this;
		if (!$this.is('input') || $this.data("countdown")) return;
		$this.data("countdown", true);
		opt = $.extend({},defaults, settings);
		_opt = $this.data("opt");
		opt.originVal = (_opt && _opt.originVal) || $this.val();
		$this.data("opt", opt);
		$this.unbind('click').bind('click', function() {
			opt.click();
		});
		start.call($this, opt);
	};
	start = function(opt) {
		var $this, time, freeze, timeEnd, freezeTime, originVal, circulation,arr;
		$this = this;
		time = opt.time;
		freeze = opt.freeze;
		timeEnd = opt.timeEnd;
		originVal = opt.originVal;
		circulation = opt.circulation;
		freezeTime = Math.max(time - freeze, 0);
		$this.val(time + originVal).attr("disabled", true);
		arr = $this.data("intervalIndex"); 
		! arr && $this.data("intervalIndex", arr = []);
		arr.push(setInterval(function() {
			time--;
			if (!checkVisible($this)) {
				return clear.call($this);
			}
			if (time > 0) {
				if (time <= freezeTime) {
					$this.removeAttr("disabled")
				}
				$this.val(time + originVal);
			} else {
				clear.call($this);
				$this.val(originVal);
				timeEnd() && opt.circulation && start.call($this, opt);
			}
		},
		1000));
	};
	clear = function() {
		var opt=this.data('opt'),arr = this.data("intervalIndex") || [];
		while(arr.length)clearInterval(arr.pop());
		opt && this.val(opt.originVal).data("countdown", false);
		return false;
	}; 
	restart = function() {
		clear.call(this);
		start.call(this, this.data("opt"));
	};
	control = {
		'stop': clear,
		'restart': restart
	};
	checkVisible = function($this) {
		return $this && $this.is(':visible');
	};
})(jQuery);
/**一个延时插件,支持链式调用
 *@example
 *$(obj).w(t).n(fun);延时t秒执行fun
 *$(obj).n(fun).w(t).n(fun2).w(t2).n(fun3);先执行fun再延时t秒，再执行fun2,再延时t2秒，再执行fun3
 */
(function ($) {
	var P=function (el) { this.el=el; }
	P.prototype = {
		constructor : P,
		ok : function (x) { return x; },
		n : function (fun) {
			var p = new P(this.el);
			this._n = p;
			p.ok = fun||p.ok;
			return p;
		},
		w : function (t) {
			var p = new P(this.el);
			p.ok=function(x){
				setTimeout(function () { p._n && p._n._fire(x); }, t * 1000);
				return p;
			}
			this._n=p;
			return p;
		},
		call:function(){ this._fire();},
		_fire : function (val) {
			val = this.ok.call(this.el, val);
			if (val instanceof P) {
				val._n = this._n;
			} else if (this._n)this._n._fire(val);
		}
	};
	$.extend($.fn,{
		n : function (fun) {
			var p = new P(this);
			p.ok = fun||p.ok;
			setTimeout(function () { p._fire(); }, 0);
			return p;
		},
		w : function (t) {
			var p = new P(this);
			setTimeout(function () { p._fire(); }, t*1000);
			return p;
		}
	});	
})(jQuery);
