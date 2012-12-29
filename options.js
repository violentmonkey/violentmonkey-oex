function $(i){return document.getElementById(i);}
var bg=opera.extension.bgProcess,L=$('sList'),O=$('overlay'),_=bg.getI18nString;

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
	+'<span class=author>'+(n.meta.author?_('Author: ')+n.meta.author:'')+'</span>'
	+'<span class=version>'+(n.meta.version?'v'+n.meta.version:'')+'</span>'
	+'<div class="descrip ellipsis"></div>'
	+'<span class=message></span>'
	+'<div class=panel>'
		+(allowUpdate(n)?'<button data="update">'+_('Update')+'</button> ':'')
		+'<button data="edit">'+_('Edit')+'</button> '
		+'<button data="enable">'+_(n.enabled?'Disable':'Enable')+'</button> '
		+'<button data="remove">'+_('Remove')+'</button>'
		+'<button data="up" class=move>'+_('Up')+'</button>'
		+'<button data="down" class=move>'+_('Down')+'</button>'
	+'</div>';
	with(d.firstChild) innerText=title=n.meta.name;
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
	var o=e.target;
	if(o.tagName!='BUTTON') return;
	e.preventDefault();
	e=o.getAttribute('data');
	var p=o.parentNode.parentNode;
	var i=Array.prototype.indexOf.call(L.childNodes,p);
	switch(e){
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
L.innerHTML='';
bg.scripts.forEach(function(i){addItem(i);});
updateMove(L.firstChild);updateMove(L.lastChild);
$('bNew').onclick=function(){
	var d=bg.newScript(true);d=addItem(d);
	updateMove(d);updateMove(d.previousSibling);
};
$('bUpdate').onclick=function(){for(var i=0;i<bg.scripts.length;i++) if(allowUpdate(bg.scripts[i])) check(i);};
if(!($('cDetail').checked=bg.getSetting('showDetails',false))) L.classList.add('simple');
$('cDetail').onchange=function(){L.classList.toggle('simple');bg.saveSetting('showDetails',this.checked);};
function showDialog(D){
	O.classList.add('o_in');
	O.onclick=D.onclose;
	D.classList.remove('hide');
	D.style.top=(window.innerHeight-D.offsetHeight)/2+'px';
	D.style.left=(window.innerWidth-D.offsetWidth)/2+'px';
}
function closeDialog(D){
	O.classList.remove('o_in');
	D.classList.add('hide');
}

// Advanced
var A=$('advanced');
$('bAdvanced').onclick=function(){showDialog(A);};
$('cShow').checked=bg.getSetting('showButton',true);
$('cShow').onchange=function(){bg.showButton(bg.saveSetting('showButton',this.checked));};
$('cInstall').checked=bg.getSetting('installFile',true);
$('cInstall').onchange=function(){bg.saveSetting('installFile',this.checked);};
$('aExport').onclick=function(){closeDialog(A);showDialog(X);xLoad();};
$('aVacuum').onclick=function(){var t=this;bg.vacuum(function(){t.innerHTML=_('Data vacuumed');t.disabled=true;});};
A.onclose=$('aClose').onclick=function(){closeDialog(A);};

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
	var l=L.childNodes[i],s=bg.scripts[i],o=l.querySelector('button[data=update]'),m=l.querySelector('.message');
	m.innerHTML=_('Checking for updates...');
	o.disabled=true;
	function update(){
		m.innerHTML=_('Updating...');
		req=new window.XMLHttpRequest();
		req.open('GET', s.meta.downloadURL, true);
		req.onreadystatechange=function(){
			if(req.readyState==4) {
				if(req.status==200) {
					bg.parseScript(null,req.responseText,s);
					l.querySelector('.version').innerHTML=s.meta.version?'v'+s.meta.version:'';
					m.innerHTML=_('Update finished!');
				} else m.innerHTML=_('Update failed!');
				o.disabled=false;
			}
		};
		req.send();
	}
	var req=new window.XMLHttpRequest();
	req.open('GET', s.meta.updateURL, true);
	req.onreadystatechange=function(){
		if(req.readyState==4) try {
			var r=bg.parseMeta(req.responseText);
			if(canUpdate(s.meta.version,r.version)) return update();
			else m.innerHTML=_('No update is found!');
		} catch(e) {
			m.innerHTML=_('Failed fetching update information.');
			opera.postError(e);
		}
		o.disabled=false;
	};
	req.send();
}

// Script Editor
var M=$('editor'),T=$('mCode'),U=$('mUpdate');
function edit(i){
	showDialog(M);
	M.dirty=false;M.scr=bg.scripts[i];M.cur=L.childNodes[i];
	T.value=M.scr.code;U.checked=M.scr.update;
}
function mSave(){
	if(M.dirty){
		M.scr.update=U.checked;bg.parseScript(null,T.value,M.scr);
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
