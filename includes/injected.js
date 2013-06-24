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
	if(message.topic=='FoundScript') loadScript(message.data);
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
		if(c) c(d.data);
		if(!this.id) for(var i in d.data) this.req[i]=d.data[i];
		if(d.type=='load') delete requests[this.id];
	};
	this.start=function(id){
		this.id=id;
		requests[id]=this;
		opera.extension.postMessage({topic:'HttpRequest',data:{
			id:id,
			method:details.method,
			url:details.url,
			data:details.data,
			async:!details.synchronous,
			user:details.user,
			password:details.password,
			headers:details.headers,
			overrideMimeType:details.overrideMimeType,
		}});
	};
	this.req={
		abort:function(){opera.extension.postMessage({topic:'AbortRequest',data:this.id});}
	};
	qrequests.push(this);
	opera.extension.postMessage({topic:'GetRequestId'});
};
if(window===window.top) {
	window.addEventListener('message',function(e){
		e=e.data;
		if(e&&e.topic=='VM_Scripts') e.data.forEach(function(i){if(!_scr[i]){_scr[i]=1;scr.push(i);}});
	},false);
}

// For UserScripts installation
var installCallback=null;
if((function(){
	var m=window.location.href.match(/(\.user\.js)$/);
	function install(){
		if(document&&document.body&&!document.querySelector('title')) {	// plain text
			installCallback=function(){opera.extension.postMessage({topic:'ParseScript',data:{code:document.body.innerText}});};
			opera.extension.postMessage({topic:'InstallScript'});
		}
	}
	if(m){
		if(document.readyState!='complete') window.addEventListener('load',install,false);
		else install();
	}else return true;
})()&&['userscripts.org','j.mozest.com'].indexOf(window.location.host)>=0) window.addEventListener('click',function(e){
	var o=e.target;while(o&&o.tagName!='A') o=o.parentNode;
	if(o&&/\.user\.js$/.test(o.href)) {
		e.preventDefault();
		installCallback=function(){opera.extension.postMessage({topic:'InstallScript',data:o.href});};
		opera.extension.postMessage({topic:'InstallScript'});
	}
},false);

