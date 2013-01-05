function $(i){return document.getElementById(i);}
var bg=opera.extension.bgProcess,P=$('popup'),_=bg.getI18nString,
	tab=bg.opera.extension.tabs.getFocused();
function loadItem(d,c){
	if(c) {
		d.firstChild.innerText=d.symbol;
		d.classList.remove('disabled');
	} else {
		d.firstChild.innerText='';
		d.classList.add('disabled');
	}
}
function addItem(h,t,c){
	var d=document.createElement('label'),s='';
	d.innerHTML='<span></span>'+h;
	if(t) {if(typeof t!='string') t=h;d.title=t;}
	d.className='ellipsis';
	P.appendChild(d);
	if('symbol' in c) d.firstChild.innerText=c.symbol;
	else if('data' in c) c.symbol='✓';
	for(t in c) d[t]=c[t];
	if('data' in c) loadItem(d,c.data);
}
function menuCommand(e){e=e.target;bg.postMessage('Command',null,e.cmd);}
function menuScript(i) {
	var s=bg.map[i];if(!s) return;
	var n=s.meta.name?s.meta.name.replace(/&/g,'&amp;').replace(/</g,'&lt;'):'<em>'+_('Null name')+'</em>';
	addItem(n,i[0],{data:s.enabled,onclick:function(e){
		loadItem(this,s.enabled=!s.enabled);bg.saveScripts();
	}});
}
function load(e,data){
	addItem(_('Manage scripts'),true,{symbol:'➤',onclick:function(){
		bg.opera.extension.tabs.create({url:'/options.html'}).focus();
	}});
	if(data) addItem(_('Find scripts for this site'),true,{symbol:'➤',onclick:function(){
		var q='site:userscripts.org+inurl:show+'+tab.url.replace(/^.*?:\/\/([^\/]*?)\.\w+\/.*$/,function(v,g){
			return g.replace(/\.(com|..)$/,'').replace(/\./g,'+');
		}),url=bg.format(bg.search,q);
		return bg.opera.extension.tabs.create({url:url}).focus();
	}});
	addItem(_('Scripts enabled'),true,{data:bg.isApplied,onclick:function(e){
		bg.saveSetting('isApplied',bg.isApplied=!bg.isApplied);bg.updateIcon();loadItem(this,bg.isApplied);
	}});
	if(data&&data[0]&&data[0].length) {
		P.appendChild(document.createElement('hr'));
		for(var i=0;i<data[0].length;i++) addItem(data[0][i][0],true,{symbol:'➤',onclick:menuCommand,cmd:data[0][i][0]});
	}
	if(data&&data[1]&&data[1].length) {
		P.appendChild(document.createElement('hr'));
		data[1].forEach(menuScript);
	}
	bg.button.popup.height=document.body.offsetHeight;
}
if(tab.port) bg.postMessage('GetPopup','GotPopup',null,load); else load();
