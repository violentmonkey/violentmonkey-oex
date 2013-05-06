function $(i){return document.getElementById(i);}
var bg=opera.extension.bgProcess,P=$('popup'),C=$('commands'),
		pT=P.querySelector('.top'),pB=P.querySelector('.bot'),
		cT=C.querySelector('.top'),cB=C.querySelector('.bot'),
		_=bg.getI18nString,tab=bg.opera.extension.tabs.getFocused();
function loadItem(d,c){
	if(c) {
		d.firstChild.innerText=d.symbol;
		d.classList.remove('disabled');
	} else {
		d.firstChild.innerText='';
		d.classList.add('disabled');
	}
}
function addItem(h,c){
	var d=document.createElement('div');
	d.innerHTML='<span></span>'+h;
	if('title' in c) {
		d.title=typeof c.title=='string'?c.title:h;
		delete c.title;
	}
	d.className='ellipsis';
	c.holder.appendChild(d);
	if('symbol' in c) d.firstChild.innerText=c.symbol;
	else if('data' in c) c.symbol='✓';
	for(h in c) d[h]=c[h];
	if('data' in c) loadItem(d,c.data);
}
function menuCommand(e){e=e.target;tab.postMessage({topic:'Command',data:e.cmd});}
function menuScript(i) {
	var s=bg.map[i];if(!s) return;
	var n=s.meta.name?s.meta.name.replace(/&/g,'&amp;').replace(/</g,'&lt;'):'<em>'+_('Null name')+'</em>';
	addItem(n,{holder:pB,data:s.enabled,title:s.meta.name,onclick:function(e){
		loadItem(this,s.enabled=!s.enabled);
		bg.saveScript(s);bg.optionsUpdate({item:bg.ids.indexOf(s.id),status:0});
	}});
}
function load(e,data){
	addItem(_('Manage scripts'),{holder:pT,symbol:'➤',title:true,onclick:function(){
		bg.opera.extension.tabs.create({url:'/options.html'}).focus();
	}});
	if(data) addItem(_('Find scripts for this site'),{holder:pT,symbol:'➤',title:true,onclick:function(){
		var q='site:userscripts.org+inurl:show+'+tab.url.replace(/^.*?:\/\/([^\/]*?)\.\w+\/.*$/,function(v,g){
			return g.replace(/\.(com|..)$/,'').replace(/\./g,'+');
		}),url=bg.format(bg.getString('search'),q);
		bg.opera.extension.tabs.create({url:url}).focus();
	}});
	if(data&&data[0]&&data[0].length) {
		addItem(_('Back'),{holder:cT,symbol:'◄',title:true,onclick:function(){
			C.classList.add('hide');P.classList.remove('hide');
			bg.button.popup.height=P.offsetHeight;
		}});
		cT.appendChild(document.createElement('hr'));
		data[0].forEach(function(i){addItem(i[0],{holder:cB,symbol:'➤',title:true,onclick:menuCommand,cmd:i[0]});});
		addItem(_('Script commands...'),{holder:pT,symbol:'➤',title:true,onclick:function(){
			P.classList.add('hide');C.classList.remove('hide');
			bg.button.popup.height=C.offsetHeight;
			setTimeout(function(){cB.style.pixelHeight=innerHeight-cB.offsetTop;},0);
		}});
	}
	addItem(_('Scripts enabled'),{holder:pT,data:bg.isApplied,title:true,onclick:function(e){
		bg.setItem('isApplied',bg.isApplied=!bg.isApplied);bg.updateIcon();loadItem(this,bg.isApplied);
	}});
	if(data&&data[1]&&data[1].length) {
		pT.appendChild(document.createElement('hr'));
		data[1].forEach(menuScript);
	}
	bg.button.popup.height=P.offsetHeight;
	setTimeout(function(){pB.style.pixelHeight=innerHeight-pB.offsetTop;},0);
}
bg.messages['GotPopup']=load;
try{tab.postMessage({topic:'GetPopup'});}catch(e){load();}
