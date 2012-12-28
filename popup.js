function $(i){return document.getElementById(i);}
var bg=opera.extension.bgProcess,P=$('popup'),_=bg.getI18nString,
	tab=bg.opera.extension.tabs.getFocused();
function loadItem(d,c){
	if(c) d.classList.remove('disabled');
	else d.classList.add('disabled');
}
function addItem(h,t,c){
	var d=document.createElement('label'),s='';
	if('data' in c) s+='<input type=checkbox>';
	else s+='<span>>></span>';
	d.innerHTML=s+h;
	if(t) {if(typeof t!='string') t=h;d.title=t;}
	d.className='ellipsis';
	P.appendChild(d);
	if('data' in c){
		loadItem(d,c.data);
		d.firstChild.checked=!!c.data;
		delete c.data;
		d.firstChild.onchange=c.onchange;
		delete c.onchange;
	}
	for(t in c) d[t]=c[t];
}
function menuCommand(e){e=e.target;bg.postMessage('Command',null,e.cmd);}
function menuScript(i) {
	var s=bg.map[i];if(!s) return;
	var n=(s.meta.name||'('+_('Null')+')').replace(/&/g,'&amp;').replace(/</g,'&lt;');
	addItem(n,i[0],{data:s.enabled,onchange:function(e){
		loadItem(this.parentNode,s.enabled=this.checked);bg.saveScripts();
	}});
}
function load(e,data){
	addItem(_('Manage scripts'),true,{onclick:function(){
		bg.opera.extension.tabs.create({url:'/options.html'}).focus();
	}});
	if(data) addItem(_('Search scripts for this site'),true,{onclick:function(){
		var q='site:userscripts.org+inurl:show+'+tab.url.replace(/^.*?:\/\/([^\/]*?)\.\w+\/.*$/,function(v,g){
			return g.replace(/\.(com|..)$/,'').replace(/\./g,'+');
		});
		return bg.opera.extension.tabs.create({url:'http://www.baidu.com/s?wd='+q}).focus();
		//return bg.opera.extension.tabs.create({url:'http://www.google.com.hk/search?q='+q}).focus();
	}});
	addItem(_('Scripts enabled'),true,{data:bg.isApplied,onchange:function(e){
		loadItem(this.parentNode,bg.saveSetting('isApplied',bg.isApplied=this.checked));bg.updateIcon();
	}});
	P.appendChild(document.createElement('hr'));
	if(data&&data[0]&&data[0].length) {
		for(var i=0;i<data[0].length;i++) addItem(data[0][i][0],true,{onclick:menuCommand,cmd:data[0][i][0]});
		P.appendChild(document.createElement('hr'));
	}
	if(data&&data[1]&&data[1].length) data[1].forEach(menuScript); else addItem('<em>'+_('Null')+'</em>',_('Null'),{className:'hint'});
	bg.button.popup.height=document.body.offsetHeight;
}
if(tab.port) bg.postMessage('GetPopup','GotPopup',null,load); else load();
