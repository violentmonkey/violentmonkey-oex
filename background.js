function getSetting(key,def){
	try{return JSON.parse(widget.preferences.getItem(key)||'');}catch(e){return saveSetting(key,def);}
}
function saveSetting(key,val){widget.preferences.setItem(key,JSON.stringify(val));return val;}

var scripts=getSetting('scripts',[]),cache=getSetting('cache',{}),map={};
scripts.forEach(function(i){if(i.id) map[i.id]=i; else i.id=getId(map,i);});
/* ================Data format 0.1=================
 * List	[
 * 	Item	{
 * 		id:	Random
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
	var version=0.1;
	if(getSetting('version_storage',0)<version) {
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
		saveSetting('version_storage',version);
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
		meta:newMeta(),
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
	var f=true,i,inc=e.meta.include||[],exc=e.meta.exclude||[],
	    mat=e.meta.match||[],r=/(.*?):\/\/([^\/]*)\/(.*)/,u=url.match(r);
	for(i=0;i<mat.length;i++) if(f=match_test(mat[i])) break;	// @match
	for(i=0;i<inc.length;i++) if(f=reg(inc[i]).test(url)) break;	// @include
	if(f) for(i=0;i<exc.length;i++) if(!(f=!reg(exc[i]).test(url))) break;	// @exclude
	return f;
}
function findScript(e){
	var i,c=[];
	if(isApplied) for(i=0;i<scripts.length;i++) if(testURL(e.origin,scripts[i])) c.push(scripts[i]);
	e.source.postMessage({topic: 'FoundScript',data: c});
}
function loadCache(e,d){
	for(var i in d) d[i]=cache[i];
	e.source.postMessage({topic:'LoadedCache',data:d});
}
function parseMeta(d,meta){
	var o=-1;
	if(!meta) meta={include:[],exclude:[],match:[],require:[],resource:[],resources:{}};
	d.replace(/(?:^|\n)\/\/\s*([@=]\S+)(.*)/g,function(m,k,v){
		if(o<0&&k=='==UserScript==') o=1;
		else if(k=='==/UserScript==') o=0;
		if(o==1&&k[0]=='@') k=k.slice(1); else return;
		v=v.replace(/^\s+|\s+$/g,'');
		if(meta[k]==undefined) meta[k]=v;
		else if(typeof meta[k]=='string') meta[k]=[meta[k],v];
		else meta[k].push(v);
	});
	for(var i=0;i<meta.resource.length;i++) {
		o=meta.resource[i].match(/^(\w+)\s+(.*)/);
		if(o) meta.resources[o[1]]=o[2];
	}
	return meta;
}
function fetchURL(url){
	var req=new XMLHttpRequest();
	req.open('GET',url,false);
	req.send();
	return req.responseText;
}
var _cache=0;
function fetchCache(url){
	function fetch(){
		var d=fetchURL(url);
		if(d) cache[url]=d;
		if(!--_cache) saveCache();
	}
	_cache++;setTimeout(fetch,0);
}

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
	c.meta=meta;c.code=d;saveScripts();
	// @require: download when installed
	meta.require.forEach(function(i){fetchCache(i);});
	// @resource: download when installed
	for(var j in meta.resources) fetchCache(meta.resources[j]);
	if(e) {
		if(c.code) j=format(_('UserScript <$1> is $2!\nCheck it out in the options page.'),c.meta.name,i<0?_('installed'):_('updated'));
		else j=_('No script is installed!');
		e.source.postMessage({topic:'ShowMessage',data:j});
	}
}
function installScript(e,url){
	if(!url) {
		if(installFile) e.source.postMessage({topic:'Confirm',data:_('Do you want to install this UserScript?')});
	} else if(/https?:\/\/userscripts\.org\//.test(url))
		setTimeout(function(){parseScript(e,fetchURL(url));},0);
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
	var i,req;
	if(details.id) req=requests[details.id];
	else req=new XMLHttpRequest();
	var d={
		topic:'HttpRequested',
		data:{id:details.id}
	};
	try{
		req.open(details.method,details.url,details.async,details.user,details.password);
		if(details.headers) for(i in details.headers) req.setRequestHeader(i,details.headers[i]);
		req.onreadystatechange=function(){
			d.data.data=response();
			d.data.evt='readystatechange';
			e.source.postMessage(d);
			if(req.readyState==4) {
				d.data.evt='load';
				e.source.postMessage(d);
			}
		};
		req.send(details.data);
		if(!details.id) {d.data.data=response();e.source.postMessage(d);}
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
	// since Opera 12.10
	/*var fobj=opera.extension.getFile(filename);
	if(fobj) {
		var fr=new FileReader();
		fr.onload=function(){
			var j=JSON.parse(fr.result);
			for(var i in j) i18nMessages[i]=j[i];
		};
		fr.readAsText(fobj,'utf-8');
	}*/
}
function getI18nString(s) {return i18nMessages[s]||s;}
var _=getI18nString;
try{loadMessages();}catch(e){opera.postError(e);}
function format(){
	var a=arguments;
	if(a[0]) return a[0].replace(/\$(?:\{(\d+)\}|(\d+))/g,function(v,g1,g2){return a[g1||g2]||v;});
}

var isApplied=getSetting('isApplied',true),installFile=getSetting('installFile',true),
    button,_messages={},messages={
	'FindScript':findScript,
	'LoadCache':loadCache,
	'InstallScript':installScript,
	'ParseScript':parseScript,
	'GetRequestId':getRequestId,
	'HttpRequest':httpRequest,
	'AbortRequest':abortRequest,
};
function showButton(show){
	if(show) opera.contexts.toolbar.addItem(button);
	else opera.contexts.toolbar.removeItem(button);
}
function onMessage(e) {
	var message = e.data,c=messages[message.topic];
	if(c) c(e,message.data);
	else {
		c=_messages[message.topic];
		if(c) {c(e,message.data);delete _messages[message.topic];}
	}
}
function postMessage(topic,rtopic,data,callback) {
	var tab=opera.extension.tabs.getFocused();
	if(tab) {
		if(rtopic&&callback) _messages[rtopic]=callback;
		tab.postMessage({topic:topic,data:data});
	}
}
function updateIcon() {button.icon='images/icon18'+(isApplied?'':'w')+'.png';}
window.addEventListener('DOMContentLoaded', function() {
	opera.extension.onmessage = onMessage;
	button = opera.contexts.toolbar.createItem({
		title: "Violentmonkey",
		popup:{
			href: "popup.html",
			width:222,
			height:100
		}
	});
	updateIcon();
	showButton(getSetting('showButton',true));
	/*function toggleButton() {button.disabled=!opera.extension.tabs.getFocused();}
	opera.extension.onconnect = toggleButton;
	opera.extension.tabs.onfocus = toggleButton;
	opera.extension.tabs.onblur = toggleButton;*/
}, false);
