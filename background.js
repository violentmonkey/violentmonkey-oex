// Multilingual
function initMessages(callback){
	var data={};
	function init(d) {
		var i,j=JSON.parse(d);
		for(i in j) data[i]=j[i];
		if(callback) callback();
	}

	var f=new XMLHttpRequest();
	f.open('GET','messages.json',true);
	f.onload=function(){init(f.responseText);};
	f.send();

	/* opera.extension.getFile is useless
	 * XMLHttpRequest works better on old versions of Opera
	 *
	 * var f=opera.extension.getFile('messages.json');
	 * if(f) {
	 * 	var r=new FileReader();
	 * 	r.onload=function(){init(r.result);}
	 * 	r.readAsText(f);
	 * }
	 */

	_=function(k,a){
		var r=data[k];if(r) r=r.message;
		if(r) return r.replace(/\$(?:\{(\d+)\}|(\d+))/g,function(v,g1,g2){v=g1||g2;return a[v-1]||'';});
		else return '';
	};
}

// Database
/* ===============Data format 0.5==================
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
function older(o,n){
	o=(o||'').split('.');n=(n||'').split('.');
	var r=/(\d*)([a-z]*)(\d*)([a-z]*)/i;
	while(o.length&&n.length) {
		var vo=o.shift().match(r),vn=n.shift().match(r);
		vo.shift();vn.shift();	// origin string
		vo[0]=parseInt(vo[0]||0,10);
		vo[2]=parseInt(vo[2]||0,10);
		vn[0]=parseInt(vn[0]||0,10);
		vn[2]=parseInt(vn[2]||0,10);
		while(vo.length&&vn.length) {
			var eo=vo.shift(),en=vn.shift();
			if(eo!=en) return eo<en;
		}
	}
	return n.length;
}
function dbError(t,e){
	opera.postError('Database error: '+e.message);
	if(e.code==4)
		opera.extension.tabs.create({url:'/notice_quota.html'}).focus();
}
function initDatabase(callback){
	db=openDatabase('Violentmonkey','0.5','Violentmonkey data',10*1024*1024);
	db.transaction(function(t){
		function executeSql(_t,r){
			var s=sql.shift();
			if(s) t.executeSql(s,[],executeSql,dbError);
			else if(callback) callback();
		}
		var count=0,sql=[
			'CREATE TABLE IF NOT EXISTS scripts(id INTEGER PRIMARY KEY,uri VARCHAR,meta TEXT,custom TEXT,enabled INTEGER,"update" INTEGER,position INTEGER,code TEXT)',
			'CREATE TABLE IF NOT EXISTS cache(uri VARCHAR UNIQUE NOT NULL,data BLOB)',
			'CREATE TABLE IF NOT EXISTS "values"(uri VARCHAR UNIQUE NOT NULL,data TEXT)',
		];
		executeSql();
	});
}
function upgradeData(callback){
	function finish(){
		if(--count<=0) {if(callback) callback();}
	}
	function upgradeDB(n,d){
		count++;
		db.transaction(function(t){
			function loop(){
				var i=d.pop();
				if(i) t.executeSql('REPLACE INTO "'+n+'"(uri,data) VALUES(?,?)',i,loop,dbError);
				else finish();
			}
			loop();
		});
	}
	var i,j,k,l,o,cache=[],val={},values=[],count=0;
	if(older(widget.preferences.version_storage||'','0.5')) {
		var ids=localStorage.ids||'';
		try{
			ids=JSON.parse(ids);
		}catch(e){
			ids=[];
		}
		pos=localStorage.length-1;	// put scripts without `position` in the end
		for(i=0;k=widget.preferences.key(i);) {
			v=widget.preferences.getItem(k);
			if(/^cache:/.test(k)) cache.push([k.slice(6),v]);
			else if(/^val:/.test(k)) {
				l=k.slice(4);j=0;
				j=l.slice(j+1).indexOf(':');
				j=l.slice(j+1).indexOf(':');
				j=l.slice(j+1).indexOf(':');
				o=l.slice(j+1);l=l.slice(0,j);
				j=val[l];if(!j) val[l]=j={};j[o]=v;
			} else if(/^vm:/.test(k)) {
				o=JSON.parse(v);
				if(!o.uri) o.uri=getNameURI(o);
				o.position=ids.indexOf(o.id)+1;
				delete o.id;saveScript(o);
			} else if(k in settings) {i++;continue;}
			widget.preferences.removeItem(k);
		}
		for(i in val) values.push([i,JSON.stringify(val[i])]);
		widget.preferences.version_storage='0.5';
		upgradeDB('cache',cache);
		upgradeDB('values',values);
		if(getOption('search','').indexOf('*')<0) setOption('search',_('defaultSearch'));
	} else finish();
}

function getNameURI(i){
	var ns=i.meta.namespace||'',n=i.meta.name||'',k=escape(ns)+':'+escape(n)+':';
	if(!ns&&!n) k+=i.id;return k;
}

function newScript(){
	var r={
		custom:{},
		enabled:1,
		update:1,
		code:'// ==UserScript==\n// @name New Script\n// ==/UserScript==\n'
	};
	r.meta=parseMeta(r.code);
	return r;
}
function saveScript(o,callback){
	if(!o.position) o.position=++pos;
	db.transaction(function(t){
		var d=[];
		d.push(parseInt(o.id)||null);
		d.push(o.uri);
		d.push(JSON.stringify(o.meta));
		d.push(JSON.stringify(o.custom));
		d.push(o.enabled=o.enabled?1:0);
		d.push(o.update=o.update?1:0);
		d.push(o.position);
		d.push(o.code);
		t.executeSql('REPLACE INTO scripts(id,uri,meta,custom,enabled,"update",position,code) VALUES(?,?,?,?,?,?,?,?)',d,function(t,r){
			if(!o.id) o.id=r.insertId;
			if(ids) {
				if(!(o.id in metas)) ids.push(o.id);
				metas[o.id]=getScript(o,true);
			}
			if(callback) callback(o);
		},dbError);
	});
}
function removeScript(i){
	var id=ids.splice(i,1)[0];
	db.transaction(function(t){
		t.executeSql('DELETE FROM scripts WHERE id=?',[id],function(t,r){delete metas[id];},dbError);
	});
}

function str2RE(s){return s.replace(/(\.|\?|\/)/g,'\\$1').replace(/\*/g,'.*?');}
function autoReg(s,w){	// w: forced wildcard mode
	if(!w&&s[0]=='/'&&s.slice(-1)=='/') return RegExp(s.slice(1,-1));	// Regular-expression
	return RegExp('^'+str2RE(s)+'$');	// String with wildcards
}
var match_reg=/(.*?):\/\/([^\/]*)\/(.*)/;
function matchTest(s,u){
	var m=s.match(match_reg);
	if(!m) return false;
	// scheme
	if(m[1]=='*') {if(u[1]!='http'&&u[1]!='https') return false;}	// * = http|https
	else if(m[1]!=u[1]) return false;
	// host
	if(m[2]!='*') {
		if(m[2].slice(0,2)=='*.') {
			if(u[2]!=m[2].slice(2)&&u[2].slice(1-m[2].length)!=m[2].slice(1)) return false;
		} else if(m[2]!=u[2]) return false;
	}
	// pathname
	if(!autoReg(m[3],1).test(u[3])) return false;
	return true;
}
function testURL(url,e){
	var f=true,i,inc=[],exc=[],mat=[],u=url.match(match_reg);
	if(e.custom._match!=false&&e.meta.match) mat=mat.concat(e.meta.match);
	if(e.custom.match) mat=mat.concat(e.custom.match);
	if(e.custom._include!=false&&e.meta.include) inc=inc.concat(e.meta.include);
	if(e.custom.include) inc=inc.concat(e.custom.include);
	if(e.custom._exclude!=false&&e.meta.exclude) exc=exc.concat(e.meta.exclude);
	if(e.custom.exclude) exc=exc.concat(e.custom.exclude);
	if(mat.length) {for(i=0;i<mat.length;i++) if(f=matchTest(mat[i],u)) break;}	// @match
	else for(i=0;i<inc.length;i++) if(f=autoReg(inc[i]).test(url)) break;	// @include
	if(f) for(i=0;i<exc.length;i++) if(!(f=!autoReg(exc[i]).test(url))) break;	// @exclude
	return f;
}
function getScript(v,metaonly){
	var o={
		id:v.id,
		uri:v.uri,
		meta:typeof v.meta=='object'?v.meta:JSON.parse(v.meta),
		custom:typeof v.custom=='object'?v.custom:JSON.parse(v.custom),
		enabled:v.enabled?1:0,
		update:v.update?1:0,
		position:v.position
	};
	if(!metaonly) o.code=v.code;
	return o;
}
function getScripts(ids,metaonly,callback){
	var data=[];
	db.readTransaction(function(t){
		function getItem(){
			var i=ids.shift();
			if(i) t.executeSql('SELECT * FROM scripts WHERE id=?',[i],function(t,r){
				if(r.rows.length) data.push(getScript(r.rows.item(0),metaonly));
				getItem();
			},dbError); else if(callback) callback(data);
		}
		getItem();
	});
}
function initScripts(callback){
	ids=[];metas={};
	db.readTransaction(function(t){
		t.executeSql('SELECT * FROM scripts ORDER BY position',[],function(t,r){
			var i,v,o=null;
			for(i=0;i<r.rows.length;i++) {
				v=r.rows.item(i);
				o=getScript(v,true);
				ids.push(o.id);metas[o.id]=o;
			}
			pos=o?o.position:0;
			if(callback) callback();
		});
	});
}
function getData(callback){
	var cache={};
	for(i in metas) if(metas[i].meta.icon) cache[metas[i].meta.icon]=1;
	getCache(Object.getOwnPropertyNames(cache),function(o){
		if(callback) callback(o);
	});
}
function editScript(id,callback){
	db.readTransaction(function(t){
		t.executeSql('SELECT * FROM scripts WHERE id=?',[id],function(t,r){
			if(r.rows.length) callback(getScript(r.rows.item(0)));
		});
	});
}
function enableScript(id,v,callback){
	var s=metas[id];if(!s) return;
	s.enabled=v?1:0;
	db.transaction(function(t){
		t.executeSql('UPDATE scripts SET enabled=? WHERE id=?',[s.enabled,id],function(t,r){
			if(r.rowsAffected) {
				updateItem({id:id,status:0});
				if(callback) callback();
			}
		},dbError);
	});
}
function getValues(uris,callback,t){
	var data={};
	function query(t){
		function loop(){
			var i=uris.pop();
			if(i) t.executeSql('SELECT data FROM "values" WHERE uri=?',[i],function(t,r){
				if(r.rows.length) data[i]=JSON.parse(r.rows.item(0).data);
				loop();
			}); else if(callback) callback(data);
		}
		loop();
	}
	if(t) query(t); else db.readTransaction(query);
}
function getCache(uris,callback,t){
	var data={};
	function query(t){
		function loop(){
			var i=uris.pop();
			if(i) t.executeSql('SELECT data FROM cache WHERE uri=?',[i],function(t,r){
				if(r.rows.length) data[i]=r.rows.item(0).data;
				loop();
			}); else if(callback) callback(data);
		}
		loop();
	}
	if(t) query(t); else db.readTransaction(query);
}
function getInjected(e,url){
	var data={isApplied:settings.isApplied},cache={},values={};
	url=url||e.origin;	// to recognize URLs like data:...
	function finish(){e.source.postMessage({topic:'GotInjected',data:data});}
	if(url.slice(0,5)!='data:') {
		function addCache(i){cache[i]=1;}
		getScripts(
			ids.filter(function(i){
				var j,s=metas[i];
				if(s&&testURL(url,s)) {
					values[s.uri]=1;
					if(s.meta.require) s.meta.require.forEach(addCache);
					for(j in s.meta.resources) addCache(s.meta.resources[j]);
					return true;
				}
				return false;
			}),false,function(o){
				data.scripts=o;
				getCache(Object.getOwnPropertyNames(cache),function(o){
					data.cache=o;
					getValues(Object.getOwnPropertyNames(values),function(o){
						data.values=o;
						finish();
					});
				});
			}
		);
	} else finish();
}
function setValue(e,d){
	db.transaction(function(t){
		t.executeSql('REPLACE INTO "values"(uri,data) VALUES(?,?)',[d.uri,JSON.stringify(d.data)],null,dbError);
	});
}
function parseMeta(d){
	var o=-1,meta={include:[],exclude:[],match:[],require:[],resources:{}};
	meta.resource=[];
	d.replace(/(?:^|\n)\/\/\s*([@=]\S+)(.*)/g,function(m,k,v){
		if(o<0&&k=='==UserScript==') o=1;
		else if(k=='==/UserScript==') o=0;
		if(o==1&&k[0]=='@') k=k.slice(1); else return;
		v=v.replace(/^\s+|\s+$/g,'');
		if(meta[k]&&meta[k].push) meta[k].push(v);	// multiple values allowed
		else if(!(k in meta)) meta[k]=v;	// only first value will be stored
	});
	meta.resource.forEach(function(i){
		o=i.match(/^(\w+)\s+(.*)/);
		if(o) meta.resources[o[1]]=o[2];
	});
	delete meta.resource;
	return meta;
}
function fetchURL(url,cb,type){
	var req=new XMLHttpRequest();
	req.open('GET',url,true);
	if(type) req.responseType=type;
	if(cb) req.onloadend=cb;
	req.send();
}
var _cache={};
function fetchCache(url){
	if(_cache[url]) return;
	_cache[url]=1;
	fetchURL(url,function(){
		if(this.status!=200) return;
		var r=new FileReader();
		r.onload=function(e){
			db.transaction(function(t){
				t.executeSql('REPLACE INTO cache(uri,data) VALUES(?,?)',[url,e.target.result],function(t,r){
					delete _cache[url];
				},dbError);
			});
		};
		r.readAsBinaryString(this.response);
	},'blob');
}

