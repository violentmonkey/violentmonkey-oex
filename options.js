var $=document.getElementById.bind(document),
		N=$('main'),L=$('sList'),O=$('overlay'),
		bg=opera.extension.bgProcess,_=bg._,cache,divs={};

// Main options
function getIcon(n){
	var c=cache[n.meta.icon];
	if(c) return 'data:image/x;base64,'+btoa(c);
	return 'images/icon64.png';
}
function modifyItem(d,r){
	if(r) {
		if(r.message) d.querySelector('.message').innerHTML=r.message;
		if(d=d.querySelector('.update')) d.classList[r.hideUpdate?'add':'remove']('hide');
	}
}
function allowUpdate(n){return n.update&&(n.custom.updateURL||n.meta.updateURL);}
function loadItem(n,r){
	var d=divs[n.id];
	d.innerHTML='<img class=icon src="'+getIcon(n)+'">'
	+'<a class="name ellipsis" target=_blank></a>'
	+'<span class=author></span>'
	+'<span class=version>'+(n.meta.version?'v'+n.meta.version:'')+'</span>'
	+'<div class=panelT>'
		+(allowUpdate(n)?'<a data=update class=update href=#>'+_('anchorUpdate')+'</a> ':'')
		+'<span class=move data=move>&equiv;</span>'
	+'</div>'
	+'<div class="descrip ellipsis"></div>'
	+'<span class=message></span>'
	+'<div class=panelB>'
		+'<button data=edit>'+_('buttonEdit')+'</button> '
		+'<button data=enable>'+(n.enabled?_('buttonDisable'):_('buttonEnable'))+'</button> '
		+'<button data=remove>'+_('buttonRemove')+'</button>'
	+'</div>';
	d.className=n.enabled?'':'disabled';
	var a=d.querySelector('.name'),b=n.custom.name||n.meta.name;
	a.title=b||'';
	a.innerHTML=b?b.replace(/&/g,'&amp;').replace(/</g,'&lt;'):'<em>'+_('labelNoName')+'</em>';
	if(b=n.custom.homepage||n.meta.homepage) a.href=b;
	if(n.meta.author) d.querySelector('.author').innerText=_('labelAuthor')+n.meta.author;
	a=d.querySelector('.descrip');
	a.innerText=a.title=n.meta.description||'';
	modifyItem(d,r);
}
function addItem(o){
	var d=divs[o.id]=document.createElement('div');
	loadItem(o);
	L.appendChild(d);
}
(function(){
	function getSource(e){
		var o=e.target,p,i;
		for(p=o;p&&p.parentNode!=L;p=p.parentNode);
		i=Array.prototype.indexOf.call(L.childNodes,p);
		return [i,p,o];
	}
	function moveItem(e){
		var m=getSource(e);if(m[0]<0) return;
		if(m[0]>=0&&m[0]!=t) {
			e=m;m=e[1];if(e[0]>t) m=m.nextSibling;
			L.insertBefore(o[1],m);
			t=e[0];
		}
	}
	function movedItem(e){
		if(!moving) return;moving=false;
		o[1].classList.remove('moving');
		L.onmousemove=L.onmouseup=null;L.onmousedown=startMove;
		if(o[0]!=t) bg.move(o[0],t);
	}
	function startMove(e){
		o=getSource(e);t=o[0];
		if(o[2].getAttribute('data')=='move') {
			if(moving) return;moving=true;
			e.preventDefault();
			o[1].classList.add('moving');
			L.onmousedown=null;
			L.onmousemove=moveItem;
			L.onmouseup=movedItem;
		}
	}
	var maps={
		edit:function(i){
			bg.editScript(bg.ids[i],edit);
		},
		enable:function(i,p,o){
			var id=bg.ids[i],s=bg.metas[id];
			bg.enableScript(id,!s.enabled);
		},
		remove:function(i,p){
			bg.removeScript(i);
			L.removeChild(p);
		},
		update:function(i){
			bg.checkUpdate(bg.ids[i]);
		}
	},o,t,moving=false;
	L.onmousedown=startMove;
	L.onclick=function(e){
		var o=getSource(e),d=o[2].getAttribute('data'),f=maps[d];
		if(f) {
			e.preventDefault();
			f.apply(this,o);
		}
	};
})();
$('bNew').onclick=function(){edit(bg.newScript());};
$('bUpdate').onclick=bg.checkUpdateAll;
if(!($('cDetail').checked=bg.settings.showDetails)) L.classList.add('simple');
$('cDetail').onchange=function(){L.classList.toggle('simple');bg.setOption('showDetails',this.checked);};
var panel=null;
function switchTo(D){
	if(panel) panel.classList.add('hide');
	D.classList.remove('hide');panel=D;
}
var dialogs=[];
function showDialog(D,z){
	if(!dialogs.length) {
		O.classList.remove('hide');
		setTimeout(function(){O.classList.add('overlay');},1);
	}
	if(!z) z=dialogs.length?dialogs[dialogs.length-1].zIndex+1:1;
	dialogs.push(D);
	O.style.zIndex=D.style.zIndex=D.zIndex=z;
	D.classList.remove('hide');
	D.style.top=(window.innerHeight-D.offsetHeight)/2+'px';
	D.style.left=(window.innerWidth-D.offsetWidth)/2+'px';
}
function closeDialog(){
	dialogs.pop().classList.add('hide');
	if(dialogs.length) O.style.zIndex=dialogs.length>1?dialogs[dialogs.length-1]:1;
	else {
		O.classList.remove('overlay');
		setTimeout(function(){O.classList.add('hide');},500);
	}
}
O.onclick=function(){
	if(dialogs.length) (dialogs[dialogs.length-1].close||closeDialog)();
};
function confirmCancel(dirty){
	return !dirty||confirm(_('confirmNotSaved'));
}

