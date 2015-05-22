'use strict';

function initMessages () {
	function getData() {
		var req = new XMLHttpRequest();
		req.open('GET', 'messages.json', true);
		req.responseType = 'json';
		req.onload = function() {
			messages = this.response;
		};
		req.onerror = function(e) {
			// Though this should not happen, it did happened!
			setTimeout(getData, 500);
		};
		req.send();
	}
	var messages = {};
	getData();
	window._ = function (key, args) {
		var message = '', value = messages[key];
		if(value) {
			args = args || [];
			args.unshift(key);
			message = value.message.replace(/\$(?:\{(\d+)\}|(\d+))/g, function(value, group1, group2) {
				var index = typeof group1 != 'undefined' ? group1 : group2;
				var arg = args[index];
				return typeof arg == 'undefined' ? value : arg;
			});
		}
		//return message || key || '';
		return message;
	};
}

function compareVersion(version1, version2) {
	version1 = (version1 || '').split('.');
	version2 = (version2 || '').split('.');
	for ( var i = 0; i < version1.length || i < version2.length; i ++ ) {
		var delta = (parseInt(version1[i], 10) || 0) - (parseInt(version2[i], 10) || 0);
		if(delta) return delta < 0 ? -1 : 1;
	}
	return 0;
}

// Database
/* ===============Data v0.5==================
 * Database: Violentmonkey
 * scripts {
 * 		id: Auto
 * 		uri: String
 * 		custom: List-Dict	// Custom meta data
 * 		meta: List-Dict
 * 		enabled: 0|1
 * 		update: 0|1
 * 		position: Integer
 * 		code: String
 * }
 * cache {
 * 		uri: String
 * 		data: BLOB
 * }
 * values {
 * 		uri: String
 * 		values: String
 * }
 */
function dbError(t, e) {
	opera.postError('Database error: ' + e.message);
	if(e.code == 4)
		opera.extension.tabs.create({url: '/notice_quota.html'}).focus();
}
function initDatabase(callback) {
	db = openDatabase('Violentmonkey', '0.5', 'Violentmonkey data', 10 * 1024 * 1024);
	db.transaction(function(t) {
		function executeSql(t, r) {
			var sql = sqls.shift();
			if(sql) t.executeSql(sql, [], executeSql, dbError);
			else if(callback) callback();
		}
		var sqls = [
			'CREATE TABLE IF NOT EXISTS scripts(id INTEGER PRIMARY KEY,uri VARCHAR,meta TEXT,custom TEXT,enabled INTEGER,"update" INTEGER,position INTEGER,code TEXT)',
			'CREATE TABLE IF NOT EXISTS cache(uri VARCHAR UNIQUE NOT NULL,data BLOB)',
			'CREATE TABLE IF NOT EXISTS "values"(uri VARCHAR UNIQUE NOT NULL,data TEXT)',
		];
		executeSql(t);
	});
}
function upgradeData(callback) {
	function finish(){
		if(callback) callback();
	}
	var dataVer = '0.5.1';
	if (compareVersion(widget.preferences.version_storage, dataVer) < 0) {
		db.transaction(function(t) {
			function update() {
				var item = data.shift();
				if(!item) finish();
				else t.executeSql('UPDATE scripts SET meta=? WHERE id=?',
													[JSON.stringify(item[1]), item[0]], update, dbError);
			}
			var data=[];
			t.executeSql('SELECT * FROM scripts', [], function(t, r){
				for ( var i = 0; i < r.rows.length; i ++ ) {
					var v = r.rows.item(i);
					data.push([v.id, parseMeta(v.code)]);
				}
				update();
			}, dbError);
		});
		widget.preferences.version_storage = dataVer;
	} else finish();
}

function getNameURI(script) {
	var ns = script.meta.namespace || '';
	var name = script.meta.name || '';
	var nameURI = escape(ns) + ':' + escape(name) + ':';
	if (!ns && !name) nameURI += script.id;
	return nameURI;
}

function newScript() {
	var script = {
		custom: {},
		enabled: 1,
		update: 1,
		code: '// ==UserScript==\n// @name New Script\n// ==/UserScript==\n',
	};
	script.meta = parseMeta(script.code);
	return script;
}

