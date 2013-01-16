function getString(key,def){
	var v=widget.preferences.getItem(key);
	if(key==null) return def;
	return v;
}
function saveString(key,val){widget.preferences.setItem(key,val);}
function getItem(key,def){
	var v=widget.preferences.getItem(key);
	if(v==null&&def) return saveItem(key,def);
	try{return JSON.parse(v);}catch(e){return def;}
}
function saveItem(key,val){
	widget.preferences.setItem(key,JSON.stringify(val));
	return val;
}
function getNameURI(i){
	var ns=i.meta.namespace||'',n=i.meta.name||'',k=escape(ns)+':'+escape(n)+':';
	if(!ns&&!n) k+=i.id;return k;
}

/* ==========Data format 0.3 (Obsoleted)===========
 * List	[
 * 	Item	{
 * 		id:	Random
 * 		custom:	List-Dict	// Custom meta data
 * 		meta:	List-Dict
 *		enabled:	Boolean
 *		update:	Boolean
 *		code:	String
 *	 	}
 * 	]
 */
/* ===========Storage 0.1 (Obsoleted)==============
 * scriptVals:(escape(name)):(escape(namespace)):key=data
 */
/* ===============Data format 0.4==================
 * ids	List [id]
 * vm:id	JSON-Item
 * val:nameURI:key	TypeString
 * cache:url	BinaryString
 */

(function(){	// upgrade data
	var version=getItem('version_storage',0),scripts=getItem('scripts');
	if(version<0.1) {
		for(var i=0;i<widget.preferences.length;i++) {
			var k=widget.preferences.key(i);
			if(/^scriptVals\//.test(k)) {
				var v=JSON.parse(widget.preferences.getItem(k));
				widget.preferences.removeItem(k);
				k=k.match(/^scriptVals\/([^\/]*)\/(.*)/);
				if(!k) continue;
				k[1]=decodeURIComponent(k[1]);
				k='scriptVals:'+escape(k[1])+':'+escape(k[2])+':';
				for(var j in v) widget.preferences.setItem(k+j,JSON.stringify(v[j]));
			}
		}
	}
	if(version<0.3) {
		scripts&&scripts.forEach(function(i){
			if(!i.custom) i.custom={};
			if('url' in i) {i.custom.homepage=i.url;delete i.url;}
		});
	}
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
		var s=getItem('search'),_s=[];if(s) saveString('search',s);
		widget.preferences.removeItem('scripts');
		scripts&&scripts.forEach(function(i){_s.push(i.id);saveItem('vm:'+i.id,i);});
		saveItem('ids',_s);
		widget.preferences.removeItem('cache');
		if(cache) for(i in cache) saveString('cache:'+i,cache[i]);
		saveItem('version_storage',0.4);
	}
})();
var ids=getItem('ids',[]),map;
generateMap();
function vacuum(callback){
	setTimeout(function(){
		var k,s,i,ns={},r;
		ids.forEach(function(i){
			k=map[i];
			ns[getNameURI(k)]=1;
			r=[];
			if(k.meta.icon) r.push(k.meta.icon);
			if(k.meta.require) r=r.concat(k.meta.require);
			if(k.meta.resources) r=r.concat(k.meta.resources);
			r.forEach(function(i){if(widget.preferences.getItem('cache:'+i)==null) fetchCache(i);});
		});
		for(i=0;i<widget.preferences.length;) {
			k=widget.preferences.key(i);
			s=k.match(/^val:([^:]*:[^:]*:[^:]*)/);
			if(s&&!ns[s[1]]) widget.preferences.removeItem(k); else i++;
		}
		generateIDs();
		if(callback) callback();
	},0);
}

