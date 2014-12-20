var P=$('#main'),C=$('#commands'),
		pT=P.querySelector('.top'),pB=P.querySelector('.bot'),
		cT=C.querySelector('.top'),cB=C.querySelector('.bot'),
		tab=bg.opera.extension.tabs.getFocused(),ia=null;
function loadItem(d,c){
	d.data=c;
	if(d.symbols) {
		d.firstChild.className='fa '+d.symbols[c?1:0];
		if(d.symbols.length>1) {
			if(c) d.classList.remove('disabled');
			else d.classList.add('disabled');
		}
	}
}
function addItem(h,c,b){
	var d=document.createElement('div');
	d.innerHTML='<i></i> '+h;
	if('title' in c) {
		d.title=typeof c.title=='string'?c.title:h;
		delete c.title;
	}
	c.holder.insertBefore(d,b);
	for(h in c) d[h]=c[h];
	if(d.symbols) loadItem(d,d.data);
	return d;
}
function menuCommand(e){e=e.target;tab.postMessage({topic:'Command',data:e.cmd});}
function menuScript(s) {
	if(s) {
		var n=s.custom.name||getLocaleString(s.meta,'name'),d;
		n=n?n.replace(/&/g,'&amp;').replace(/</g,'&lt;'):'<em>'+_('labelNoName')+'</em>';
		d=addItem(n,{
			holder:pB,
			symbols: ['fa-times','fa-check'],
			className: 'ellipsis',
			title:s.meta.name,
			onclick:function(e){
				bg.enableScript(s.id,!s.enabled,function(){loadItem(d,s.enabled);});
			},
			data:s.enabled,
		});
	}
}
function initMenu(){
	addItem(_('menuManageScripts'),{
		holder:pT,
    symbols: ['fa-hand-o-right'],
    //title: true,
		onclick:function(){
			bg.opera.extension.tabs.create({url:'/options.html'}).focus();
		},
	});
  if(/^https?:\/\//i.test(tab.url))
		addItem(_('menuFindScripts'),{
			holder:pT,
			symbols: ['fa-hand-o-right'],
			//title: true,
			onclick:function(){
				var h=tab.url.match(/:\/\/(?:www\.)?([^\/]*)/);
				bg.opera.extension.tabs.create({url:'https://greasyfork.org/scripts/search?q='+h[1]}).focus();
			},
		});
	ia=addItem(_('menuScriptEnabled'),{
		holder:pT,
		symbols: ['fa-times','fa-check'],
    //title: true,
		data:bg.settings.isApplied,
		onclick:function(e){
			loadItem(this,bg.setOption('isApplied',!bg.settings.isApplied));
			bg.updateIcon();
		},
	});
	bg.button.popup.height=P.offsetHeight;
}
function adjustSize(){
	bg.button.popup.height=P.offsetHeight;
	setTimeout(function(){
		pB.style.pixelHeight=innerHeight-pB.offsetTop;
	},0);
}
function load(data){
	if(data&&data[0]&&data[0].length) {
		addItem(_('menuBack'),{
			holder:cT,
      symbols: ['fa-arrow-left'],
			//title:true,
			onclick:function(){
				C.classList.add('hide');P.classList.remove('hide');
				bg.button.popup.height=P.offsetHeight;
			},
		});
		cT.appendChild(document.createElement('hr'));
		data[0].forEach(function(i){addItem(i[0],{
			holder:cB,
			className: 'ellipsis',
			symbols: ['fa-hand-o-right'],
			//title:true,
			onclick:menuCommand,
			cmd:i[0],
		});});
		addItem(_('menuCommands'),{
			holder:pT,
      symbols: ['fa-arrow-right'],
      //title: true,
			onclick:function(){
				P.classList.add('hide');C.classList.remove('hide');
				bg.button.popup.height=C.offsetHeight;
				setTimeout(function(){cB.style.pixelHeight=innerHeight-cB.offsetTop;},0);
			},
		},ia);
	}
	if(data&&data[1]&&data[1].length) {
		pT.appendChild(document.createElement('hr'));
		data[1].forEach(function(i){menuScript(bg.metas[i]);});
	}
	adjustSize();
}
initMenu();load(bg.tabData);