function saveScript(script, callback){
	if(!script.position) script.position = ++ pos;
	db.transaction(function(t){
		var data = [];
		data.push(parseInt(script.id) || null);
		data.push(script.uri);
		data.push(JSON.stringify(script.meta));
		data.push(JSON.stringify(script.custom));
		data.push(script.enabled = script.enabled ? 1 : 0);
		data.push(script.update = script.update ? 1 : 0);
		data.push(script.position);
		data.push(script.code);
		t.executeSql('REPLACE INTO scripts(id,uri,meta,custom,enabled,"update",position,code) VALUES(?,?,?,?,?,?,?,?)', data, function(t, r) {
			if(!script.id) script.id = r.insertId;
			if(ids) {
				if(!(script.id in metas)) ids.push(script.id);
				metas[script.id] = getScript(script, true);
			}
			if(callback) callback(script);
		}, dbError);
	});
}

function removeScript(index){
	var id = ids.splice(index, 1)[0];
	db.transaction(function (t) {
		t.executeSql('DELETE FROM scripts WHERE id=?', [id], function(t, r) {delete metas[id];}, dbError);
	});
}

function str2RE(str) {
	return RegExp('^' + str.replace(/(\.|\?|\/)/g, '\\$1').replace(/\*/g, '.*?') + '$');
}

function autoReg(str) {
	if (/^\/.*\/$/.test(str))
		return RegExp(str.slice(1, -1));	// Regular-expression
	else
		return str2RE(str);	// String with wildcards
}

var match_reg = /(.*?):\/\/([^\/]*)\/(.*)/;
function matchTest(str, urlParts){
	if (str == '<all_urls>') return true;
	var parts = str.match(match_reg);
	return !!(parts &&
		// scheme
		(
			parts[1] == urlParts[1] ||	// exact match
			parts[1] == '*' && /^https?$/i.test(urlParts[1])	// * = http|https
		) &&
		// host
		(
			parts[2] == '*' ||	// * matches all
			parts[2] == urlParts[2] ||	// exact match
			/^\*\.[^*]*$/.test(parts[2]) && str2RE(parts[2]).test(urlParts[2])	// *.example.com
		) &&
		// pathname
		str2RE(parts[3]).test(urlParts[3])
	);
}

function testURL(url, script){
	var custom = script.custom;
	var meta = script.meta;
	var inc = [], exc = [], mat = [];
	var ok = true;
	if(custom._match !== false && meta.match) mat = mat.concat(meta.match);
	if(custom.match) mat = mat.concat(custom.match);
	if(custom._include !== false && meta.include) inc = inc.concat(meta.include);
	if(custom.include) inc = inc.concat(custom.include);
	if(custom._exclude !== false && meta.exclude) exc = exc.concat(meta.exclude);
	if(custom.exclude) exc = exc.concat(custom.exclude);
	// @match
	if(mat.length) {
		var urlParts = url.match(match_reg);
		mat.some(function(str) {
			return (ok = matchTest(str, urlParts));
		});
	}
	// @include
	else inc.some(function(str) {
		return (ok = autoReg(str).test(url));
	});
	// exclude
	if(ok) exc.some(function(str) {
		ok = ! autoReg(str).test(url);
		return ! ok;
	});
	return ok;
}

function getScript(data, metaonly) {
	var script = {
		id: data.id,
		uri: data.uri,
		meta: typeof data.meta == 'object' ? data.meta : JSON.parse(data.meta),
		custom: typeof data.custom == 'object' ? data.custom : JSON.parse(data.custom),
		enabled: data.enabled ? 1 : 0,
		update: data.update ? 1 : 0,
		position: data.position,
	};
	if (!metaonly) script.code = data.code;
	return script;
}

function getScripts(ids, metaonly, callback){
	var data=[];
	db.readTransaction(function(t){
		function getItem(){
			var id = ids.shift();
			if (id)
				t.executeSql('SELECT * FROM scripts WHERE id=?', [id], function(t, r) {
					if (r.rows.length)
						data.push(getScript(r.rows.item(0), metaonly));
					getItem();
				}, dbError);
			else if(callback) callback(data);
		}
		getItem();
	});
}

