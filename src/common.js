var $ = document.querySelector.bind(document);
var $$ = document.querySelectorAll.bind(document);
var stopPropagation = function(e) {e.stopPropagation();};
if(opera.extension) {
	var bg = opera.extension.bgProcess, _;
	if(bg) _ = bg._;
}

var defaults = {
	isApplied: true,
	autoUpdate: true,
	lastUpdate: 0,
	showButton: true,
	showBadge: true,
	exportValues: true,
	closeAfterInstall: false,
};
function getOption(key, def) {
	var value = widget.preferences.getItem(key), obj;
	if(value) try {
		obj = JSON.parse(value);
	} catch(e) {
		obj = def;
	} else obj = def;
	if(typeof obj === 'undefined')
		obj = defaults[key];
	return obj;
}
function setOption(key, value) {
	if (key in defaults)
		widget.preferences.setItem(key, JSON.stringify(value));
}
function getAllOptions() {
	var options = {};
	for(var i in defaults) options[i] = getOption(i);
	return options;
}

function initI18n(){
	var nodes=document.querySelectorAll('*[data-i18n]');
	for(var i=0;i<nodes.length;i++) nodes[i].innerHTML=bg._(nodes[i].getAttribute('data-i18n'));
}
function getLocaleString(dict,key){
	var lang=[navigator.language],i,lkey;
	i=lang[0].indexOf('-');
	if(i>0) {
		lang[0]=lang[0].substr(0,i+1)+lang[0].substr(i+1).toUpperCase();
		lang.push(lang[0].substr(0,i));
	}
	for(i=0;i<lang.length;i++) {
		lkey=key+':'+lang[i];
		if(lkey in dict) {
			key=lkey;break;
		}
	}
	return dict[key]||'';
}

function safeHTML(html) {
	return html.replace(/[&<]/g, function(m) {
		return {
			'&': '&amp;',
			'<': '&lt;',
		}[m];
	});
}
