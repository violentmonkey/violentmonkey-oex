function $(i){return document.getElementById(i);}
var bg=opera.extension.bgProcess,L=$('sList'),O=$('overlay'),_=bg.getI18nString;
function fillHeight(e,b,p){
	if(p==undefined) p=e.parentNode;
	b=b?b.offsetTop+b.offsetHeight:0;
	e.style.pixelHeight=e.offsetHeight+window.getComputedStyle(p).pixelHeight-b;
}
function fillWidth(e,p){
	if(p==undefined) p=e.parentNode;
	e.style.pixelWidth=e.offsetWidth+window.getComputedStyle(p).pixelWidth-e.offsetLeft-e.offsetWidth;
}
fillHeight(L,$('footer'),document.body);

// Main options
function updateMove(d){
	if(!d) return;
	var b=d.querySelectorAll('.move');
	b[0].disabled=!d.previousSibling;
	b[1].disabled=!d.nextSibling;
}
function allowUpdate(n){return n.update&&n.meta.updateURL&&n.meta.downloadURL;}
function loadItem(d,n){
	if(!n.enabled) d.className='disabled';
	d.innerHTML='<a class="name ellipsis"></a>'
	+'<span class=author></span>'
	+'<span class=version>'+(n.meta.version?'v'+n.meta.version:'')+'</span>'
	+(allowUpdate(n)?'<a data=update class=update href=#>'+_('Check for updates')+'</a> ':'')
	+'<div class="descrip ellipsis"></div>'
	+'<span class=message></span>'
	+'<div class=panel>'
		+'<button data=edit>'+_('Edit')+'</button> '
		+'<button data=enable>'+_(n.enabled?'Disable':'Enable')+'</button> '
		+'<button data=remove>'+_('Remove')+'</button>'
		+'<button data=up class=move>'+_('Up')+'</button>'
		+'<button data=down class=move>'+_('Down')+'</button>'
	+'</div>';
	with(d.querySelector('.name')) {
		title=n.meta.name||'';
		if(n.url) href=n.url;
		innerHTML=n.meta.name?n.meta.name.replace(/&/g,'&amp;').replace(/</g,'&lt;'):'<em>'+_('Null name')+'</em>';
	}
	if(n.meta.author) d.querySelector('.author').innerText=_('Author: ')+n.meta.author;
	with(d.querySelector('.descrip')) innerText=title=n.meta.description||'';
}
function addItem(n){
	var d=document.createElement('div');
	loadItem(d,n);
	L.appendChild(d);
	return d;
}
function moveUp(i,p){
	var x=bg.scripts[i];
	bg.scripts[i]=bg.scripts[i-1];
	bg.scripts[i-1]=x;
	L.insertBefore(p,p.previousSibling);
	bg.saveScripts();
	updateMove(p);updateMove(p.nextSibling);
}
L.onclick=function(e){
	var o=e.target,d=o.getAttribute('data'),p;
	if(!d) return;
	e.preventDefault();
	for(p=o;p&&p.parentNode!=L;p=p.parentNode);
	var i=Array.prototype.indexOf.call(L.childNodes,p);
	switch(d){
		case 'edit':
			edit(i);
			break;
		case 'enable':
			if(bg.scripts[i].enabled=!bg.scripts[i].enabled) {
				p.classList.remove('disabled');
				o.innerText=_('Disable');
			} else {
				p.classList.add('disabled');
				o.innerText=_('Enable');
			}
			bg.saveScripts();
			break;
		case 'remove':
			bg.removeScript(i);
			L.removeChild(p);
			if(!i) updateMove(L.firstChild);
			if(i>=L.childNodes.length) updateMove(L.lastChild);
			break;
		case 'update':
			check(i);
			break;
		case 'up':
			if(p.previousSibling) moveUp(i,p);
			break;
		case 'down':
			if(p.nextSibling) moveUp(i+1,p.nextSibling);
			break;
	}
};
function load() {
	L.innerHTML='';
	bg.scripts.forEach(function(i){addItem(i);});
	updateMove(L.firstChild);updateMove(L.lastChild);
}
load();
bg.optionsLoad(window);
$('bNew').onclick=function(){
	var d=bg.newScript(true);d=addItem(d);
	updateMove(d);updateMove(d.previousSibling);
};
$('bUpdate').onclick=function(){for(var i=0;i<bg.scripts.length;i++) if(allowUpdate(bg.scripts[i])) check(i);};
if(!($('cDetail').checked=bg.getSetting('showDetails',false))) L.classList.add('simple');
$('cDetail').onchange=function(){L.classList.toggle('simple');bg.saveSetting('showDetails',this.checked);};
function showDialog(D,o){
	if(o==undefined||o) {O.classList.remove('hide');setTimeout(function(){O.classList.add('overlay');},1);}
	O.onclick=D.onclose;
	D.classList.remove('hide');
	D.style.top=(window.innerHeight-D.offsetHeight)/2+'px';
	D.style.left=(window.innerWidth-D.offsetWidth)/2+'px';
}
function closeDialog(D,o){
	if(o==undefined||o) {O.classList.remove('overlay');setTimeout(function(){O.classList.add('hide');},500);}
	D.classList.add('hide');
}