function initScripts(callback) {
	ids = [];
	metas = {};
	pos = 0;
	db.transaction(function(t) {
		function updatePos() {
			var item = updates.shift();
			if (item)
				t.executeSql('UPDATE scripts SET position=? WHERE id=?', item, updatePos, dbError);
		}
		var updates = [];
		t.executeSql('SELECT * FROM scripts ORDER BY position', [], function(t, r) {
			var script;
			for ( var i=0; i < r.rows.length; i ++ ) {
				var v = r.rows.item(i);
				script = getScript(v, true);
				if (script.position != ++ pos)
					updates.push([pos, script.id]);
				ids.push(script.id);
				metas[script.id] = script;
			}
			if(updates.length) {
				updatePos();
				console.log('update ' + updates.length);
			}
			if (callback) callback();
		}, dbError);
	});
}

function isRemote(url) {
	return url && !/^data:/.test(url);
}

function getData(callback) {
	var dict = {};
	for(var i in metas)
		if(isRemote(metas[i].meta.icon)) dict[metas[i].meta.icon] = 1;
	getCache(Object.getOwnPropertyNames(dict), function(data) {
		for(var i in data)
			data[i] = 'data:image/png;base64,' + window.btoa(data[i]);
		if(callback) callback(data);
	});
}

function editScript(id, callback) {
	db.readTransaction(function(t) {
		t.executeSql('SELECT * FROM scripts WHERE id=?', [id], function(t, r) {
			if(r.rows.length) callback(getScript(r.rows.item(0)));
		});
	});
}

function enableScript(id, enabled, callback) {
	var script = metas[id];
	if(!script) return;
	script.enabled = enabled ? 1 : 0;
	db.transaction(function(t){
		t.executeSql('UPDATE scripts SET enabled=? WHERE id=?', [script.enabled, id], function(t, r) {
			if(r.rowsAffected) {
				updateItem({id: id, code: 0});
				if(callback) callback();
			}
		},dbError);
	});
}

function getValues(uris, callback) {
	var data = {};
	db.readTransaction(function (t) {
		function loop() {
			var uri = uris.pop();
			if(uri)
				t.executeSql('SELECT data FROM "values" WHERE uri=?', [uri], function(t, r) {
					if(r.rows.length) data[uri] = JSON.parse(r.rows.item(0).data);
					loop();
				});
			else if(callback) callback(data);
		}
		loop();
	});
}

function getCache(uris, callback, t){
	var data = {};
	db.readTransaction(function (t) {
		function loop() {
			var uri = uris.pop();
			if(uri)
				t.executeSql('SELECT data FROM cache WHERE uri=?', [uri], function(t, r) {
					if(r.rows.length) data[uri] = r.rows.item(0).data;
					loop();
				});
			else if(callback) callback(data);
		}
		loop();
	});
}

function getInjected(e, url) {
	var data = {isApplied: getOption('isApplied')};
	var cache = {};
	var values = {};
	url = url || e.origin;	// to recognize `data:` URLs
	function finish() {
		e.source.postMessage({topic: 'GotInjected', data: data});
	}
	if(isRemote(url))
		getScripts(
			ids.filter(function(id){
				var script = metas[id];
				if (script && testURL(url, script)) {
					values[script.uri]=1;
					if(script.meta.require) script.meta.require.forEach(function (url) { cache[url] = 1; });
					for(var i in script.meta.resources) cache[script.meta.resources[i]] = 1;
					return true;
				}
				return false;
			}), false, function(scripts){
				data.scripts = scripts;
				getCache(Object.getOwnPropertyNames(cache), function(cache){
					data.cache = cache;
					getValues(Object.getOwnPropertyNames(values), function(values){
						data.values = values;
						finish();
					});
				});
			}
		);
	else finish();
}

function setValue(e, data) {
	db.transaction(function(t) {
		t.executeSql('REPLACE INTO "values"(uri,data) VALUES(?,?)', [data.uri, JSON.stringify(data.values)], null, dbError);
	});
}

