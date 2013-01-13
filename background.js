function getSetting(key,def){
	try{return JSON.parse(widget.preferences.getItem(key)||'');}catch(e){return saveSetting(key,def);}
}
function saveSetting(key,val){widget.preferences.setItem(key,JSON.stringify(val));return val;}

var scripts=getSetting('scripts',[]),cache=getSetting('cache',{}),
    map={},search;
scripts.forEach(function(i){if(i.id) map[i.id]=i; else i.id=getId(map,i);});
/* ================Data format 0.2=================
 * List	[
 * 	Item	{
 * 		id:	Random
 * 		/url:	String/
 * 		custom:	List-Dict	// Custom meta data
 * 		meta:	List-Dict
 *		enabled:	Boolean
 *		update:	Boolean
 *		code:	String
 *	 	}
 * 	]
 */
/* ================Storage 0.1=====================
 * scriptVals:(escape(name)):(escape(namespace)):key=data
 */

(function(){	// upgrade data
	var version=getSetting('version_storage',0);
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
		cache={};vacuum();
	}
	if(version<0.2) {
		scripts.forEach(function(i){
			i.custom={};
			if('url' in i) {i.custom.homepage=i.url;delete i.url;}
		});
		saveSetting('version_storage',0.2);
	}
})();
function vacuum(callback){
	setTimeout(function(){
		var ns={},c={},i=0,k,s;
		scripts.forEach(function(i){
			ns['scriptVals:'+escape(i.meta.name||'')+':'+escape(i.meta.namespace||'')+':']=1;
			if(i.meta.require) i.meta.require.forEach(function(i){(c[i]=cache[i])||fetchCache(i);});
			if(i.meta.resources) for(k in i.meta.resources) (c[k]=cache[k])||fetchCache(k);
		});
		while(i<widget.preferences.length) {
			k=widget.preferences.key(i);
			s=k.match(/^scriptVals:[^:]*:[^:]*:/);
			if(s&&!ns[s[0]]) widget.preferences.removeItem(k); else i++;
		}
		if(callback) callback();
	},0);
}

function saveScripts(){saveSetting('scripts',scripts);}
function saveCache(){saveSetting('cache',cache);}
function newMeta(){return {name:'New Script',namespace:'',version:null};}
function getId(map,d){
	do{var s=Math.random();}while(map[s]);
	map[s]=d;
	return s;
}
function newScript(save){
	var r={
		custom:{},
		meta:newMeta(),
		url:'',
		enabled:1,
		update:1,
		code:'// ==UserScript==\n// @name New Script\n// ==/UserScript==\n'
	};
	r.id=getId(map,r);
	scripts.push(r);
	if(save) saveScripts();
	return r;
}
function removeScript(i){i=scripts.splice(i,1)[0];delete map[i.id];saveScripts();return i;}

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
	var i,c=[];
	url=url||e.origin;	// to recognize URLs like data:...
	if(url.substr(0,5)!='data:')
		for(i=0;i<scripts.length;i++) if(testURL(url,scripts[i])) c.push(scripts[i]);
	e.source.postMessage({topic:'FoundScript',data:c});
}
function loadCache(e,d){
	for(var i in d) d[i]=cache[i];
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
	fetchCache.count++;
	fetchURL(url,function(){
		cache[url]=String.fromCharCode.apply(this,this.response);
		if(!--fetchCache.count) saveCache();
	},'arraybuffer');	// Opera 11.64 does not support Blob
}
fetchCache.count=0;

function parseScript(e,d,c){
	var i,meta=parseMeta(d);
	if(!c) {
		if(meta.name) {
			if(!meta.namespace) meta.namespace='';
			for(i=0;i<scripts.length;i++)
				if(scripts[i].meta.name==meta.name&&scripts[i].meta.namespace==meta.namespace) break;
			if(i==scripts.length) i=-1;
		} else i=-1;
		if(i<0) c=newScript(); else c=scripts[i];
	}
	c.meta=meta;c.code=d;
	if(e&&e.origin&&!c.meta.homepage) c.custom.homepage=e.origin;
	saveScripts();
	meta.require.forEach(function(i){fetchCache(i);});	// @require
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
	var id=getId(requests,new XMLHttpRequest());
	e.source.postMessage({topic:'GotRequestId',data:id});
}
function httpRequest(e,details){
	function response(){
		return {
			readyState:req.readyState,
			responseHeaders:req.getAllResponseHeaders(),
			responseText:req.responseText,
			status:req.status,
			statusText:req.statusText,
		}
	}
	function callback(type){
		var d={
			topic:'HttpRequested',
			data:{id:details.id}
		};
		if(type) d.data.type=type;
		return function(evt){	// evt is undefined for Opera 11.64
			d.data.data=response();
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

var isApplied=getSetting('isApplied',true),installFile=getSetting('installFile',true),
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
function optionsUpdate(){
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
		title:"Violentmonkey",
		popup:{
			href:"popup.html",
			width:222,
			height:100
		}
	});
	search=getSetting('search',_('Search$1'));
	updateIcon();
	showButton(getSetting('showButton',true));
}, false);
