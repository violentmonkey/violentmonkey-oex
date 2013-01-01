(function(){
GM_null=function(name){opera.postError(name+' has not been supported yet!');};

// Messages
callbacks={},requests={};
function postMessage(topic,rtopic,data,func){
	if(rtopic&&func) {
		var f=callbacks[rtopic];
		if(!f) callbacks[rtopic]=f=[];
		f.push(func);
	}
	opera.extension.postMessage({topic:topic,data:data});
}
opera.extension.addEventListener('message', function(e) {
	var message=e.data,c;
	if(message.topic=='HttpRequested') {
		c=requests[message.data.id];
		if(c) c(message.data);
	} else if(message.topic=='GetPopup')
		postMessage('GotPopup',null,[menu,scr]);
	else if(message.topic=='ShowMessage')
		alert(message.data);
	else if(message.topic=='Command') {
		c=command[message.data];if(c) c();
	} else {
		c=callbacks[message.topic];
		if(c&&(c=c.shift())) c(message.data);
	}
}, false);

// For UserScripts installation
if(/\.user\.js$/.test(window.location.href)) window.addEventListener('load',function(){
	postMessage('InstallScript','Confirm',null,function(c){
		if(c&&confirm(c)) postMessage('ParseScript',null,document.body.innerText);
	});
}); else window.addEventListener('click',function(e){
	if(/\.user\.js$/.test(e.target.href)) {
		e.preventDefault();
		postMessage('InstallScript',null,e.target.href);
	}
},false);

// For injected scripts
var start=[],body=[],end=[],cache={},scr=[],menu=[],command={};
function run_code(c){
	this.code=c.code;
	this.require=c.meta.require||[];
	this.cache=cache;
	with(new wrapper(c)) {
		for(this.i=0;this.i<this.require.length;this.i++)
			try{eval(this.cache[this.require[this.i]]);}catch(e){opera.postError(e+'\n'+e.stacktrace);}
		try{eval('(function(){'+this.code+'})();');}catch(e){opera.postError(e+'\n'+e.stacktrace);}
	}
}
function runScript(e){
	if(!e||e.type=='readystatechange') {
		var i=['loading','interactive','complete'].indexOf(document.readyState);
		if(i>=0) while(start.length) run_code(start.shift());
		if(i>=1) while(end.length) run_code(end.shift());
	}
	if(!e||e.type=='DOMNodeInserted') {
		if(document.body) {
			window.removeEventListener('DOMNodeInserted',runScript,false);
			while(body.length) run_code(body.shift());
		}
	}
}
function loadScript(data){
	for(var i=0;i<data.length;i++) {
		scr.push(data[i].id);
		if(data[i].enabled) {
			var l;
			switch(data[i].meta['run-at']){
				case 'document-start': l=start;break;
				case 'document-body': l=body;break;
				default: l=end;
			}
			l.push(data[i]);
			(data[i].meta.require||[]).forEach(function(i){cache[i]=null;});
			for(l in data[i].meta.resources) cache[data[i].meta.resources[l]]=null;
		}
	}
	postMessage('LoadCache','LoadedCache',cache,function(d){
		cache=d;document.onreadystatechange=runScript;
		window.addEventListener('DOMNodeInserted',runScript,false);
		runScript();
	});
}
function wrapFunction(o,i,c){
	var f=function(){var r=o[i].apply(o,arguments);if(c) r=c(r);return r;};
	/*var p=function(){};
	p.prototype=o[i].prototype;
	f.prototype=new p();*/
	return f;
}
function wrapper(c){
	var t=this;
	t.unsafeWindow=window;
	var ckey='scriptVals:'+escape(c.meta.name||'')+':'+escape(c.meta.namespace||'')+':';
	var resources=c.meta.resources||{};
	// GM functions
	// Reference: http://wiki.greasespot.net/Greasemonkey_Manual:API
	t.GM_deleteValue=function(key){widget.preferences.removeItem(ckey+key);};
	t.GM_getValue=function(key,def){
		var v=widget.preferences.getItem(ckey+key)||'';
		try{v=JSON.parse(v);}catch(e){v=undefined;}
		if(v==undefined) return def; else return v;
	};
	t.GM_listValues=function(){
		var v=[],i,l=ckey.length,k;
		for(i=0;i<widget.preferences.length;i++) {
			k=widget.preferences.key(i);
			if(k.substr(0,l)==ckey) v.push(k.substr(l));
		}
		return v;
	};
	t.GM_setValue=function(key,val){
		widget.preferences.setItem(ckey+key,JSON.stringify(val));
	};
	t.GM_getResourceText=function(name){for(var i in resources) if(name==i) return cache[resources[i]];};
	t.GM_getResourceURL=function(name){GM_null('GM_getResourceURL');};
	t.GM_addStyle=function(css){
		if(!document.head) return;
		var v=document.createElement('style');
		v.innerHTML=css;
		document.head.appendChild(v);
		return v;
	};
	t.GM_log=console.log;
	t.GM_openInTab=function(url){window.open(url);};
	t.GM_registerMenuCommand=function(cap,func,acc){menu.push([cap,acc]);command[cap]=func;};
	t.GM_xmlhttpRequest=function(details){
		// TODO: synchronous mode
		var async=!details.synchronous;
		function callback(d){
			var c=details['on'+d.evt];
			if(c) c(d.data);
			if(!details.id) for(var i in d.data) r[i]=d.data[i];
			if(d.evt=='load') delete requests[details.id];
		}
		function Request(id){
			details.id=id;
			requests[id]=callback;
			opera.extension.postMessage({topic:'HttpRequest',data:{
				id:id,
				method:details.method,
				url:details.url,
				data:details.data,
				async:async,
				user:details.user,
				password:details.password,
				headers:details.headers,
				overrideMimeType:details.overrideMimeType,
			}});
		};
		var r={abort:function(){postMessage('AbortRequest',null,details.id);}};
		if(async) postMessage('GetRequestId','GotRequestId',null,Request);
		else Request(0);
		return r;
	};
	// functions and properties
	function wrapWindow(w){return w==window?t:w;}
	for(var i in window) try{
		if(typeof window[i]=='function') t[i]=wrapFunction(window,i,wrapWindow);
		else if(typeof window[i]=='object') t[i]=wrapWindow(window[i]);
		else (function(i){
			Object.defineProperty(t,i,{
				get:function(){return wrapWindow(window[i]);},
				set:function(v){window[i]=v;},
				enumerable:true,
				configurable:true
			});
		})(i);
	} catch(e) {}	// avoid reading protected data*/
}
wrapper.prototype=window;
postMessage('FindScript','FoundScript',window.location.href,loadScript);
})();