function parseMeta(code) {
	// initialize meta, specify those with multiple values allowed
	var meta = {
		include: [],
		exclude: [],
		match: [],
		require: [],
		resource: [],
		grant: [],
	};
	var flag = -1;
	code.replace(/(?:^|\n)\/\/\s*([@=]\S+)(.*)/g, function(value, group1, group2) {
		if (flag < 0 && group1 == '==UserScript==')
			// start meta
			flag = 1;
		else if(flag > 0 && group1 == '==/UserScript==')
			// end meta
			flag = 0;
		if(flag == 1 && group1[0] == '@') {
			var key = group1.slice(1);
			var val = group2.replace(/^\s+|\s+$/g, '');
			var value = meta[key];
			if(value && value.push) value.push(val);	// multiple values allowed
			else if(!(key in meta)) meta[key] = val;	// only first value will be stored
		}
	});
	meta.resources = {};
	meta.resource.forEach(function(line) {
		var pair = line.match(/^(\w\S*)\s+(.*)/);
		if(pair) meta.resources[pair[1]] = pair[2];
	});
	delete meta.resource;
	// @homepageURL: compatible with @homepage
	if(! meta.homepageURL && meta.homepage) meta.homepageURL = meta.homepage;
	return meta;
}

function fetchURL(url, cb, type, headers) {
	var req = new XMLHttpRequest();
	req.open('GET', url, true);
	if (type) req.responseType = type;
	if (headers) for(var i in headers)
		req.setRequestHeader(i, headers[i]);
	if (cb) req.onloadend = cb;
	req.send();
}

function saveCache(url, data) {
	db.transaction(function(t) {
		t.executeSql('REPLACE INTO cache(uri,data) VALUES(?,?)', [url, data], null, dbError);
	});
}

var _cache = {};
function fetchCache(url) {
	if (_cache[url]) return;
	_cache[url] = 1;
	fetchURL(url, function(){
		if (this.status != 200) return;
		var r = new FileReader();
		r.onload = function(e) {
			saveCache(url, e.target.result);
			delete _cache[url];
		};
		r.readAsBinaryString(this.response);
	}, 'blob');
}

function queryScript(id, meta, callback) {
	db.readTransaction(function(t) {
		function queryMeta() {
			var uri = getNameURI({id: '', meta: meta});
			if (uri == '::') callback(newScript());
			else t.executeSql('SELECT * FROM scripts WHERE uri=?', [uri], function(t, r) {
				if(r.rows.length) callback(getScript(r.rows.item(0)));
				else callback(newScript());
			});
		}
		function queryId() {
			t.executeSql('SELECT * FROM scripts WHERE id=?', [id], function(t, r) {
				if(r.rows.length) callback(getScript(r.rows.item(0)));
				else queryMeta();
			});
		}
		queryId();
	});
}

function parseScript(data, callback){
	function finish(){
		updateItem(ret);
		if(callback) callback(ret);
	}
	var ret = {
		code: 0,
		message: 'message' in data ? data.message : _('msgUpdated'),
	};
	if (data.status && data.status != 200 || ! data.code) {
		ret.code = -1;
		ret.message = _('msgErrorFetchingScript');
		return finish();
	}
	var meta = parseMeta(data.code);
	queryScript(data.id, meta, function(script) {
		if (!script.id) {
			ret.code = 1;
			ret.message = _('msgInstalled');
		}
		if (data.more)	// for import and user edit
			for(var i in data.more)
				if(i in script) script[i] = data.more[i];
		script.meta = meta;
		script.code = data.code;
		script.uri = getNameURI(script);
		// use referer page as default homepage
		if (! script.meta.homepageURL && ! script.custom.homepageURL && ! /^(file|data):/.test(data.from))
			script.custom.homepageURL = data.from;
		// store last install URL
		if(data.url && ! /^(file|data):/.test(data.url))
			script.custom.lastInstallURL = data.url;
		saveScript(script, function() {
			ret.id = script.id;
			if(!meta.grant.length) ret.warnGrant = meta.name;
			finish();
		});
	});
	function getCache(url) {
		// check if cache is already fetched
		var cache = data.cache && data.cache[url];
		if(cache) saveCache(url, cache);
		else fetchCache(url);
	}
	// fetch cache asynchronously
	meta.require.forEach(getCache);
	for (var i in meta.resources) getCache(meta.resources[i]);
	if (isRemote(meta.icon)) fetchCache(meta.icon);	// @icon
}

function installScript(e, data) {
	var qs = [];
	for(var i in data) qs.push(i + '=' + encodeURIComponent(data[i]));
	opera.extension.tabs.create({url: '/options.html?' + qs.join('&')}).focus();
}