// Advanced
var A=$('advanced');
$('bAdvanced').onclick=function(){showDialog(A);};
$('cShow').checked=bg.settings.showButton;
$('cShow').onchange=function(){bg.showButton(bg.setOption('showButton',this.checked));};
$('cUpdate').checked=bg.settings.autoUpdate;
$('cUpdate').onchange=function(){if(bg.setOption('autoUpdate',this.checked)) bg.autoCheck();};
$('bDefSearch').onclick=function(){$('tSearch').value=_('defaultSearch');};
$('tSearch').value=bg.settings.search;
$('tSearch').title=_('hintSearchLink');
$('aExport').onclick=function(){showDialog(X);xLoad();};
$('aImport').onchange=function(e){
	var i,f,files=e.target.files;
	for(i=0;f=files[i];i++) {
		var r=new FileReader();
		r.onload=function(e){impo(e.target.result);};
		r.readAsBinaryString(f);
	}
};
$('aVacuum').onclick=function(){
	var t=this;t.disabled=true;t.innerHTML=_('buttonVacuuming');
	bg.vacuum(function(){t.innerHTML=_('buttonVacuumed');});
};
$('aVacuum').title=_('hintVacuumData');
A.close=$('aClose').onclick=function(){
	bg.setOption('search',$('tSearch').value);
	closeDialog();
};

// Import
function impo(b){
	var z=new JSZip();
	try{z.load(b);}catch(e){alert(_('msgErrorZip'));return;}
	var vm=z.file('ViolentMonkey'),count=0;
	if(vm) try{vm=JSON.parse(vm.asText());}catch(e){vm={};opera.postError('Error parsing ViolentMonkey configuration.');}
	z.file(/\.user\.js$/).forEach(function(o){
		if(o.dir) return;
		var v,i,c={code:o.asText()};
		try{
			if(vm.scripts&&(v=vm.scripts[o.name.slice(0,-8)])) {
				c.id=v.id;c.more=v;
			}
			bg.parseScript(null,c);
			count++;
		}catch(e){opera.postError('Error importing data: '+o.name+'\n'+e);}
	});
	if(vm.values) for(z in vm.values) bg.setValue(z,vm.values[z]);
	if(vm.settings) for(z in vm.settings)
		if(z in bg.settings) bg.setOption(z,vm.settings[z]);
	alert(_('msgImported',[count]));
	location.reload();
}

// Export
var X=$('export'),xL=$('xList'),xE=$('bExport'),xD=$('cWithData');
function xLoad() {
	xL.innerHTML='';xE.disabled=false;xE.innerHTML=_('buttonExport');
	xD.checked=bg.settings.withData;
	bg.ids.forEach(function(i){
		var d=document.createElement('div');
		d.className='ellipsis';
		d.innerText=d.title=bg.metas[i].meta.name||_('labelNoName');
		xL.appendChild(d);
	});
}
xD.onchange=function(){bg.setOption('withData',this.checked);};
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
function getNameURI(c){
	var t=c.meta.namespace||'',n=c.meta.name||'',ckey=escape(t)+':'+escape(n)+':';
	if(!t&&!n) ckey+=c.id;return ckey;
}
xE.onclick=function(){
	this.disabled=true;this.innerHTML=_('buttonExporting');
	var z=new JSZip(),n,_n,names={},c,i,j,ns={},_ids=[],
			vm={scripts:{},settings:bg.settings};
	function finish(v){
		if(v) vm.values=v;
		z.file('ViolentMonkey',JSON.stringify(vm));
		c={compression:'DEFLATE'};
		n=z.generate(c);
		X.close();
		bg.opera.extension.tabs.create({url:'data:application/zip;base64,'+n}).focus();
	}
	for(i=0;i<bg.ids.length;i++)
		if(xL.childNodes[i].classList.contains('selected')) _ids.push(bg.ids[i]);
	bg.getScripts(_ids,false,function(o){
		o.forEach(function(c){
			n=_n=c.custom.name||c.meta.name||'Noname';j=0;
			while(names[n]) n=_n+(++j);names[n]=1;
			z.file(n+'.user.js',c.code);
			vm.scripts[n]={id:c.id,custom:c.custom,enabled:c.enabled,update:c.update};
			if(xD.checked) ns[c.uri]=1;
		});
		if(xD.checked) bg.getValues(Object.getOwnPropertyNames(ns),finish);
		else finish();
	});
};
X.close=$('bClose').onclick=closeDialog;

