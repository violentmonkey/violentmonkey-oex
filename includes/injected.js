/**
* http://www.webtoolkit.info/javascript-utf8.html
*/
function utf8decode (utftext) {
	var string = "";
	var i = 0;
	var c = 0, c1 = 0, c2 = 0, c3 = 0;
	while ( i < utftext.length ) {
		c = utftext.charCodeAt(i);
		if (c < 128) {string += String.fromCharCode(c);i++;}
		else if((c > 191) && (c < 224)) {
			c2 = utftext.charCodeAt(i+1);
			string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
			i += 2;
		} else {
			c2 = utftext.charCodeAt(i+1);
			c3 = utftext.charCodeAt(i+2);
			string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
			i += 3;
		}
	}
	return string;
}

// Messages
var requests={},qrequests=[];
opera.extension.onmessage = function(e) {
	var message=e.data,c;
	if(message.topic=='GotInjected') loadScript(message.data);
	else if(message.topic=='HttpRequested') {
		c=requests[message.data.id];
		if(c) c.callback(message.data);
	} else if(message.topic=='GetPopup')
		opera.extension.postMessage({topic:'GotPopup',data:[menu,scr]});
	else if(message.topic=='Command') {
		c=command[message.data];if(c) c();
	} else if(message.topic=='ConfirmInstall') {
		if(message.data&&confirm(message.data)&&installCallback) installCallback();
	} else if(message.topic=='GotRequestId') qrequests.shift().start(message.data);
	else if(message.topic=='ShowMessage') showMessage(message.data);
};
function showMessage(data){
	var d=document.createElement('div');
	d.style='position:fixed;border-radius:5px;background:orange;padding:20px;z-index:9999;box-shadow:5px 10px 15px rgba(0,0,0,0.4);transition:opacity 1s linear;opacity:0;text-align:left;';
	document.body.appendChild(d);d.innerHTML=data;
	d.style.top=(window.innerHeight-d.offsetHeight)/2+'px';
	d.style.left=(window.innerWidth-d.offsetWidth)/2+'px';
	function close(){document.body.removeChild(d);delete d;}
	d.onclick=close;	// close immediately
	setTimeout(function(){d.style.opacity=1;},1);	// fade in
	setTimeout(function(){d.style.opacity=0;setTimeout(close,1000);},3000);	// fade out
}
function Request(details){
	this.callback=function(d){
		var c=details['on'+d.type];
		if(c) {
			if(d.data.response) {
				if(!this.data.length) {
					if(d.resType) {	// blob or arraybuffer
						var m=d.data.response.match(/^data:(.*?);base64,(.*)$/);
						if(!m) d.data.response=null;
						else {
							var b=window.atob(m[2]);
							if(details.responseType=='blob') {
								this.data.push(new window.Blob([b],{type:m[1]}));
							} else {	// arraybuffer
								m=new Uint8Array(b.length);
								for(i=0;i<b.length;i++) m[i]=b.charCodeAt(i);
								this.data.push(m.buffer);
							}
						}
					} else if(details.responseType=='json')	// json
						this.data.push(JSON.parse(d.data.response));
					else	// text
						this.data.push(d.data.response);
				}
				d.data.response=this.data[0];
			}
			// finalUrl not supported
			Object.defineProperty(d.data,'finalUrl',{
				get:function(){console.log('[Violentmonkey]Warning: finalUrl not supported for GM_xmlhttpRequest yet!');}
			});
			c(d.data);
		}
		if(!this.id) for(var i in d.data) this.req[i]=d.data[i];
		if(d.type=='load') delete requests[this.id];
	};
	this.start=function(id){
		this.id=id;
		requests[id]=this;
		var data={
			id:id,
			method:details.method,
			url:details.url,
			data:details.data,
			async:!details.synchronous,
			user:details.user,
			password:details.password,
			headers:details.headers,
			overrideMimeType:details.overrideMimeType,
		};
		if(['arraybuffer','blob'].indexOf(details.responseType)>=0) data.responseType='blob';
		opera.extension.postMessage({topic:'HttpRequest',data:data});
	};
	this.req={
		abort:function(){opera.extension.postMessage({topic:'AbortRequest',data:this.id});}
	};
	this.data=[];
	qrequests.push(this);
	opera.extension.postMessage({topic:'GetRequestId'});
};

