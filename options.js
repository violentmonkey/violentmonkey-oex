function $(i){return document.getElementById(i);}
var bg=opera.extension.bgProcess,N=$('main'),L=$('sList'),O=$('overlay'),_=bg.getI18nString;

// Main options
function updateMove(d){
	if(!d) return;
	var b=d.querySelectorAll('.move');
	b[0].disabled=!d.previousSibling;
	b[1].disabled=!d.nextSibling;
}
var icons={};
function getIcon(n){
	if(n.meta.icon) {
		if(n.meta.icon in icons) return icons[n.meta.icon];
		var i=bg.getString('cache:'+n.meta.icon);
		if(i) return icons[n.meta.icon]='data:image/x;base64,'+btoa(i);
	}
	return 'images/icon64.png';
}
function modifyItem(d,r){
	if(r) {
		if(r.message) d.querySelector('.message').innerHTML=r.message;
		with(d.querySelector('.update'))
			if(r.hideUpdate) classList.add('hide');
			else classList.remove('hide');
	}
}
function allowUpdate(n){return n.update&&(n.custom.updateURL||n.meta.updateURL);}
function loadItem(d,n,r){
	d.innerHTML='<img class=icon src="'+getIcon(n)+'">'
	+'<a class="name ellipsis" target=_blank></a>'
	+'<span class=author></span>'
	+'<span class=version>'+(n.meta.version?'v'+n.meta.version:'')+'</span>'
	+(allowUpdate(n)?'<a data=update class=update href=#>'+_('Check for updates')+'</a> ':'')
	+'<div class="descrip ellipsis"></div>'
	+'<span class=message></span>'
	+'<div class=panel>'
		+'<button data=edit>'+_('Edit')+'</button> '
		+'<button data=enable>'+_(n.enabled?'Disable':'Enable')+'</button> '
		+'<button data=remove>'+_('Remove')+'</button>'
		+'<button data=up class=move>'+_('&uarr;')+'</button>'
		+'<button data=down class=move>'+_('&darr;')+'</button>'
	+'</div>';
	d.className=n.enabled?'':'disabled';
	var a=d.querySelector('.name'),b=n.custom.name||n.meta.name;
	a.title=b||'';
	a.innerHTML=b?b.replace(/&/g,'&amp;').replace(/</g,'&lt;'):'<em>'+_('Null name')+'</em>';
	if(b=n.custom.homepage||n.meta.homepage) a.href=b;
	if(n.meta.author) d.querySelector('.author').innerText=_('Author: ')+n.meta.author;
	a=d.querySelector('.descrip');
	a.innerText=a.title=n.meta.description||'';
	modifyItem(d,r);
}
function addItem(n){
	var d=document.createElement('div');
	loadItem(d,n);
	L.appendChild(d);
	return d;
}
function moveUp(i,p){
	var x=bg.ids[i];
	bg.ids[i]=bg.ids[i-1];
	bg.ids[i-1]=x;
	L.insertBefore(p,p.previousSibling);
	bg.saveIDs();
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
			e=bg.map[bg.ids[i]];
			if(e.enabled=!e.enabled) {
				p.classList.remove('disabled');
				o.innerText=_('Disable');
			} else {
				p.classList.add('disabled');
				o.innerText=_('Enable');
			}
			bg.saveScript(e);
			break;
		case 'remove':
			bg.removeScript(i--);
			L.removeChild(p);
			updateMove(L.childNodes[i<0?0:i]);
			break;
		case 'update':
			bg.checkUpdate(i);
			break;
		case 'up':
			if(p.previousSibling) moveUp(i,p);
			break;
		case 'down':
			if(p.nextSibling) moveUp(i+1,p.nextSibling);
			break;
	}
};
$('bNew').onclick=function(){
	var d=bg.newScript(true);d=addItem(d);
	updateMove(d);updateMove(d.previousSibling);
};
$('bUpdate').onclick=bg.checkUpdateAll;
if(!($('cDetail').checked=bg.getItem('showDetails'))) L.classList.add('simple');
$('cDetail').onchange=function(){L.classList.toggle('simple');bg.setItem('showDetails',this.checked);};
var panel=N;
function switchTo(D){
	panel.classList.add('hide');D.classList.remove('hide');panel=D;
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
	return !dirty||confirm(_('Modifications are not saved!'));
}
window.addEventListener('DOMContentLoaded',function(){
	var nodes=document.querySelectorAll('.i18n'),c,s,i,j;
	for(i=0;i<nodes.length;i++)
		nodes[i].innerHTML=bg.getI18nString(nodes[i].innerHTML);
},true);