// Advanced
var A=$('advanced');
$('bAdvanced').onclick=function(){showDialog(A);};
$('cShow').checked=bg.getSetting('showButton',true);
$('cShow').onchange=function(){bg.showButton(bg.saveSetting('showButton',this.checked));};
$('cInstall').checked=bg.installFile;
$('cInstall').onchange=function(){bg.saveSetting('installFile',bg.installFile=this.checked);};
$('tSearch').value=bg.search;
$('bDefSearch').onclick=function(){$('tSearch').value=bg.search=_('Search$1');};
$('aExport').onclick=function(){closeDialog(A,0);showDialog(X,0);xLoad();};
$('aVacuum').onclick=function(){var t=this;bg.vacuum(function(){t.innerHTML=_('Data vacuumed');t.disabled=true;});};
A.onclose=$('aClose').onclick=function(){
	bg.search=bg.saveSetting('search',$('tSearch').value);
	closeDialog(A);
};

// Export
var X=$('export'),xL=$('xList');
function xLoad() {
	xL.innerHTML='';
	for(var i=0;i<bg.scripts.length;i++) {
		var d=document.createElement('div');
		d.className='ellipsis';
		d.innerText=d.title=bg.scripts[i].meta.name;
		xL.appendChild(d);
	}
}
xL.onclick=function(e){
	var t=e.target;
	if(t.parentNode!=this) return;
	t.classList.toggle('selected');
};
$('bSelect').onclick=function(){
	var c=xL.childNodes,v,i;
	for(i=0;i<c.length;i++) if(!c[i].classList.contains('selected')) break;
	v=i<c.length;
	for(i=0;i<c.length;i++) if(v) c[i].classList.add('selected'); else c[i].classList.remove('selected');
};
$('bExport').onclick=function(){
	var z=new JSZip(),n,names={};
	for(i=0;i<bg.scripts.length;i++) if(xL.childNodes[i].classList.contains('selected')) {
		n=bg.scripts[i].meta.name||'Noname';s=0;
		while(names[n]) n=bg.scripts[i].meta.name+(++s);
		names[n]=1;
		z.file(n+'.user.js',bg.scripts[i].code);
	}
	n=z.generate();
	window.open('data:application/zip;base64,'+n);
};
X.onclose=$('bClose').onclick=function(){closeDialog(X);};

// Update checker
function canUpdate(o,n){
	o=(o||'').split('.');n=(n||'').split('.');
	var r=/(\d*)([a-z]*)(\d*)([a-z]*)/i;
	while(o.length&&n.length) {
		var vo=o.shift().match(r),vn=n.shift().match(r);
		vo.shift();vn.shift();	// origin string
		vo[0]=parseInt(vo[0]||0,10);
		vo[2]=parseInt(vo[2]||0,10);
		vn[0]=parseInt(vn[0]||0,10);
		vn[2]=parseInt(vn[2]||0,10);
		while(vo.length&&vn.length) {
			var eo=vo.shift(),en=vn.shift();
			if(eo!=en) return eo<en;
		}
	}
	return n.length;
}
function check(i){
	var l=L.childNodes[i],s=bg.scripts[i],o=l.querySelector('[data=update]'),m=l.querySelector('.message');
	m.innerHTML=_('Checking for updates...');
	o.classList.add('hide');
	function update(){
		m.innerHTML=_('Updating...');
		req=new window.XMLHttpRequest();
		req.open('GET', s.meta.downloadURL, true);
		req.onload=function(){
			if(req.status==200) {
				bg.parseScript(null,req.responseText,s);
				l.querySelector('.version').innerHTML=s.meta.version?'v'+s.meta.version:'';
				m.innerHTML=_('Update finished!');
			} else m.innerHTML=_('Update failed!');
			o.classList.remove('hide');
		};
		req.send();
	}
	var req=new window.XMLHttpRequest();
	req.open('GET', s.meta.updateURL, true);
	req.onload=function(){
		try {
			var r=bg.parseMeta(req.responseText);
			if(canUpdate(s.meta.version,r.version)) return update();
			else m.innerHTML=_('No update is found!');
		} catch(e) {
			m.innerHTML=_('Failed fetching update information.');
			opera.postError(e);
		}
		o.classList.remove('hide');
	};
	req.send();
}

// Script Editor
var M=$('editor'),T=$('mCode'),U=$('mUpdate'),H=$('mURL');
function edit(i){
	showDialog(M);fillHeight(T,T.nextElementSibling);fillWidth(H);
	M.dirty=false;M.scr=bg.scripts[i];M.cur=L.childNodes[i];
	T.value=M.scr.code;U.checked=M.scr.update;H.value=M.scr.url||'';
}
function mSave(){
	if(M.dirty){
		M.scr.update=U.checked;M.scr.url=H.value;
		bg.parseScript(null,T.value,M.scr);
		M.dirty=false;loadItem(M.cur,M.scr);updateMove(M.cur);
		return true;
	} else return false;
}
function mClose(){
	closeDialog(M);
	M.cur=M.scr=null;
}
T.onchange=U.onchange=function(e){M.dirty=true;};
$('mSave').onclick=function(){mSave();};
$('mSaveClose').onclick=function(){mSave();mClose();};
M.onclose=$('mClose').onclick=function(){
	if(M.dirty) {
		var e=confirm(_('Modifications are not saved!\nClick OK to discard them or Cancel to stay.'));
		if(!e) return;
	}
	mClose();
};