// For UserScripts installation
var installCallback=null;
if((function(){
	var m=window.location.href.match(/(\.user\.js)$/);
	function install(){
		if(document&&document.body&&!document.querySelector('title')) {	// plain text
			installCallback=function(){opera.extension.postMessage({topic:'ParseScript',data:{code:document.body.innerText,from:document.referrer}});};
			opera.extension.postMessage({topic:'InstallScript'});
		}
	}
	if(m){
		if(document.readyState!='complete') window.addEventListener('load',install,false);
		else install();
	}else return true;
})()&&[
	'greasyfork.org','userscripts.org','j.mozest.com','userscripts.org:8080'
].indexOf(window.location.host)>=0) window.addEventListener('click',function(e){
	var o=e.target;while(o&&o.tagName!='A') o=o.parentNode;
	if(o&&/\.user\.js$/.test(o.href)) {
		e.preventDefault();
		installCallback=function(){opera.extension.postMessage({topic:'InstallScript',data:o.href});};
		opera.extension.postMessage({topic:'InstallScript'});
	}
},false);

// For injected scripts
var start=[],end=[],cache,values,requires={},
		scr=[],menu=[],command={},loaded=false;
function abspath(u){
	// convert url to absolute path
	var a=document.createElement('a');
	a.href=u;return a.href;
}
function propertyToString(){return 'Property for Violentmonkey: designed by Gerald';}
function wrapper(raw){
	// functions and properties
	function wrapFunction(o,i,c){
		var f=function(){
			var r=Function.apply.apply(o[i],[o,arguments]);
			if(c) r=c(r);return r;
		};
		f.__proto__=o[i];f.prototype=o[i].prototype;
		return f;
	}
	function wrapWindow(w){return !raw&&w==window?t:w;}
	function wrapItem(i){
		try{	// avoid reading protected data
			if(typeof window[i]=='function') {
				if(itemWrapper) t[i]=itemWrapper(window,i,wrapWindow);
				else t[i]=window[i];
			} else Object.defineProperty(t,i,{
				get:function(){return wrapWindow(window[i]);},
				set:function(v){window[i]=v;},
			});
		}catch(e){}
	}
	var t=this,itemWrapper=null;
	Object.getOwnPropertyNames(window).forEach(wrapItem);
	itemWrapper=wrapFunction;
	n=window;while(n=Object.getPrototypeOf(n)) Object.getOwnPropertyNames(n).forEach(wrapItem);
}
function wrapGM(c){
	// GM functions
	// Reference: http://wiki.greasespot.net/Greasemonkey_Manual:API
	var gm={},value=values[c.uri]||{},w,g=c.meta.grant||[];
	if(!g.length||g.length==1&&g[0]=='none') {	// @grant none
		w=new wrapper(true);g.pop();
	} else {
		w=new wrapper();
	}
	if(g.indexOf('unsafeWindow')<0) g.push('unsafeWindow');
	function getCache(name){for(var i in resources) if(name==i) return cache[resources[i]];}
	function addProperty(name,prop,obj){
		if('value' in prop) prop.writable=false;
		prop.configurable=false;
		Object.defineProperty(obj,name,prop);
		if(typeof obj[name]=='function') obj[name].toString=propertyToString;
	}
	var resources=c.meta.resources||{},gf={
		unsafeWindow:{value:window},
		GM_info:{get:function(){
			var m=c.code.match(/\/\/\s+==UserScript==\s+([\s\S]*?)\/\/\s+==\/UserScript==\s/),
					script={
						description:c.meta.description||'',
						excludes:c.meta.exclude.concat(),
						includes:c.meta.include.concat(),
						matches:c.meta.match.concat(),
						name:c.meta.name||'',
						namespace:c.meta.namespace||'',
						resources:{},
						'run-at':c.meta['run-at']||'document-end',
						unwrap:false,
						version:c.meta.version||'',
					},
					o={};
			addProperty('script',{value:{}},o);
			addProperty('scriptMetaStr',{value:m?m[1]:''},o);
			addProperty('scriptWillUpdate',{value:c.update},o);
			addProperty('version',{value:widget.version},o);
			for(m in script) addProperty(m,{value:script[m]},o.script);
			for(m in c.meta.resources) addProperty(m,{value:c.meta.resources[m]},o.script.resources);
			return o;
		}},
		GM_deleteValue:{value:function(key){
			delete value[key];
			opera.extension.postMessage({topic:'SetValue',data:{uri:c.uri,data:value}});
		}},
		GM_getValue:{value:function(k,d){
			var v=value[k];
			if(v) {
				k=v[0];v=v.slice(1);
				switch(k){
					case 'n': d=Number(v);break;
					case 'b': d=v=='true';break;
					case 'o': try{d=JSON.parse(v);}catch(e){opera.postError(e);}break;
					default: d=v;
				}
			}
			return d;
		}},
		GM_listValues:{value:function(){return Object.getOwnPropertyNames(value);}},
		GM_setValue:{value:function(key,val){
			var t=(typeof val)[0];
			switch(t){
				case 'o':val=t+JSON.stringify(val);break;
				default:val=t+val;
			}
			value[key]=val;
			opera.extension.postMessage({topic:'SetValue',data:{uri:c.uri,data:value}});
		}},
		GM_getResourceText:{value:function(name){
			var b=getCache(name);
			if(b) b=utf8decode(b);
			return b;
		}},
		GM_getResourceURL:{value:function(name){
			var b=getCache(name);
			if(b) b='data:;base64,'+window.btoa(b);
			return b;
		}},
		GM_addStyle:{value:function(css){
			if(document.head) {
				var v=document.createElement('style');
				v.innerHTML=css;
				document.head.appendChild(v);
				return v;
			}
		}},
		GM_log:{value:function(d){console.log(d);}},
		GM_openInTab:{value:function(url){
			var a=document.createElement('a');
			a.href=url;a.target='_blank';a.click();
		}},
		GM_registerMenuCommand:{value:function(cap,func,acc){menu.push([cap,acc]);command[cap]=func;}},
		GM_xmlhttpRequest:{value:function(details){
			details.url=abspath(details.url);
			// synchronous mode not supported
			var r=new Request(details);
			return r.req;
		}},
	};
	g.forEach(function(i){var o=gf[i];if(o) addProperty(i,o,gm);});
	return [w,gm];
}
function runCode(c){
	var req=c.meta.require||[],i,r=[],code=[],w=wrapGM(c);
	Object.getOwnPropertyNames(w[1]).forEach(function(i){r.push(i+'=g["'+i+'"]');});
	if(r.length) code.push('var '+r.join(',')+';delete g;');
	var cc=[];
	req.forEach(function(i){
		r=requires[i];
		if(!r&&(r=cache[i])) requires[i]=r=utf8decode(r);
		if(r) cc.push(r);
	});
	cc.push(c.code);

	//code.push('with(this)eval('+JSON.stringify(cc.join('\n'))+');');	// eval without wrap
	//code.push('with(this)(function(){'+cc.join('\n')+'}).call(window);');	// wrap without eval, Presto-specific errors occur
	code.push('with(this)eval('+JSON.stringify('(function(){'+cc.join('\n')+'}).call(window);')+');');

	code=code.join('\n');
	try{
		(new Function('g',code)).call(w[0],w[1]);
	}catch(e){
		e=e.toString()+'\n'+e.stacktrace;
		i=e.lastIndexOf('\n',e.lastIndexOf('in evaluated code:\n'));
		if(i>0) e=e.slice(0,i);
		opera.postError('Error running script: '+(c.custom.name||c.meta.name||c.id)+'\n'+e);
	}
}
function run(l){while(l.length) runCode(l.shift());}
window.addEventListener('DOMContentLoaded',function(){
	loaded=true;run(end);
},false);
function loadScript(data){
	var l,idle=[];
	cache=data.cache;
	values=data.values;
	data.scripts.forEach(function(i){
		scr.push(i.id);
		if(data.isApplied&&i.enabled) {
			switch(i.custom['run-at']||i.meta['run-at']){
				case 'document-start':l=start;break;
				case 'document-idle':l=idle;break;
				default:l=end;
			}
			l.push(i);
		}
	});
	end=end.concat(idle);
	run(start);if(loaded) run(end);
}
if(!installCallback) opera.extension.postMessage({topic:'GetInjected',data:window.location.href});