// Advanced
var A=$('advanced');
$('bAdvanced').onclick=function(){showDialog(A);};
$('cShow').checked=bg.getItem('showButton');
$('cShow').onchange=function(){bg.showButton(bg.setItem('showButton',this.checked));};
$('cInstall').checked=bg.installFile;
$('cInstall').onchange=function(){bg.setItem('installFile',bg.installFile=this.checked);};
$('cUpdate').checked=bg.autoUpdate;
$('cUpdate').onchange=function(){if(bg.setItem('autoUpdate',bg.autoUpdate=this.checked)) bg.autoCheck();};
$('tSearch').value=bg.getString('search');
$('bDefSearch').onclick=function(){$('tSearch').value=_('Search$1');};
$('aExport').onclick=function(){showDialog(X);xLoad();};
$('aImport').onchange=function(e){
	var i,f,files=e.target.files;
	for(i=0;f=files[i];i++) {
		var r=new FileReader();
		r.onload=function(e){impo(e.target.result);};
		r.readAsBinaryString(f);
	}
};
$('aVacuum').onclick=function(){var t=this;t.disabled=true;bg.vacuum(function(){t.innerHTML=_('Data vacuumed');});};
A.close=$('aClose').onclick=function(){
	bg.setString('search',$('tSearch').value);
	closeDialog();
};

// Import
function impo(b){
	var z=new JSZip();
	try{z.load(b);}catch(e){alert(_('Error loading zip file.'));return;}
	var vm=z.file('ViolentMonkey'),count=0;
	if(vm) try{vm=JSON.parse(vm.asText());}catch(e){vm={};opera.postError('Error parsing ViolentMonkey configuration.');}
	z.file(/\.user\.js$/).forEach(function(o){
		if(o.dir) return;
		var c=null,v,i;
		try{
			if(vm.scripts&&(v=vm.scripts[o.name.slice(0,-8)])) {
				c=bg.map[v.id];
				if(c) for(i in v) c[i]=v[i];
				else c=v;
			}
			bg.parseScript(null,{code:o.asText()},c);
			count++;
		}catch(e){opera.postError('Error importing data: '+o.name+'\n'+e);}
	});
	if(vm.values) try{
		for(z in vm.values) for(b in vm.values[z]) widget.preferences.setItem('val:'+z+':'+b,vm.values[z][b]);
	}catch(e){opera.postError('Error parsing script data: '+e);}
	if(vm.settings) {
		for(z in vm.settings) bg.setString(z,vm.settings[z]);
		bg.init();
	}
	alert(bg.format(_('$1 item(s) are imported.'),count));
	location.reload();
}

// Export
var X=$('export'),xL=$('xList'),xE=$('bExport'),xC=$('cCompress'),xD=$('cWithData');
function xLoad() {
	xL.innerHTML='';xE.disabled=false;xE.innerHTML=_('Export');
	xC.checked=bg.getItem('compress');
	xD.checked=bg.getItem('withData');
	for(var i=0;i<bg.ids.length;i++) {
		var d=document.createElement('div');
		d.className='ellipsis';
		d.innerText=d.title=bg.map[bg.ids[i]].meta.name;
		xL.appendChild(d);
	}
}
xC.onchange=function(){bg.setItem('compress',this.checked);};
xD.onchange=function(){bg.setItem('withData',this.checked);};
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
	this.disabled=true;this.innerHTML=_('Exporting...');
	var z=new JSZip(),n,_n,names={},c,i,j,vm={scripts:{}},ns={};
	for(i=0;i<bg.ids.length;i++)
		if(xL.childNodes[i].classList.contains('selected')) {
			c=bg.map[bg.ids[i]];
			n=_n=c.custom.name||c.meta.name||'Noname';j=0;
			while(names[n]) n=_n+(++j);names[n]=1;
			z.file(n+'.user.js',c.code);
			vm.scripts[n]={id:bg.ids[i],custom:c.custom,enabled:c.enabled,update:c.update};
			if(xD.checked) ns[getNameURI(c)]=1;
		}
	if(xD.checked) {
		vm.values={};
		for(i=0;_n=widget.preferences.key(i);i++)
			if((n=_n.match(/^val:([^:]*:[^:]*:[^:]*):(.*)/))&&ns[n[1]]) {
				if(!vm.values[n[1]]) vm.values[n[1]]={};
				vm.values[n[1]][n[2]]=widget.preferences.getItem(_n);
			}
	}
	vm.settings={};
	['showDetails','showButton','installFile','compress','withData',
		'editorType','autoUpdate','isApplied','lastUpdate','search'].forEach(function(i){vm.settings[i]=bg.getString(i);});
	z.file('ViolentMonkey',JSON.stringify(vm));
	c={};if(xC.checked) c.compression='DEFLATE';
	n=z.generate(c);
	window.open('data:application/zip;base64,'+n);
	X.close();
};
X.close=$('bClose').onclick=closeDialog;

// Script Editor
var E=$('editor'),U=$('eUpdate'),M=$('meta'),
		mN=$('mName'),mR=$('mRunAt'),mH=$('mHomepage'),
		mU=$('mUpdateURL'),mD=$('mDownloadURL'),
    mI=$('mInclude'),mE=$('mExclude'),mM=$('mMatch'),
    cI=$('cInclude'),cE=$('cExclude'),cM=$('cMatch'),
		eS=$('eSave'),eSC=$('eSaveClose');
