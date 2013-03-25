#交易系统WEB单式,滚球测试数据

以下所有地址须鉴权,请访问<http://172.17.109.106/tw/content/user.login.do>登陆后在进行操作

##获取有效联赛信息
<http://172.17.109.106/tw/core/inPlay.getMt.do>

##获取某个联赛下的赛事
<http://172.17.109.106/tw/core/inPlay.getNav.do>

* 参数:mtid  参数类型:int |联赛ID

##获取框架信息
http://172.17.109.106/tw/core/inPlay.getFrameInfo.do

* 参数:p	参数类型:int	|玩法ID
* 参数:v	参数类型:long	|版本号(可选,不填或已失效的版本号将返回全量信息)
* 参数:m	参数类型:int	|赛事ID

##获取游戏信息
<http://172.17.109.106/tw/core/inPlay.getGameInfo.do>

* 参数:m	参数类型:int	|赛事ID
* 参数:p	参数类型:int	|玩法ID
* 参数:v	参数类型:long	|版本号(可选,不填或已失效的版本号将返回全量信息)

##获取盘口信息
<http://172.17.109.106/tw/core/inPlay.getMarketInfo.do>

* 参数:m	参数类型:int	|赛事ID
* 参数:p	参数类型:int	|玩法ID
* 参数:v	参数类型:long	|版本号(可选,不填或已失效的版本号将返回全量信息)


##今日赛事测试数据

今日赛事参数说明:

* 参数:cPage	参数类型:int	|当前页数(可选,默认1)
* 参数:bCOP	    参数类型:int	|浏览器性能级别(可选,默认1)
* 参数:v		参数类型:long	|版本号(可选,不填或已失效的版本号将返回全量信息)
* 参数:tsc.p	参数类型:int	|版面类型,全部=0,滚球=1,单式=2(可选)
* 参数:tsc.ti	参数类型:int	|时间段,0:12~16,1:16~20,2:20~00,3:00~04,4:04~08,5:08~12(可选,默认全部)
* 参数:tsc.mis	参数类型:int	|赛事ID集合(可选,默认全部)
* 参数:tsc.mts	参数类型:int	|联赛ID集合(可选,默认全部)
* 参数:tsc.pis	参数类型:int	|玩法ID集合(必填,目前就只有2,3)

以上参数对今日赛事全部地址生效

##获取联赛选择数据
<http://127.0.0.1/tw/core/today.getMt.do>

##获取条件筛选测试数据
<http://127.0.0.1/tw/core/today.cndTest.do>

##获取框架信息
<http://127.0.0.1/tw/core/today.getFrameInfo.do>

##获取游戏信息
<http://127.0.0.1/tw/core/today.getGameInfo.do>

##获取盘口信息
<http://127.0.0.1/tw/core/today.getMarketInfo.do>

##说明:
1. 获取不到数据有可能是因为浏览器设置的语言交易系统不支持,目前交易系统支持的语言有zh,en,zh_hant,th,ri,vi
2. 传了版本还返回全量是因为版本号失效了,交易系统目前只缓存10个增量版本,比如返回的最新版本为100,那有效的增量版本为90-100

--------------------------