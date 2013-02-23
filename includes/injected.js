/**
 *  Base64 encode / decode
 *  http://www.webtoolkit.info/
 **/
function base64encode(input) {
	var _keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
	var output = "";
	var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
	var i = 0;
	while (i < input.length) {
		chr1 = input.charCodeAt(i++);
        	chr2 = input.charCodeAt(i++);
        	chr3 = input.charCodeAt(i++);
		enc1 = chr1 >> 2;
		enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
		enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
		enc4 = chr3 & 63;
		if (isNaN(chr2)) {
			enc3 = enc4 = 64;
		} else if (isNaN(chr3)) {
			enc4 = 64;
		}
		output = output +
		_keyStr.charAt(enc1) + _keyStr.charAt(enc2) +
		_keyStr.charAt(enc3) + _keyStr.charAt(enc4);
	}
	return output;
}
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
	d.style='position:fixed;top:40%;left:40%;right:40%;border-radius:5px;background:orange;padding:20px;z-index:9999;box-shadow:5px 10px 15px rgba(0,0,0,0.4);transition:opacity 1s linear;opacity:0;text-align:left;';
	d.innerHTML=data;
	document.body.appendChild(d);
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
	this.abort=function(){opera.extension.postMessage({topic:'AbortRequest',data:this.id});};
	this.req={abort:this.abort};
	qrequests.push(this);
	opera.extension.postMessage({topic:'GetRequestId'});
};

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
})()&&window.location.host=='userscripts.org') window.addEventListener('click',function(e){
	if(/\.user\.js$/.test(e.target.href)) {
		e.preventDefault();
		installCallback=function(){opera.extension.postMessage({topic:'InstallScript',data:e.target.href});};
		opera.extension.postMessage({topic:'InstallScript'});
	}
},false);

// For injected scripts
var start=[],body=[],end=[],cache={},scr=[],menu=[],command={},elements;
function run_code(c){
	var w=new wrapper(c),require=c.meta.require||[],i,r,f,code=[];
	elements.forEach(function(i){code.push(i+'=window.'+i);});
	code=['(function(){var '+code.join(',')+';try{'];
	for(i=0;i<require.length;i++) try{
		r=cache[require[i]];if(!r) continue;
		code.push(utf8decode(r));
	}catch(e){opera.postError(e+'\n'+e.stacktrace);}
	code.push(c.code);
	code.push('}catch(e){opera.postError(e+"\\n"+e.stacktrace);}})();');
	this.code=code.join('\n');
	try{with(w) eval(this.code);}catch(e){opera.postError(e+'\n'+e.stacktrace);}
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
	runStart();
	window.addEventListener('DOMNodeInserted',runBody,true);
	window.addEventListener('DOMContentLoaded',runEnd,false);
	runBody();
	if(document.readyState=='complete') runEnd();
}
function propertyToString(){return 'Property for Violentmonkey: designed by Gerald';}
function wrapper(c){
	var t=c.meta.namespace||'',n=c.meta.name||'',ckey='val:'+escape(t)+':'+escape(n)+':';
	if(!t&&!n) ckey+=n.id;ckey+=':';t=this;elements=[];
	function addProperty(name,prop){t[name]=prop;t[name].toString=propertyToString;elements.push(name);}
	var resources=c.meta.resources||{};
	addProperty('unsafeWindow',window);
	// GM functions
	// Reference: http://wiki.greasespot.net/Greasemonkey_Manual:API
	addProperty('GM_deleteValue',function(key){widget.preferences.removeItem(ckey+key);});
	addProperty('GM_getValue',function(key,def){
		var v=widget.preferences.getItem(ckey+key);
		if(v==null) return def;
		def=v.substr(1);
		switch(v[0]){
			case 'n': return parseInt(def,10);
			case 'b': return !!JSON.parse(def);
			default: return def;
		}
	});
	addProperty('GM_listValues',function(){
		var v=[],i,l=ckey.length,k;
		for(i=0;i<widget.preferences.length;i++) {
			k=widget.preferences.key(i);
			if(k.substr(0,l)==ckey) v.push(k.substr(l));
		}
		return v;
	});
	addProperty('GM_setValue',function(key,val){
		switch(typeof val){
			case 'number':val='n'+val;break;
			case 'boolean':val='b'+val;break;
			default:val='s'+val;
		}
		widget.preferences.setItem(ckey+key,val);
	});
	function getCache(name){for(var i in resources) if(name==i) return cache[resources[i]];}
	addProperty('GM_getResourceText',function(name){
		var b=getCache(name);
		if(b) b=utf8decode(b);
		return b;
	});
	addProperty('GM_getResourceURL',function(name){
		var b=getCache(name);
		if(b) b='data:;base64,'+base64encode(b);
		return b;
	});
	addProperty('GM_addStyle',function(css){
		var v=document.createElement('style');
		v.innerHTML=css;
		(document.head||document.documentElement).appendChild(v);
		return v;
	});
	addProperty('GM_log',console.log);
	addProperty('GM_openInTab',function(url){window.open(url);});
	addProperty('GM_registerMenuCommand',function(cap,func,acc){menu.push([cap,acc]);command[cap]=func;});
	addProperty('GM_xmlhttpRequest',function(details){
		// synchronous mode not supported
		var r=new Request(details);
		return r.req;
	});
	addProperty('VM_info',{version:widget.version});
	// functions and properties
	function wrapFunction(o,i,c){
		var f=function(){var r=o[i].apply(o,arguments);if(c) r=c(r);return r;};
		return f;
	}
	function wrapWindow(w){return w==window?t:w;}
	function wrapItem(i,nowrap){
	       	try{	// avoid reading protected data*/
			if(typeof window[i]=='function') {
				if(nowrap) t[i]=window[i];
				else t[i]=wrapFunction(window,i,wrapWindow);
			}
			else {
				t.__defineGetter__(i,function(){return wrapWindow(window[i]);});
				t.__defineSetter__(i,function(v){window[i]=v;});
			}
		}catch(e){}
	}
	Object.getOwnPropertyNames(window).forEach(wrapItem);
	for(n in window.Window?window.Window.prototype:window) wrapItem(n);
}
if(!installCallback) opera.extension.postMessage({topic:'FindScript',data:window.location.href});
