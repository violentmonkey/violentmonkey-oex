var $=document.querySelector.bind(document),bg=opera.extension.bgProcess,_=bg._;
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