function move(idxFrom, idxTo) {
	if (idxFrom == idxTo) return;
	var step = idxTo > idxFrom ? 1 : -1;
	var x = ids[idxFrom];
	var script;
	var updates = [];
	for ( var i = idxFrom; i != idxTo; i += step ) {
		script = metas[ids[i] = ids[i + step]];
		updates.push([script.position = i + 1, script.id]);
	}
	script = metas[ids[idxTo] = x];
	updates.push([script.position = idxTo + 1, script.id]);
	db.transaction(function(t) {
		function updatePos() {
			var item = updates.shift();
			if (item)
				t.executeSql('UPDATE scripts SET position=? WHERE id=?', item, updatePos, dbError);
		}
		updatePos();
	});
}

function vacuum(callback){
	var cache={},values={},count=0;
	function vacuumPosition(){
		function update(o){
			db.transaction(function(t){
				function loop(){
					var i=o.shift();
					if(i) t.executeSql('UPDATE scripts SET position=? WHERE id=?',i,loop,dbError);
				}
				loop();
			});
		}
		var i,j,o,s=[];
		for(i=0;i<ids.length;i++) {
			o=metas[ids[i]];
			values[o.uri]=1;
			if(isRemote(o.meta.icon)) cache[o.meta.icon]=1;
			if(o.meta.require) o.meta.require.forEach(function(i){cache[i]=1;});
			for(j in o.meta.resources) cache[o.meta.resources[j]]=1;
			if(o.position!=i+1) s.push([i+1,o.id]);
		}
		update(s);
		pos=i;
		vacuumDB('cache',cache);
		vacuumDB('values',values);
	}
	function vacuumDB(n,d){
		function del(o){
			db.transaction(function(t){
				function loop(){
					var i=o.shift(),s='DELETE FROM "'+n+'" WHERE ';
					if(i) {
						if(i[0]) s+='uri=?'; else {s+='IFNULL(uri,0)=0';i.shift();}
						t.executeSql(s,i,loop,dbError);
					}
				}
				loop();
			});
		}
		count++;
		db.readTransaction(function(t){
			t.executeSql('SELECT * FROM "'+n+'"',[],function(t,r){
				var o,s=[];
				for(i=0;i<r.rows.length;i++) {
					o=r.rows.item(i);
					if(!d[o.uri]) s.push([o.uri]);
					else d[o.uri]++;	// stored
				}
				del(s);
				if(!--count) finish();
			},dbError);
		});
	}
	function finish(){
		for(var i in cache) if(cache[i]==1) fetchCache(i);
		if(callback) callback();
	}
	vacuumPosition();
}

var _update={};
function checkUpdateO(o){
	if(_update[o.id]) return;_update[o.id]=1;
	function finish(){delete _update[o.id];}
	var r={id:o.id,updating:1,code:2};
	function update(){
		if(du) {
			r.message=_('msgUpdating');
			fetchURL(du,function(){
				parseScript({id:o.id,status:this.status,code:this.responseText});
			});
		} else r.message='<span class=new>'+_('msgNewVersion')+'</span>';
		updateItem(r);finish();
	}
	var du=o.custom.downloadURL||o.meta.downloadURL||o.custom.lastInstallURL,
			u=o.custom.updateURL||o.meta.updateURL||du;
	if(u) {
		r.message=_('msgCheckingForUpdate');updateItem(r);
		fetchURL(u,function(){
			r.message=_('msgErrorFetchingUpdateInfo');
			if(this.status==200) try{
				var m=parseMeta(this.responseText);
				if(compareVersion(o.meta.version,m.version)<0) return update();
				r.message=_('msgNoUpdate');
			}catch(e){}
			delete r.updating;
			updateItem(r);finish();
		},null,{Accept:'text/x-userscript-meta'});
	} else finish();
}
function checkUpdate(id){
	checkUpdateO(metas[id]);
}
function checkUpdateAll(){
	setOption('lastUpdate',Date.now());
	ids.forEach(function(i){
		var o=metas[i];
		if(o.update) checkUpdateO(o);
	});
}