function newMeta(){return {name:'New Script',namespace:'',version:null};}
function newScript(save){
	var r={
		custom:{},
		meta:newMeta(),
		url:'',
		enabled:1,
		update:1,
		code:'// ==UserScript==\n// @name New Script\n// ==/UserScript==\n'
	};
	do{r.id=Math.random();}while(widget.preferences.getItem('vm:'+r.id));
	if(save) saveScript(r);
	return r;
}
function generateIDs(){
	ids=[];
	for(var i=0;i<widget.preferences.length;i++) {
		k=widget.preferences.key(i);
		s=k.match(/^vm:(.*)/);
		if(s) ids.push(JSON.parse(widget.preferences.getItem(k)).id);
	}
	saveIDs();generateMap();
}
function generateMap(){map={};ids.forEach(function(i){map[i]=getItem('vm:'+i);});}
function saveIDs(){saveItem('ids',ids);}
function saveScript(i){
	if(!map[i.id]) {ids.push(i.id);saveIDs();}
	saveItem('vm:'+i.id,map[i.id]=i);
}
function removeScript(i){
	i=ids.splice(i,1)[0];saveIDs();delete map[i];
	widget.preferences.removeItem('vm:'+i);
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
	for(i=0;i<mat.length;i++) if(f=match_test(mat[i])) break;	// @match
	for(i=0;i<inc.length;i++) if(f=reg(inc[i]).test(url)) break;	// @include
	if(f) for(i=0;i<exc.length;i++) if(!(f=!reg(exc[i]).test(url))) break;	// @exclude
	return f;
}
function findScript(e,url){
	var i,c=[],v;
	url=url||e.origin;	// to recognize URLs like data:...
	if(url.substr(0,5)!='data:') ids.forEach(function(i){
		if(testURL(url,map[i])) c.push(map[i]);
	});
	e.source.postMessage({topic:'FoundScript',data:[isApplied,c]});
}
function loadCache(e,d){
	for(var i in d) d[i]=getString('cache:'+i);
	e.source.postMessage({topic:'LoadedCache',data:d});
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
function fetchURL(url,callback,type){
	var req=new XMLHttpRequest();
	req.open('GET',url,true);
	if(type) req.responseType=type;
	if(callback) req.onload=callback;
	req.send();
}
function fetchCache(url){
	fetchURL(url,function(){
		saveString('cache:'+url,String.fromCharCode.apply(this,this.response));
	},'arraybuffer');	// Opera 11.64 does not support Blob
}

function parseScript(e,d,c){
	var i,meta=parseMeta(d);
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
	}
	meta.custom=c.meta.custom;c.meta=meta;c.code=d;
	if(e&&!/^(file|data):/.test(e.origin)&&!c.meta.homepage) c.custom.homepage=e.origin;
	saveScript(c);
	meta.require.forEach(fetchCache);	// @require
	for(var j in meta.resources) fetchCache(meta.resources[j]);	// @resource
	if(meta.icon) fetchCache(meta.icon);	// @icon
	if(e) {
		e.source.postMessage({topic:'ShowMessage',data:_('Script installed.')});
		optionsUpdate();
	}
}
function installScript(e,url){
	if(!url) {
		if(installFile) e.source.postMessage({topic:'ConfirmInstall',data:_('Do you want to install this UserScript?')});
	} else fetchURL(url,function(){parseScript(e,this.responseText);});
}

// Requests
var requests={};
function getRequestId(e){
	do{var id=Math.random();}while(requests[id]);
	requests[id]=new XMLHttpRequest();
	e.source.postMessage({topic:'GotRequestId',data:id});
}
function httpRequest(e,details){
	function callback(type){
		var d={
			topic:'HttpRequested',
			data:{id:details.id}
		};
		if(type) d.data.type=type;
		return function(evt){	// evt is undefined for Opera 11.64
			d.data.data={
				readyState:req.readyState,
				responseHeaders:req.getAllResponseHeaders(),
				responseText:req.responseText,
				status:req.status,
				statusText:req.statusText,
			};
			e.source.postMessage(d);
		};
	}
	var i,req;
	if(details.id) req=requests[details.id];
	else req=new XMLHttpRequest();
	try{
		req.open(details.method,details.url,details.async,details.user,details.password);
		if(details.headers) for(i in details.headers) req.setRequestHeader(i,details.headers[i]);
		if(details.overrideMimeType) req.overrideMimeType(details.overrideMimeType);
		req.onload=callback('load');
		req.onreadystatechange=callback('readystatechange');
		req.send(details.data);
		if(!details.id) callback()();
	}catch(e){opera.postError(e);}
}
function abortRequest(e,id){
	var req=requests[id];
	if(req) req.abort();
	delete requests[id];
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
	if(a[0]) return a[0].replace(/\$(?:\{(\d+)\}|(\d+))/g,function(v,g1,g2){return a[g1||g2]||v;});
}

var isApplied=getItem('isApplied',true),installFile=getItem('installFile',true),
    button,_options=[],messages={
	'FindScript':findScript,
	'LoadCache':loadCache,
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
function optionsUpdate(){	// update loaded options pages
	var i=0;
	while(i<_options.length)
		if(_options[i].closed) _options.splice(i,1);
		else {
			try{_options[i].load();}catch(e){opera.postError(e);}
			i++;
		}
}
function optionsLoad(w){
	var i=0;
	while(i<_options.length)
		if(_options[i].closed) _options.splice(i,1);
		else {if(_options[i]==w) w=null;i++;}
	if(w) _options.push(w);
}
window.addEventListener('DOMContentLoaded', function() {
	opera.extension.onmessage = onMessage;
	button = opera.contexts.toolbar.createItem({
		title:_('Violentmonkey'),
		popup:{
			href:"popup.html",
			width:222,
			height:100
		}
	});
	search=getString('search',_('Search$1'));
	updateIcon();
	showButton(getItem('showButton',true));
}, false);