// For injected scripts
var start=[],body=[],end=[],cache={},scr=[],_scr={},menu=[],command={},elements;
function run_code(c){
	var w=new wrapper(c),require=c.meta.require||[],i,r,f,code=[];
	elements.forEach(function(i){code.push(i+'=this.'+i);});
	code=['(function(){var '+code.join(',')+';'];
	for(i=0;i<require.length;i++) try{
		r=cache[require[i]];if(!r) continue;
		code.push(utf8decode(r));
	}catch(e){opera.postError(e+'\n'+e.stacktrace);}
	code.push(c.code);
	code.push('}).apply(window,[]);');
	this.code=code.join('\n');
	try{with(w) eval(this.code);}catch(e){
		e=e.toString()+'\n'+e.stacktrace;
		i=e.lastIndexOf('\n',e.lastIndexOf('in evaluated code:\n'));
		if(i>0) e=e.slice(0,i);
		opera.postError('Error running script: '+(c.custom.name||c.meta.name||c.id)+'\n'+e);
	}
}
function runStart(){while(start.length) new run_code(start.shift());}
function runBody(){
	if(document.body) {
		window.removeEventListener('DOMNodeInserted',runBody,true);
		while(body.length) new run_code(body.shift());
	}
}
function runEnd(){while(end.length) new run_code(end.shift());}
function loadScript(data){
	var l;
	data.data.forEach(function(i){
		_scr[i.id]=1;
		scr.push(i.id);
		if(data.isApplied&&i.enabled) {
			switch(i.custom['run-at']||i.meta['run-at']){
				case 'document-start': l=start;break;
				case 'document-body': l=body;break;
				default: l=end;
			}
			l.push(i);
		}
	});
	cache=data.cache;
	if(window!==window.top) window.Window.prototype.postMessage.call(window.top,{topic:'VM_Scripts',data:scr},'*');
	runStart();
	window.addEventListener('DOMNodeInserted',runBody,true);
	window.addEventListener('DOMContentLoaded',runEnd,false);
	runBody();
	if(document.readyState=='complete') runEnd();
}
function propertyToString(){return 'Property for Violentmonkey: designed by Gerald';}
function wrapper(c){
	var t=c.meta.namespace||'',n=c.meta.name||'',ckey='val:'+escape(t)+':'+escape(n)+':';
	if(!t&&!n) ckey+=c.id;ckey+=':';t=this;

	// functions and properties
	function wrapFunction(o,i,c){
		var f=function(){
			var r=Function.apply.apply(o[i],[o,arguments]);
			if(c) r=c(r);return r;
		};
		f.__proto__=o[i];f.prototype=o[i].prototype;
		return f;
	}
	function wrapWindow(w){return w==window?t:w;}
	function wrapItem(i){
		try{	// avoid reading protected data*/
			if(typeof window[i]=='function') {
				if(itemWrapper) t[i]=itemWrapper(window,i,wrapWindow);
				else t[i]=window[i];
			} else Object.defineProperty(t,i,{
				get:function(){return wrapWindow(window[i]);},
				set:function(v){window[i]=v;},
			});
		}catch(e){}
	}
	var itemWrapper=null;
	Object.getOwnPropertyNames(window).forEach(wrapItem);
	itemWrapper=wrapFunction;
	n=window;while(n=Object.getPrototypeOf(n)) Object.getOwnPropertyNames(n).forEach(wrapItem);

	function getCache(name){for(var i in resources) if(name==i) return cache[resources[i]];}
	function addProperty(name,prop,obj){
		if('value' in prop) prop.writable=false;
		prop.configurable=false;
		if(!obj) {obj=t;elements.push(name);}
		Object.defineProperty(obj,name,prop);
		if(typeof obj[name]=='function') obj[name].toString=propertyToString;
	}
	var resources=c.meta.resources||{};elements=[];
	addProperty('unsafeWindow',{value:window});
	// GM functions
	// Reference: http://wiki.greasespot.net/Greasemonkey_Manual:API
	addProperty('GM_info',{get:function(){
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
	}});
	addProperty('GM_deleteValue',{value:function(key){widget.preferences.removeItem(ckey+key);}});
	addProperty('GM_getValue',{value:function(k,d){
		var v=widget.preferences.getItem(ckey+k);
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
	}});
	addProperty('GM_listValues',{value:function(){
		var v=[],i,l=ckey.length,k;
		for(i=0;i<widget.preferences.length;i++) {
			k=widget.preferences.key(i);
			if(k.slice(0,l)==ckey) v.push(k.slice(l));
		}
		return v;
	}});
	addProperty('GM_setValue',{value:function(key,val){
		var t=(typeof val)[0];
		switch(t){
			case 'o':val=t+JSON.stringify(val);break;
			default:val=t+val;
		}
		widget.preferences.setItem(ckey+key,val);
	}});
	addProperty('GM_getResourceText',{value:function(name){
		var b=getCache(name);
		if(b) b=utf8decode(b);
		return b;
	}});
	addProperty('GM_getResourceURL',{value:function(name){
		var b=getCache(name);
		if(b) b='data:;base64,'+window.btoa(b);
		return b;
	}});
	addProperty('GM_addStyle',{value:function(css){
		var v=document.createElement('style');
		v.innerHTML=css;
		(document.head||document.documentElement).appendChild(v);
		return v;
	}});
	addProperty('GM_log',{value:console.log});
	addProperty('GM_openInTab',{value:function(url){window.open(url);}});
	addProperty('GM_registerMenuCommand',{value:function(cap,func,acc){menu.push([cap,acc]);command[cap]=func;}});
	addProperty('GM_xmlhttpRequest',{value:function(details){
		// convert url to absolute path
		var a=document.createElement('a');
		a.href=details.url;
		details.url=a.href;
		delete a;
		// synchronous mode not supported
		var r=new Request(details);
		return r.req;
	}});
}
if(!installCallback) opera.extension.postMessage({topic:'FindScript',data:window.location.href});