// Requests
var requests={};
function getRequestId(e){
	var id=Date.now()+'.'+Math.random().toString().slice(1);
	requests[id]=new XMLHttpRequest();
	e.source.postMessage({topic:'GotRequestId',data:id});
}
function httpRequest(e,details){
	function callback(evt){
		function finish(){
			e.source.postMessage({
				topic:'HttpRequested',
				data:{
					id:details.id,
					type:evt.type,
					resType:req.responseType,
					data:data
				}
			});
		}
		var data={
			readyState:req.readyState,
			responseHeaders:req.getAllResponseHeaders(),
			status:req.status,
			statusText:req.statusText,
		},r;
		try {
			data.responseText=req.responseText;
		} catch(e) {}
		if(req.response&&req.responseType=='blob') {
			r=new FileReader();
			r.onload=function(e){
				data.response=r.result;
				finish();
			};
			r.readAsDataURL(req.response);
		} else {	// default `null` for blob and '' for text
			data.response=req.response;
			finish();
		}
	}
	var i,req;
	if(details.id) req=requests[details.id];
	else req=new XMLHttpRequest();
	try{
		req.open(details.method,details.url,details.async,details.user,details.password);
		if(details.headers) for(i in details.headers) req.setRequestHeader(i,details.headers[i]);
		if(details.responseType) req.responseType='blob';
		if(details.overrideMimeType) req.overrideMimeType(details.overrideMimeType);
		['abort','error','load','progress','readystatechange','timeout'].forEach(function(i){req['on'+i]=callback;});
		req.send(details.data);
		if(!details.id) callback({type:'load'});
	}catch(e){opera.postError(e);}
}
function abortRequest(e,id){
	var req=requests[id];
	if(req) req.abort();
	delete requests[id];
}

function showButton(show){
	if(show) opera.contexts.toolbar.addItem(button);
	else opera.contexts.toolbar.removeItem(button);
}
function updateIcon() {button.icon='images/icon18'+(getOption('isApplied')?'':'w')+'.png';}
function updateItem(r){	// update loaded options pages
	for(var i=0;i<_updateItem.length;)
		try{
			_updateItem[i](r);
			i++;
		}catch(e){
			_updateItem.splice(i,1);
		}
}
function initIcon(){
	button=opera.contexts.toolbar.createItem({
		title:_('extName'),
		popup:{
			href:"menu.html",
			width:222,
			height:100,
		},
		badge:{
			backgroundColor:'#808',
			color:'white',
			display:'none',
		},
	});
	updateIcon();
	showButton(getOption('showButton'));
}
function autoCheck(o){
	// check for updates automatically in 20 seconds
	function check(){
		if(getOption('autoUpdate')) {
			if(Date.now()-getOption('lastUpdate')>=864e5) checkUpdateAll();
			setTimeout(check,36e5);
		} else checking=false;
	}
	if(!checking) {checking=true;setTimeout(check,o||0);}
}
function clearPopupTimer(){
	if(popupTimer) {
		clearTimeout(popupTimer);
		popupTimer=null;
	}
}
function clearBadge(){
	button.badge.display='none';
	clearPopupTimer();
}
function showBadge(){
	var n=tabData&&tabData.ids&&tabData.ids.length;
	if(n&&getOption('showBadge')) {
		button.badge.textContent=n>99?'99+':n;
		button.badge.display='block';
		clearPopupTimer();
	} else clearBadge();
}
function getTabData(){
	// send a command to refresh badge
	try{
		opera.extension.tabs.getFocused().postMessage({topic:'GetTabData'});
		clearPopupTimer();
		popupTimer=setTimeout(clearBadge,200);
	}catch(e){
		clearBadge();
	}
}
function gotTabData(e,data){
	// refresh badge with data
	tabData=data;
	showBadge();
}
var db,button,checking=false,_updateItem=[],ids=null,metas,pos,
		maps={
			GetInjected:getInjected,
			InstallScript:installScript,
			GetRequestId:getRequestId,
			HttpRequest:httpRequest,
			AbortRequest:abortRequest,
			SetValue:setValue,
			GotTabData:gotTabData,
			GetTabData:getTabData,
		},tabData=null,popupTimer=null;
if(parseInt(opera.version())<12)	// Check old version of Opera
	opera.extension.tabs.create({url:'https://github.com/gera2ld/Violentmonkey-oex/wiki/Obsolete'});
else {
	initMessages();
	initIcon();
	initDatabase(function(){
		upgradeData(function(){
			initScripts(function(){
				opera.extension.onmessage=function(e){
					var m=e.data,c=maps[m.topic];
					if(c) try{c(e,m.data);}catch(e){opera.postError(e);}
				};
				if(getOption('autoUpdate')) autoCheck(2e4);
				opera.extension.tabs.onfocus=function(e){
					tabData=null;getTabData();
				};
			});
		});
	});
}
