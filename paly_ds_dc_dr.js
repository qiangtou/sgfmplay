/**
 * ds,dc,dr结构
 */
(function ($, window) {
	var info = {
		"position" : "点击查看盘口信息",
		"buy" : "买",
		"sell" : "卖",
		"brv" : "买盘能量:{0}%",
		"srv" : "卖盘能量:{0}%",
		"refresh" : "刷新(R)",
		"countDown" : "倒计时：",
		"wait" : "请稍后..."
	},
	isPoint = true,
	pointTime = 3,
	refreshTime = 6000,
	redRE = /^[23]$/,
	multCurr = {
		"currencyFlag" : "CNY",
		"multRate" : 1
	},
	/**
	 *请求
	 */
	dr = {
		get_info : function (settings, callback) {
			var ajaxType = settings.ajaxType ? settings.ajaxType : "POST";
			if (settings.url) {
				$.ajax({
					"url" : settings.url,
					"context" : this,
					"data" : settings.params,
					"type" : ajaxType,
					"dataType" : "json",
					"cache" : false,
					"success" : function (html) {
						callback.call(this, html, settings);
						if (html.returncode != 0) {
							if (settings.error.call(this.get(0), null, html.returncode, html.errmsg) && settings.haserrmsg) {
								if ($.sgfmdialog) {
									$.sgfmdialog(html.errmsg);
								} else {
									alert(html.errmsg);
								}
							}
						}
					},
					"error" : function (jqXHR, textStatus, errorThrown) {
						callback.call(this, {
							returncode : "error"
						}, settings);
						if (settings.error.call(this.get(0), jqXHR, textStatus, errorThrown) && settings.haserrmsg) {
							if ($.sgfmdialog) {
								$.sgfmdialog(errorThrown, 1);
							} else {
								alert(errorThrown);
							}
						}
					}
				});
				return true;
			} else {
				return false;
			}
		}
	},
	/**
	 *显示
	 */
	ds = {
		showinfo : function (json, settings) {
			var $this = this,
			notRefreshDiv,
			changeIds = [];
			$.each(json, function (i) {
				if (/^[14]$/.test(this.pid)) {
					this.isFirstsd = true;
				} else {
					this.isFirstsd = false;
				}
				var play = $this.children(".play_list_frame[sgfm-playid='" + this.i + "']");
				if (play.length > 0) {
					play.attr("play-index", i);
					$.each(dc.refreshplay.call(play, this, settings, this.isFirstsd), function () {
						if (this) {
							changeIds.push(this);
						}
					});
				} else if (!(/^10|12$/.test(this.s)) && $.isArray(this.ti)) {
					ds.addplayinfo.call($this, this, settings, this.isFirstsd, i);
				}
			});
			notRefreshDiv = $this.children(".play_list_frame[sgfm-refresh=0]");
			if (notRefreshDiv.length > 0) {
				changeIds.push(ds.typechange.call(notRefreshDiv.find(".s_frame li[sgfm-tradeid]"), "remove", settings.typechange));
				notRefreshDiv.remove();
			}
			$this.children(".play_list_frame[sgfm-refresh=1]").attr("sgfm-refresh", "0");
			if (changeIds.length > 0) {
				settings.typechange(changeIds);
			}
		},
		typechange : function (type) {
			if (this.length > 0) {
				var ids = [];
				this.each(function () {
					if (type === "unlock") {
						var $this = $(this);
						ids.push({
							"i" : $this.attr("sgfm-tradeid"),
							s : $this.parents(".play_list_frame[sgfm-playid]").data("metadata").s
						});
					} else {
						ids.push($(this).attr("sgfm-tradeid"));
					}
				});
				return {
					"type" : type,
					"tradeItemIds" : ids
				};
			}
			return false;
		},
		addplayinfo : function (data, settings, isFirstsd, index) {
			var $this = $(this),
			ul = $("<ul>").html("<li class='tit'><span class='buy_th'>" + info.buy + "&nbsp;</span><span class='sell_th'>&nbsp;" + info.sell + "</span></li>"),
			frame = $("<div class='s_frame'></div>").append(ul),
			tit = $("<div class='s_p_t play_frame_tit'></div>").html("<div class='tit_L'><h4 class='tit_h'>" + data.n + ($.trim(data.sn) !== "" ? " (" + data.sn + ")" : "") + "</h4></div><div class='tit_R'><span class='play_data p_t_info'>" + info.countDown + "</span><span class='play_data p_time'></span><span class='refresh_none'>&nbsp;</span></div>"),
			play = $("<div sgfm-playid='" + data.i + "' play-index='" + index + "' sgfm-refresh='1' class='play_list_frame'></div>").data("metadata", data).append(tit).append(frame),
			rbnt = $("<span title='" + info.refresh + "' class='refresh'>&nbsp;</span>").css("cursor", "pointer").appendTo(tit.children(".tit_R")).click(function () {
					window.clearTimeout($this.data("timeoutID"));
					$this.find("span.p_t_info,span.refresh").hide();
					$this.find("span.refresh_none").show();
					$this.find("span.p_time").text(info.wait);
					init.call($this.get(0), $this.data("settings"), $this.data("callback"));
				});
			tit.click(dc.titclick).css("cursor", "pointer");
			$.each(data.ti, function () {
				var li = ds.add_trade.call(this, settings, false, isFirstsd);
				ul.append(li);
				if (redRE.test(data.pid) && data.ai == this.tn) {
					li.children("a").addClass("f30");
				}
				li = null;
			});
			if (!/^[37]$/.test(data.s)) {
				tit.removeClass("play_frame_tit").addClass("play_frame_tit_lock").data("hclass", "tit_h");
				ul.find("span.buy>a,span.sell>a").css("cursor", "default");
			}
			if (index === 0) {
				this.prepend(play);
			} else {
				this.children("div[play-index='" + (index - 1) + "']:first").after(play);
			}
			play = null;
			tit = null;
			frame = null;
			ul = null;
		},
		add_trade : function (settings, isrefresh, isFirstsd) {
			var d = this,
			sign = isrefresh ? "1" : "0",
			buy = $("<span class='buy'></span>"),
			sell = $("<span class='sell'></span>"),
			name = $("<a href='#' title='" + this.n + "'></a>").html("<span class='bn'>&nbsp;</span>" + this.n).click(function () {
					return false;
				}),
			li = $("<li sgfm-tradeid='" + this.i + "' sgfm-refresh='" + sign + "'></li>").append(name).append(buy).append(sell).data("metadata", this),
			bl = this.b.length,
			sl = this.s.length;
			for (var i = 0; i < 3; i++) {
				var ba = $("<a title='" + tools.replaceString(info.brv, [this.brv]) + "'></a>"),
				sa = $("<a title='" + tools.replaceString(info.srv, [this.srv]) + "'></a>"),
				j = bl - 3 + i;
				if (i === 0) {
					ba.addClass("span");
					sa.addClass("ons");
				} else if (i === 2) {
					ba.addClass("ons");
					sa.addClass("span");
				} else {
					ba.addClass("span");
					sa.addClass("span");
				}
				if (j >= 0) {
					this.b[j].v = Math.ceil(Math.round(this.b[j].v / multCurr.multRate * 100) / 100);
					if (multCurr.currencyFlag == "IDR") {
						this.b[j].v = Math.ceil(this.b[j].v / 1000);
					}
					if (this.b[j].v > 9999999) {
						this.b[j].v = 9999999;
					}
					ba.data("metadata", this.b[j]).html("<span><b>" + this.b[j].r + "</b>" + this.b[j].v + "</span>");
					if (isrefresh && settings.ispoint) {
						dc.flicker.call(ba, settings.pointtime);
					}
				} else {
					ba.html("<span><b>&nbsp;</b>&nbsp;</span>");
				}
				if (i < sl) {
					this.s[i].v = Math.ceil(Math.round(this.s[i].v / multCurr.multRate * 100) / 100);
					if (multCurr.currencyFlag == "IDR") {
						this.s[i].v = Math.ceil(this.s[i].v / 1000);
					}
					if (this.s[i].v > 9999999) {
						this.s[i].v = 9999999;
					}
					sa.data("metadata", this.s[i]).html("<span><b>" + this.s[i].r + "</b>" + this.s[i].v + "</span>");
					if (isrefresh && settings.ispoint) {
						dc.flicker.call(sa, settings.pointtime);
					}
				} else {
					sa.html("<span><b>&nbsp;</b>&nbsp;</span>");
				}
				buy.append(ba.click({
						"cb" : settings.ratioclick,
						"dir" : 1
					}, dc.issue_intent));
				sell.append(sa.click({
						"cb" : settings.ratioclick,
						"dir" : 2
					}, dc.issue_intent));
			}
			return li.data("metadata", this);
		}
	},
	/**
	 *控制
	 */
	dc = {
		refreshplay : function (data, settings, isFirstsd) {
			var $this = this,
			tit = $this.children(":first-child"),
			frame = tit.siblings(".s_frame"),
			ul = frame.children("ul"),
			s = $this.data("metadata").s,
			isHasTi = false;
			if (!$.isArray(data.ti)) {
				data = $.extend({}, $this.data("metadata"), data);
				isHasTi = false;
			} else {
				isHasTi = true;
			}
			$this.data("metadata", data).attr("sgfm-refresh", '1');
			tit.find("h4").text(data.n + ($.trim(data.sn) !== "" ? " (" + data.sn + ")" : "")),
			changeIds = [];
			if (/^10|12$/.test(data.s)) {
				changeIds.push(ds.typechange.call(ul.children("li[sgfm-tradeid]"), "remove"));
				$this.remove();
			} else if (/^[37]$/.test(data.s)) {
				if (tit.hasClass("play_frame_tit_lock")) {
					var calss = tit.data("hclass");
					tit.find("h4").removeClass("tit_h_c").addClass(calss);
					if ("tit_h" === calss) {
						frame.show();
					}
					tit.removeData("hclass").removeClass("play_frame_tit_lock").addClass("play_frame_tit").css({
						"cursor" : "pointer"
					});
					changeIds.push(ds.typechange.call(ul.children("li[sgfm-tradeid]"), "unlock"));
					ul.find("span.buy>a,span.sell>a").css("cursor", "pointer");
				} else if (s !== data.s) {
					changeIds.push(ds.typechange.call(ul.children("li[sgfm-tradeid]"), "unlock"));
					ul.find("span.buy>a,span.sell>a").css("cursor", "pointer");
				}
				if (isHasTi) {
					$.each(data.ti, function () {
						var li = ul.children("li[sgfm-tradeid='" + this.i + "']").attr("sgfm-refresh", "1");
						if (li.length > 0) {
							refresh_trade.call(li, settings, this, isFirstsd);
						} else {
							li = ds.add_trade.call(this, settings, true, isFirstsd);
							ul.append(li);
							if (redRE.test(data.pid) && data.ai == this.tn) {
								li.children("a").addClass("f30");
							}
						}
					});
					var notRefreshLi = ul.children("li[sgfm-refresh=0]");
					if (notRefreshLi.length > 0) {
						changeIds.push(ds.typechange.call(notRefreshLi, "remove"));
						notRefreshLi.remove();
					}
					ul.children("li[sgfm-refresh=1]").attr("sgfm-refresh", "0");
				}
			} else {
				if (tit.hasClass("play_frame_tit")) {
					if (frame.is(":hidden")) {
						tit.data("hclass", "tit_h_c");
					} else {
						tit.data("hclass", "tit_h");
					}
					tit.removeClass("play_frame_tit").addClass("play_frame_tit_lock");
					changeIds.push(ds.typechange.call(ul.children("li[sgfm-tradeid]"), "lock"));
					ul.find("span.buy>a,span.sell>a").css("cursor", "default");
				}
				if (isHasTi) {
					$.each(data.ti, function () {
						var li = ul.children("li[sgfm-tradeid='" + this.i + "']").attr("sgfm-refresh", "1");
						if (li.length > 0) {
							refresh_trade.call(li, settings, this, isFirstsd);
						} else {
							li = ds.add_trade.call(this, settings, true, isFirstsd);
							ul.append(li);
							if (redRE.test(data.pid) && data.ai == this.tn) {
								li.children("a").addClass("f30");
							}
						}
					});
					var notRefreshLi = ul.children("li[sgfm-refresh=0]");
					if (notRefreshLi.length > 0) {
						changeIds.push(ds.typechange.call(notRefreshLi, "remove"));
						notRefreshLi.remove();
					}
					ul.children("li[sgfm-refresh=1]").attr("sgfm-refresh", "0");
				}
			}
			return changeIds;
		},
		titclick : function (event) {
			var $this = $(this);
			if (event.pageX < $this.find("div.tit_R > span.p_t_info").offset().left) {
				dc.tit_toggle.call(this);
			}
		},
		tit_toggle : function () {
			var $this = $(this),
			frame = $this.siblings(".s_frame");
			if (frame.is(":hidden")) {
				frame.show();
				$this.find("h4").removeClass("tit_h_c").addClass("tit_h");
			} else {
				frame.hide();
				$this.find("h4").removeClass("tit_h").addClass("tit_h_c");
			}
		},
		issue_intent : function (event, callback) {
			var $this = $(this),
			d = $.extend({}, $this.data("metadata")),
			ld = $.extend({}, $this.parent().parent().data("metadata")),
			pd = $.extend({}, $this.parents(".play_list_frame[sgfm-playid]").data("metadata")),
			iInfo = $.extend({}, d, ld, pd, {
					"tradeItemId" : ld.i,
					"tradeItemNo" : ld.tn,
					"tradeItemName" : ld.n,
					"tradeType" : event.data.dir
				});
			delete iInfo.b;
			if (/^[37]$/.test(pd.s)) {
				if (d && d.r) {
					iInfo["ratio"] = d.r;
					event.data.cb.call(this, iInfo);
				} else if ($this.hasClass("ons")) {
					iInfo["ratio"] = "";
					event.data.cb.call(this, iInfo);
				}
			}
		},
		flicker : function (num) {
			var $this = this;
			this.toggleClass("flicker");
			num -= 0.5;
			if (num > 0) {
				window.setTimeout(function () {
					arguments.callee.call($this, num);
				}, 500);
			} else {
				this.removeClass("flicker");
			}
		}
	},
	/**
	 *工具类
	 */
	tools = {
		/**字符替换工具*/
		replaceString : function (str, ay) {
			$.each(ay, function (i) {
				str = str.replace(new RegExp("\\{" + i + "\\}", "g"), this);
			});
			return str;
		}
	},
	instances = $.sgfmplay._fn = {
		/**初始化*/
		init : function (settings, callback) {
			var $this = $(this);
			
			if (!settings.updateStatus) {
				var sgfm = window.sgfm;
				if (sgfm) {
					$.extend(info, sgfm.playInfo);
					$.extend(multCurr, sgfm.multiCurrency);
				}
				$this.data({
					"settings" : settings,
					"callback" : callback
				});
			}
			timing_refresh = function () {
				var fun = arguments.callee;
				dr.get_info.call($this, settings, function (a, b) {
					if (a.returncode == 0) {
						ds.showinfo.call(this, a.data, b);
					}
					if (!/^1[0123]$/.test(a.returncode)) {
						if (settings.updateStatus) {
							window.setTimeout(fun, settings.refreshcycle);
						} else {
							var titR = $this.find("div.tit_R"),
							timeV = titR.find("span.p_time"),
							timeI = rS = parseInt(settings.refreshcycle / 1000);
							if (rS < 3) {
								rS = 3;
							}
							titR.find("span.p_t_info").show();
							titR.find("span.refresh_none").show();
							titR.find("span.refresh").hide();
							timeV.text(rS);
							$this.data("timeoutID", window.setTimeout(function () {
									timeI = parseInt(timeI) - 1;
									if (rS - timeI == 3) {
										titR.find("span.refresh_none").hide();
										titR.find("span.refresh").show();
									}
									if (timeI == 0) {
										titR.find("span.p_t_info,span.refresh").hide();
										titR.find("span.refresh_none").show();
										timeV.text(info.wait);
										fun();
									} else {
										timeV.text(timeI);
										$this.data("timeoutID", window.setTimeout(arguments.callee, 1000));
									}
								}, 1000));
						}
					}
				});
				settings.callback.apply(this);
				callback.apply(this);
			};
			timing_refresh();
		},
		/**初始化参数*/
		init_params : function (settings) {
			settings = settings || {};
			if (!settings.url) {
				settings.url = false;
			}
			if (!settings.params) {
				settings.params = "";
			}
			if (typeof settings.ispoint !== "boolean") {
				settings.ispoint = isPoint;
			}
			if (isNaN(settings.pointtime)) {
				settings.pointtime = pointTime;
			}
			if (isNaN(settings.refreshcycle)) {
				settings.refreshcycle = refreshTime;
			}
			if (typeof settings.updateStatus !== "boolean") {
				settings.updateStatus = false;
			}
			if (typeof settings.haserrmsg !== "boolean") {
				settings.haserrmsg = false;
			}
			if (!$.isFunction(settings.nameclick)) {
				settings.nameclick = $.noop;
			}
			if (!$.isFunction(settings.callback)) {
				settings.callback = $.noop;
			}
			if (!$.isFunction(settings.ratioclick)) {
				settings.ratioclick = $.noop;
			}
			if (!$.isFunction(settings.typechange)) {
				settings.typechange = $.noop;
			}
			if (!$.isFunction(settings.error)) {
				settings.error = function () {
					return true;
				};
			}
			return settings;
		},
		setParams : function (settings, callback) {
			var $this = $(this).empty();
			window.clearTimeout($this.data("timeoutID"));
			settings = $.extend($this.data("settings"), settings);
			if (!callback) {
				callback = $this.data("callback");
			}
			instances.init.call(this, settings, callback);
		},
		positionChange : function () {
			var $this = $(this),
			settings = $this.data("settings"),
			callback = $this.data("callback");
			window.clearTimeout($this.data("timeoutID"));
			instances.init.call(this, settings, callback);
		}
	};
	$.fn.sgfmplay = function (settings) {
		var isMethodCall = (typeof settings == 'string'),
		args = Array.prototype.slice.call(arguments, 1),
		returnValue = this,
		instance = $.sgfmplay;
		if (isMethodCall && settings.substring(0, 1) == '_') {
			return returnValue;
		}
		if (isMethodCall) {
			this.each(function () {
				var methodValue;
				if (instances && $.isFunction(instances[settings])) {
					methodValue = instances[settings].apply(this, args);
				}
				if (typeof methodValue !== "undefined") {
					returnValue = methodValue;
					return returnValue;
				}
			});
		} else {
			settings = instances.init_params(settings);
			if (!$.isFunction(args[0])) {
				args[0] = $.noop;
			}
			this.each(function () {
				instances.init.call(this, settings, args[0]);
			});
		}
		return returnValue;
	};
	
})(jQuery, window);