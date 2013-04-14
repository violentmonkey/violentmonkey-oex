function getString(key,def){
	var v=widget.preferences.getItem(key);
	if(v==null) (v=def)&&widget.preferences.setItem(key,v);
	return v;
}
function setString(key,val){widget.preferences.setItem(key,val||'');}
function getItem(key,def){
	var v=widget.preferences.getItem(key);
	if(v==null&&def) return setItem(key,def);
	try{return JSON.parse(v);}catch(e){return def;}
}
function setItem(key,val){
	widget.preferences.setItem(key,JSON.stringify(val));
	return val;
}
function getNameURI(i){
	var ns=i.meta.namespace||'',n=i.meta.name||'',k=escape(ns)+':'+escape(n)+':';
	if(!ns&&!n) k+=i.id;return k;
}

// Multilingual
var i18nMessages={};
function loadMessages(locale){
	var filename='messages.json';
	if(locale) filename='locales/'+locale+'/'+filename;
	var req=new XMLHttpRequest();
	req.open('GET',filename,false);
	req.send();
	var j=JSON.parse(req.responseText);
	for(var i in j) i18nMessages[i]=j[i];
}
function getI18nString(s) {return i18nMessages[s]||s;}
var _=getI18nString;
try{loadMessages();}catch(e){opera.postError(e);}
function format(){
	var a=arguments;
	if(a[0]) return a[0].replace(/\$(?:\{(\d+)\}|(\d+))/g,function(v,g1,g2){g1=a[g1||g2];if(g1==undefined) g1=v;return g1;});
}

// Check old version of Opera
(function(v){
	v=parseInt(v);
	if(v<12) {
		opera.extension.tabs.create({url:'oldversion.html'});
		null[0];	// to stop running
	}
})(opera.version());

/* ===============Data format 0.4==================
 * ids	List [id]
 * vm:id	Item	{
 * 			id:	Random
 * 			custom:	List-Dict	// Custom meta data
 * 			meta:	List-Dict
 *			enabled:	Boolean
 *			update:	Boolean
 *			code:	String
 *	 	}
 * val:nameURI:key	TypeString
 * cache:url	BinaryString
 */

(function(){	// upgrade data
	var version=getItem('version_storage',0),scripts=getItem('scripts');
	if(version<0.4) {
		var i,cache=getItem('cache');
		for(i=0;i<widget.preferences.length;i++) {
			var k=widget.preferences.key(i),m=k.match(/^scriptVals:([^:]*):([^:]*):(.*)/);
			if(!m) continue;
			var v=JSON.parse(widget.preferences.getItem(k));
			if(typeof v=='boolean') v='b'+v;
			else if(typeof v=='number') v='n'+v;
			else v='s'+v;
			widget.preferences.removeItem(k);
			widget.preferences.setItem('val:'+m[2]+':'+m[1]+':'+m[3],v);
		}
		var s=getItem('search'),_s=[];if(s) setString('search',s);
		widget.preferences.removeItem('scripts');
		scripts&&scripts.forEach(function(i){_s.push(i.id);setItem('vm:'+i.id,i);});
		setItem('ids',_s);
		widget.preferences.removeItem('cache');
		if(cache) for(i in cache) setString('cache:'+i,cache[i]);
		setItem('version_storage',0.4);
	}
})();
var ids=getItem('ids',[]),map={};
ids.forEach(function(i){map[i]=getItem('vm:'+i);});
function vacuum(callback){
	setTimeout(function(){
		var k,s,i,ns={},cc={};
		ids.forEach(function(i){
			k=map[i];if(!k) return;
			ns[getNameURI(k)]=1;
			if(k.meta.icon) cc[k.meta.icon]=1;
			if(k.meta.require) k.meta.require.forEach(function(i){cc[i]=1;});
			if(k.meta.resources) for(i in k.meta.resources) cc[i]=1;
		});
		for(i in cc) if(widget.preferences.getItem('cache:'+i)==null) fetchCache(i);
		for(i=0;i<widget.preferences.length;) {
			k=widget.preferences.key(i);
			if((s=k.match(/^val:([^:]*:[^:]*:[^:]*)/))&&!ns[s[1]]) widget.preferences.removeItem(k);
			else if((s=k.match(/^cache:(.*)/))&&!cc[s[1]]) widget.preferences.removeItem(k);
			else i++;
		}
		generateIDs();
		if(callback) callback();
	},0);
}