function queryScript(id,meta,callback){
	db.readTransaction(function(t){
		function queryMeta() {
			var uri=getNameURI({id:'',meta:meta});
			if(uri=='::') callback(newScript());
			else t.executeSql('SELECT * FROM scripts WHERE uri=?',[uri],function(t,r){
				if(callback) {
					if(r.rows.length) callback(getScript(r.rows.item(0)));
					else callback(newScript());
				}
			});
		}
		function queryId() {
			t.executeSql('SELECT * FROM scripts WHERE id=?',[id],function(t,r){
				if(r.rows.length) {
					if(callback) callback(getScript(r.rows.item(0)));
				} else queryMeta();
			});
		}
		queryId();
	});
}
function parseScript(e,d,callback){
	function finish(){
		if(e) e.source.postMessage({topic:'ShowMessage',data:r.message});
		updateItem(r);if(callback) callback();
	}
	var i,r={status:0,message:'message' in d?d.message:_('msgUpdated')};
	if(d.status&&d.status!=200||!d.code) {
		r.status=-1;r.message=_('msgErrorFetchingScript');
		finish();
	} else {
		var meta=parseMeta(d.code);
		queryScript(d.id,meta,function(c){
			if(!c.id){r.status=1;r.message=_('msgInstalled');}
			if(d.more) for(i in d.more) if(i in c) c[i]=d.more[i];	// for import and user edit
			c.meta=meta;c.code=d.code;c.uri=getNameURI(c);
			if(e&&!c.meta.homepage&&!c.custom.homepage&&!/^(file|data):/.test(e.origin)) c.custom.homepage=e.origin;
			if(!c.meta.downloadURL&&!c.custom.downloadURL&&d.url) c.custom.downloadURL=d.url;
			saveScript(c,function(){
				r.id=c.id;finish();
			});
		});
		meta.require.forEach(fetchCache);	// @require
		for(i in meta.resources) fetchCache(meta.resources[i]);	// @resource
		if(meta.icon) fetchCache(meta.icon);	// @icon
	}
}
function installScript(e,url){
	if(!url)
		e.source.postMessage({topic:'ConfirmInstall',data:_('msgConfirm')});
	else fetchURL(url,function(){
		parseScript(e,{status:this.status,code:this.responseText,url:url});
	});
}
function move(s,d){
	function update(o){
		db.transaction(function(t){
			function loop(){
				var i=o.shift();
				if(i) t.executeSql('UPDATE scripts SET position=? WHERE id=?',i,loop,dbError);
			}
			loop();
		});
	}
	// update ids
	var g=d>s?1:-1,x=ids[s],i,u=[],o1,o2;
	for(i=s;i!=d;i+=g) ids[i]=ids[i+g];ids[d]=x;
	x=metas[x].position;o1=metas[ids[d]];
	for(i=d;i!=s;i-=g) {
		o2=metas[ids[i-g]];
		o1.position=o2.position;
		u.push([o1.position,o1.id]);
		o1=o2;
	}
	o1.position=x;
	u.push([o1.position,o1.id]);
	update(u);
}
function vacuum(callback){
	var cache={},values={},count=0;
	function addCache(i){cache[i]=1;}
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
			if(o.meta.icon) addCache(o.meta.icon);
			if(o.meta.require) o.meta.require.forEach(addCache);
			for(j in o.meta.resources) addCache(o.meta.resources[j]);
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
	var r={id:o.id,hideUpdate:1,status:2};
	function update(){
		var u=o.custom.downloadURL||o.meta.downloadURL;
		if(u) {
			r.message=_('msgUpdating');
			fetchURL(u,function(){
				parseScript(null,{id:o.id,status:this.status,code:this.responseText});
			});
		} else r.message='<span class=new>'+_('msgNewVersion')+'</span>';
		updateItem(r);finish();
	}
	var u=o.custom.updateURL||o.meta.updateURL;
	if(u) {
		r.message=_('msgCheckingForUpdate');updateItem(r);
		fetchURL(u,function(){
			r.message=_('msgErrorFetchingUpdateInfo');
			if(this.status==200) try{
				var m=parseMeta(this.responseText);
				if(older(o.meta.version,m.version)) return update();
				r.message=_('msgNoUpdate');
			}catch(e){}
			delete r.hideUpdate;
			updateItem(r);finish();
		});
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
		var d={
			topic:'HttpRequested',
			data:{
				id:details.id,
				type:evt.type,
				data:{
					readyState:req.readyState,
					responseHeaders:req.getAllResponseHeaders(),
					responseText:req.responseText,
					status:req.status,
					statusText:req.statusText,
				}
			}
		};
		e.source.postMessage(d);
	}
	var i,req;
	if(details.id) req=requests[details.id];
	else req=new XMLHttpRequest();
	try{
		req.open(details.method,details.url,details.async,details.user,details.password);
		if(details.headers) for(i in details.headers) req.setRequestHeader(i,details.headers[i]);
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

function getOption(k,def){
	var v=widget.preferences.getItem(k)||'';
	try{
		v=JSON.parse(v);
	}catch(e){
		v=def;
		if(v!=undefined) return setOption(k,v);
	}
	settings[k]=v;
	return v;
}
function setOption(k,v){
	widget.preferences.setItem(k,JSON.stringify(v));
	settings[k]=v;
	return v;
}
function initSettings(){
	getOption('isApplied',true);
	getOption('autoUpdate',true);
	getOption('lastUpdate',0);
	getOption('showDetails',false);
	getOption('showButton',true);
	getOption('withData',true);
	getOption('search',_('defaultSearch'));
}
function showButton(show){
	if(show) opera.contexts.toolbar.addItem(button);
	else opera.contexts.toolbar.removeItem(button);
}
function updateIcon() {button.icon='images/icon18'+(settings.isApplied?'':'w')+'.png';}
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
			height:100
		}
	});
	updateIcon();
	showButton(settings.showButton);
}
function autoCheck(o){	// check for updates automatically in 20 seconds
	function check(){
		if(settings.autoUpdate) {
			if(Date.now()-settings.lastUpdate>=864e5) checkUpdateAll();
			setTimeout(check,36e5);
		} else checking=false;
	}
	if(!checking) {checking=true;setTimeout(check,o||0);}
}
var db,_,button,checking=false,settings={},_updateItem=[],ids=null,metas,pos,
		maps={
			GetInjected:getInjected,
			InstallScript:installScript,
			ParseScript:parseScript,
			GetRequestId:getRequestId,
			HttpRequest:httpRequest,
			AbortRequest:abortRequest,
			SetValue:setValue,
		};
if(parseInt(opera.version())<12)	// Check old version of Opera
	opera.extension.tabs.create({url:'https://github.com/gera2ld/Violentmonkey-oex/wiki/Obsolete'});
else initMessages(function(){
	initSettings();
	initIcon();
	initDatabase(function(){
		upgradeData(function(){
			initScripts(function(){
				opera.extension.onmessage=function(e){
					var m=e.data,c=maps[m.topic];
					if(c) try{c(e,m.data);}catch(e){opera.postError(e);}
				};
				if(settings.autoUpdate) autoCheck(2e4);
			});
		});
	});
});