CodeMirror.keyMap.vm={
	'Esc':'close',
	'Ctrl-S':'save',
	fallthrough:'default'
};
function editor(e,i){
	var t=this;
	e.data=e.value;
	e.isClean=function(){return t.clean;};
	e.markClean=function(){t.clean=true;e.data=e.value;};
	e.onkeyup=e.onmouseup=function(){if(e.data!=e.value) t.markDirty();};
	e.getValue=function(){return this.value;};
	e.setValue=function(v){this.value=v;};
	t.editor=t.textarea=e;
	t.type=0;
	t.switchEditor(i?1:0);
}
editor.prototype={
	switchEditor:function(i){
		var t=this;
		if(i==undefined) i=!t.type;
		if(i!=t.type) {
			if(t.type=!t.type) {
				t.editor=CodeMirror.fromTextArea(t.editor,{
					lineNumbers:true,
					matchBrackets:true,
					mode:'text/typescript',
					lineWrapping:true,
					indentUnit:4,
					indentWithTabs:true,
					extraKeys:{"Enter":"newlineAndIndentContinueComment"},
					keyMap:'vm'
				});
				t.editor.on('change',t.markDirty);
			} else {
				t.clean&=t.editor.isClean();
				t.editor.toTextArea();t.editor=t.textarea;
				t.editor.data=t.editor.value;
			}
			t.type=i;
		}
	},
	clean:true,
	focus:function(){return this.editor.focus();},
	isClean:function(){return this.clean&&this.editor.isClean();},
	markClean:function(){this.clean=true;this.editor.markClean();eS.disabled=eSC.disabled=true;},
	markDirty:function(){this.clean=false;E.markDirty();},
	getValue:function(){return this.editor.getValue();},
	setValue:function(t){this.editor.setValue(t);this.editor.getDoc&&this.editor.getDoc().clearHistory();},
};
var T=new editor($('eCode'),bg.getItem('editorType'));
(function(b){
	function switchCommand(){
		b.innerHTML=T.type?_('Switch to normal editor'):_('Switch to advanced editor');
	}
	b.onclick=function(){
		T.switchEditor();bg.setItem('editorType',T.type);switchCommand();
	};
	switchCommand();
})($('beditor'));
function edit(i){
	switchTo(E);E.scr=bg.map[bg.ids[i]];E.cur=L.childNodes[i];
	U.checked=E.scr.update;T.setValue(E.scr.code);T.markClean();T.focus();
}
function eSave(){
	E.scr.update=U.checked;
	bg.parseScript(null,{code:T.getValue(),message:''},E.scr);
	T.markClean();eS.disabled=eSC.disabled=true;
}
function eClose(){switchTo(N);E.cur=E.scr=null;T.setValue('');}
function split(t){return t.replace(/^\s+|\s+$/g,'').split(/\s*\n\s*/).filter(function(e){return e;});}
U.onchange=E.markDirty=function(){eS.disabled=eSC.disabled=false;};
function metaChange(){M.dirty=true;}
[mN,mH,mR,mU,mD,mI,mM,mE,cI,cM,cE].forEach(function(i){i.onchange=metaChange;});
$('bcustom').onclick=function(){
	var e=[],c=E.scr.custom;
	M.dirty=false;showDialog(M,10);
	mN.value=c.name||'';
	mH.value=c.homepage||'';
	mU.value=c.updateURL||'';
	mD.value=c.downloadURL||'';
	switch(c['run-at']){
		case 'document-start':mR.value='start';break;
		case 'document-body':mR.value='body';break;
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
			case 'body':c['run-at']='document-body';break;
			case 'end':c['run-at']='document-end';break;
			default:delete c['run-at'];
		}
		c._include=cI.checked;
		c.include=split(mI.value);
		c._match=cM.checked;
		c.match=split(mM.value);
		c._exclude=cE.checked;
		c.exclude=split(mE.value);
		loadItem(E.cur,E.scr);
		updateMove(E.cur);
		bg.saveScript(E.scr);
	}
	closeDialog();
};
eS.onclick=eSave;
eSC.onclick=function(){eSave();eClose();};
CodeMirror.commands.save=function(){if(!eS.disabled) setTimeout(eSave,0);};
CodeMirror.commands.close=E.close=$('eClose').onclick=function(){if(confirmCancel(!eS.disabled)) eClose();};

// Load at last
L.innerHTML='';
bg.ids.forEach(function(i){addItem(bg.map[i]);});
updateMove(L.firstChild);updateMove(L.lastChild);
function updateItem(r){
	var n=bg.map[bg.ids[r.item]];
	switch(r.status){
		case 1:addItem(n);updateMove(L.childNodes[r.item-1]);break;
		case 2:modifyItem(L.childNodes[r.item],r);break;
		default:loadItem(L.childNodes[r.item],n,r);
	}
	updateMove(L.childNodes[r.item]);
}
if(!bg.options.window) bg.options.window=window;