// Script Editor
var E=$('editor'),U=$('eUpdate'),M=$('meta'),
		mN=$('mName'),mR=$('mRunAt'),mH=$('mHomepage'),
		mU=$('mUpdateURL'),mD=$('mDownloadURL'),
    mI=$('mInclude'),mE=$('mExclude'),mM=$('mMatch'),
    cI=$('cInclude'),cE=$('cExclude'),cM=$('cMatch'),
		eS=$('eSave'),eSC=$('eSaveClose'),T;
function markClean(){
	T.clearHistory();
	eS.disabled=eSC.disabled=true;
}
function edit(o){
	switchTo(E);E.scr=o;E.cur=o.id;
	U.checked=o.update;
	T.setValueAndFocus(o.code);
	markClean();
}
function eSave(){
	if(eS.disabled) return;	// in case fired by Ctrl-S
	bg.parseScript(null,{
		id:E.cur,
		code:T.getValue(),
		message:'',
		more:{
			custom:E.scr.custom,
			update:U.checked
		}
	});
	markClean();
}
function eClose(){switchTo(N);E.cur=E.scr=null;}
function split(t){return t.replace(/^\s+|\s+$/g,'').split(/\s*\n\s*/).filter(function(e){return e;});}
function metaChange(){M.dirty=true;}
[mN,mH,mR,mU,mD,mI,mM,mE,cI,cM,cE].forEach(function(i){i.onchange=metaChange;});
U.onchange=E.markDirty=function(){eS.disabled=eSC.disabled=false;}
$('bcustom').onclick=function(){
	var e=[],c=E.scr.custom;
	M.dirty=false;showDialog(M,10);
	mN.value=c.name||'';
	mH.value=c.homepage||'';
	mU.value=c.updateURL||'';
	mD.value=c.downloadURL||'';
	switch(c['run-at']){
		case 'document-start':mR.value='start';break;
		case 'document-idle':mR.value='idle';break;
		case 'document-end':mR.value='end';break;
		default:mR.value='default';
	}
	cI.checked=c._include!=false;
	mI.value=(c.include||e).join('\n');
	cM.checked=c._match!=false;
	mM.value=(c.match||e).join('\n');
	cE.checked=c._exclude!=false;
	mE.value=(c.exclude||e).join('\n');
};
M.close=function(){if(confirmCancel(M.dirty)) closeDialog();};
$('mCancel').onclick=closeDialog;
$('mOK').onclick=function(){
	if(M.dirty) {
		var c=E.scr.custom;
		c.name=mN.value;
		c.homepage=mH.value;
		c.updateURL=mU.value;
		c.downloadURL=mD.value;
		switch(mR.value){
			case 'start':c['run-at']='document-start';break;
			case 'idle':c['run-at']='document-idle';break;
			case 'end':c['run-at']='document-end';break;
			default:delete c['run-at'];
		}
		c._include=cI.checked;
		c.include=split(mI.value);
		c._match=cM.checked;
		c.match=split(mM.value);
		c._exclude=cE.checked;
		c.exclude=split(mE.value);
		E.markDirty();
	}
	closeDialog();
};
eS.onclick=eSave;
eSC.onclick=function(){eSave();eClose();};
E.close=$('eClose').onclick=function(){if(confirmCancel(!eS.disabled)) eClose();};
initEditor(function(o){T=o;},{save:eSave,exit:E.close,onchange:E.markDirty});

// Load at last
(function(nodes){
	for(var i=0;i<nodes.length;i++) nodes[i].innerHTML=_(nodes[i].innerHTML);
	switchTo(N);
})(document.querySelectorAll('.i18n'));
bg.getData(function(o){
	L.innerHTML='';cache=o;bg.ids.forEach(function(i){addItem(bg.metas[i]);});
});
function updateItem(r){
	if(!('id' in r)) return;
	var m=bg.metas[r.id];
	switch(r.status){
		case 0:loadItem(m,r);break;
		case 1:addItem(m);break;
		default:modifyItem(divs[r.id],r);
	}
}
bg._updateItem.push(updateItem);