function newMeta(){return {name:'New Script',namespace:'',version:''};}
function newScript(save){
	var r={
		custom:{},
		meta:newMeta(),
		enabled:1,
		update:1,
		code:'// ==UserScript==\n// @name New Script\n// ==/UserScript==\n'
	};
	r.id=Date.now()+Math.random().toString().substr(1);
	if(save) saveScript(r);
	return r;
}
function generateIDs(){
	var _ids=[],_map={};
	ids.forEach(function(i){if(map[i]) {_ids.push(i);_map[i]=map[i];}});
	for(var i=0;i<widget.preferences.length;i++) {
		k=widget.preferences.key(i);
		s=k.match(/^vm:(.*)/);
		if(!s) continue; s=s[1];
		if(!_map[s]) _ids.push((_map[s]=getItem(k)).id);
	}
	ids=_ids;map=_map;saveIDs();
}
function saveIDs(){setItem('ids',ids);}
function saveScript(i){
	if(!map[i.id]) {ids.push(i.id);saveIDs();}
	setItem('vm:'+i.id,map[i.id]=i);
}
function removeScript(i){
	i=ids.splice(i,1)[0];saveIDs();
	var o=map[i];delete map[i];
	widget.preferences.removeItem('vm:'+i);
	return o;
}

function str2RE(s){return s.replace(/(\.|\?|\/)/g,'\\$1').replace(/\*/g,'.*?');}
function testURL(url,e){
	function reg(s,w){	// w: forced wildcard mode
		if(!w&&/^\/.*\/$/.test(s)) return RegExp(s.slice(1,-1));	// Regular-expression
		return RegExp('^'+str2RE(s)+'$');	// String with wildcards
	}
	function match_test(s){
		var m=s.match(r);
		if(m&&u) for(var i=0;i<3;i++) if(!reg(m[i],1).test(u[i])) {m=0;break;}
		return !!m;
	}
	var f=true,i,inc=[],exc=[],mat=[],r=/(.*?):\/\/([^\/]*)\/(.*)/,u=url.match(r);
	if(e.custom._include!=false&&e.meta.include) inc=inc.concat(e.meta.include);
	if(e.custom.include) inc=inc.concat(e.custom.include);
	if(e.custom._match!=false&&e.meta.match) mat=mat.concat(e.meta.match);
	if(e.custom.match) mat=mat.concat(e.custom.match);
	if(e.custom._exclude!=false&&e.meta.exclude) exc=exc.concat(e.meta.exclude);
	if(e.custom.exclude) exc=exc.concat(e.custom.exclude);
	if(mat.length) {for(i=0;i<mat.length;i++) if(f=match_test(mat[i])) break;}	// @match
	else for(i=0;i<inc.length;i++) if(f=reg(inc[i]).test(url)) break;	// @include
	if(f) for(i=0;i<exc.length;i++) if(!(f=!reg(exc[i]).test(url))) break;	// @exclude
	return f;
}
function findScript(e,url){
	var i,j,c=[],cache={};
	url=url||e.origin;	// to recognize URLs like data:...
	function getCache(i){cache[i]=getString('cache:'+i);}
	if(url.substr(0,5)!='data:') ids.forEach(function(i){
		if(!testURL(url,map[i])) return;
		c.push(i=map[i]);
		if(i.meta.require) i.meta.require.forEach(getCache);
		for(j in i.meta.resources) getCache(i.meta.resources[j]);
	});
	e.source.postMessage({topic:'FoundScript',data:{isApplied:isApplied,data:c,cache:cache}});
}
function parseMeta(d,meta){
	var o=-1;
	if(!meta) meta={include:[],exclude:[],match:[],require:[],resources:{}};
	meta.resource=[];
	d.replace(/(?:^|\n)\/\/\s*([@=]\S+)(.*)/g,function(m,k,v){
		if(o<0&&k=='==UserScript==') o=1;
		else if(k=='==/UserScript==') o=0;
		if(o==1&&k[0]=='@') k=k.slice(1); else return;
		v=v.replace(/^\s+|\s+$/g,'');
		if(meta[k]&&meta[k].push) meta[k].push(v);
		else meta[k]=v;
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
function fetchCache(url){
	setTimeout(function(){
		fetchURL(url,function(){
			if(this.status!=200) return;
			var r=new FileReader();
			r.onload=function(e){setString('cache:'+url,e.target.result);};
			r.readAsBinaryString(this.response);
		},'blob');
	},0);
}

function parseScript(e,d,c){
	var r={status:0,message:'message' in d?d.message:_('Script updated.')},i;
	if(d.status&&d.status!=200) {r.status=-1;r.message=_('Error fetching script!');}
	else {
		var meta=parseMeta(d.code);
		if(!c) {
			if(meta.name) {
				if(!meta.namespace) meta.namespace='';
				for(i=0;i<ids.length;i++) {
					c=map[ids[i]];
					if(c.meta.name==meta.name&&c.meta.namespace==meta.namespace) break;
				}
				if(i==ids.length) i=-1;
			} else i=-1;
			if(i<0) c=newScript(); else c=map[ids[i]];
		} else i=ids.indexOf(c.id);
		if(i<0){r.status=1;r.message=_('Script installed.');i=ids.length;}
		c.meta=meta;c.code=d.code;r.item=i;
		if(e&&!c.meta.homepage&&!c.custom.homepage&&!/^(file|data):/.test(e.origin)) c.custom.homepage=e.origin;
		saveScript(c);
		meta.require.forEach(fetchCache);	// @require
		for(d in meta.resources) fetchCache(meta.resources[d]);	// @resource
		if(meta.icon) fetchCache(meta.icon);	// @icon
	}
	if(e) e.source.postMessage({topic:'ShowMessage',data:r.message});
	optionsUpdate(r);
}
function installScript(e,url){
	if(!url) {
		if(installFile) e.source.postMessage({topic:'ConfirmInstall',data:_('Do you want to install this UserScript?')});
	} else fetchURL(url,function(){
		parseScript(e,{status:this.status,code:this.responseText});
	});
}
function canUpdate(o,n){
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
function allowUpdate(n){return n.update&&n.meta.updateURL&&n.meta.downloadURL;}
function checkUpdate(i){
	var o=map[ids[i]],r={item:i,hideUpdate:1,status:2};
	if(!allowUpdate(o)) return;
	function update(){
		r.message=_('Updating...');optionsUpdate(r);
		fetchURL(o.meta.downloadURL,function(){
			parseScript(null,{status:this.status,code:this.responseText},o);
		});
	}
	r.message=_('Checking for updates...');optionsUpdate(r);
	fetchURL(o.meta.updateURL,function(){
		try{
			var m=parseMeta(this.responseText);
			if(canUpdate(o.meta.version,m.version)) return update();
			r.message=_('No update found.');
		}catch(e){
			r.message=_('Failed fetching update information.');
		}
		delete r.hideUpdate;
		optionsUpdate(r);
	});
}
function checkUpdateAll(){for(var i=0;i<ids.length;i++) checkUpdate(i);}

// Requests
var requests={};
function getRequestId(e){
	var id=Date.now()+'.'+Math.random().toString().substr(1);
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

var isApplied=getItem('isApplied',true),
		installFile=getItem('installFile',true),
		autoUpdate=getItem('autoUpdate',true),
		lastUpdate=getItem('lastUpdate',0),
    search=getString('search',_('Search$1')),
		messages={
	'FindScript':findScript,
	'InstallScript':installScript,
	'ParseScript':parseScript,
	'GetRequestId':getRequestId,
	'HttpRequest':httpRequest,
	'AbortRequest':abortRequest,
};
function onMessage(e) {
	var message=e.data,c=messages[message.topic];
	if(c) try{c(e,message.data);}catch(e){opera.postError(e);}
}
function showButton(show){
	if(show) opera.contexts.toolbar.addItem(button);
	else opera.contexts.toolbar.removeItem(button);
}
function updateIcon() {button.icon='images/icon18'+(isApplied?'':'w')+'.png';}
function optionsUpdate(r){	// update loaded options pages
	if(options&&options.window)
		try{options.window.updateItem(r);}catch(e){opera.postError(e);options={};}
}
opera.extension.onmessage = onMessage;
var button = opera.contexts.toolbar.createItem({
	title:_('Violentmonkey'),
	popup:{
		href:"popup.html",
		width:222,
		height:100
	}
}),options={},optionsURL=new RegExp('^'+(location.protocol+'//'+location.host+'/options.html').replace(/\./g,'\\.'));
updateIcon();
showButton(getItem('showButton',true));
opera.extension.tabs.oncreate=function(e){
	if(optionsURL.test(e.tab.url)) {
		if(options.tab&&!options.tab.closed) {e.tab.close();options.tab.focus();}
		else options={tab:e.tab};
	}
};
opera.extension.tabs.onclose=function(e){if(options.tab===e.tab) options={};};
function autoCheck(){	// check for updates automatically in 20 seconds
	var n=Date.now();
	if(n-lastUpdate>864e5) {
		setItem('lastUpdate',lastUpdate=n);
		checkUpdateAll();
	}
	setTimeout(autoCheck,36e5);
}
if(autoUpdate) setTimeout(autoCheck,20000);
