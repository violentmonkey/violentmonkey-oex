var $=document.getElementById.bind(document),
		N=$('main'),L=$('sList'),O=$('overlay'),
		bg=opera.extension.bgProcess,_=bg._,cache,map={},ids=[];

// Main options
function getIcon(n){
	var c=cache[n.meta.icon];
	if(c) return 'data:image/x;base64,'+btoa(c);
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
function loadItem(o,r){
	var d=o.div,n=o.obj;
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
		+'<button data=enable>'+_(n.enabled?'buttonDisable':'buttonEnable')+'</button> '
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
	o.div=document.createElement('div');
	loadItem(o);
	L.appendChild(o.div);
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
		if(o[0]!=t) {
			bg.move(ids[o[0]],t-o[0]);
			var s=t>o[0]?1:-1,i=o[0],x=ids[i];
			for(;i!=t;i+=s) ids[i]=ids[i+s];
			ids[t]=x;
		}
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
			bg.editScript(ids[i],function(o){
				switchTo(E);E.scr=o;E.cur=i;
				U.checked=o.update;T.setValue(o.code);T.markClean();T.focus();
			});
		},
		enable:function(i,p,o){
			var e=map[ids[i]].obj;
			if(e.enabled=!e.enabled) {
				p.classList.remove('disabled');
				o.innerText=_('buttonDisable');
			} else {
				p.classList.add('disabled');
				o.innerText=_('buttonEnable');
			}
			bg.enableScript(e.id,e.enabled);
		},
		remove:function(i,p){
			bg.removeScript(ids.splice(i,1)[0]);
			L.removeChild(p);
		},
		update:function(i){
			bg.checkUpdate(ids[i]);
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
$('bNew').onclick=function(){
	var d=bg.newScript();
	bg.saveScript(d,function(){addItem(map[d.id]={obj:d});});
};
$('bUpdate').onclick=bg.checkUpdateAll;
if(!($('cDetail').checked=bg.settings.showDetails)) L.classList.add('simple');
$('cDetail').onchange=function(){L.classList.toggle('simple');bg.setOption('showDetails',this.checked);};
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
	return !dirty||confirm(_('confirmNotSaved'));
}
window.addEventListener('DOMContentLoaded',function(){
	var nodes=document.querySelectorAll('.i18n'),c,s,i,j;
	for(i=0;i<nodes.length;i++) nodes[i].innerHTML=_(nodes[i].innerHTML);
},true);

// Advanced
var A=$('advanced');
$('bAdvanced').onclick=function(){showDialog(A);};
$('cShow').checked=bg.settings.showButton;
$('cShow').onchange=function(){bg.showButton(bg.setOption('showButton',this.checked));};
$('cUpdate').checked=bg.settings.autoUpdate;
$('cUpdate').onchange=function(){if(bg.setOption('autoUpdate',this.checked)) bg.autoCheck();};
$('tSearch').value=bg.settings.search;
$('bDefSearch').onclick=function(){$('tSearch').value=_('defaultSearch');};
$('aExport').onclick=function(){showDialog(X);xLoad();};
$('aImport').onchange=function(e){
	var i,f,files=e.target.files;
	for(i=0;f=files[i];i++) {
		var r=new FileReader();
		r.onload=function(e){impo(e.target.result);};
		r.readAsBinaryString(f);
	}
};
$('aVacuum').onclick=function(){var t=this;t.disabled=true;bg.vacuum(function(){t.innerHTML=_('buttonVacuumed');});};
A.close=$('aClose').onclick=function(){
	bg.setOption('search',$('tSearch').value);
	closeDialog();
};

// Import
function impo(b){
	var z=new JSZip();
	try{z.load(b);}catch(e){alert('Error loading zip file.');return;}
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
	if(vm.values) try{
		for(z in vm.values) for(b in vm.values[z]) widget.preferences.setItem('val:'+z+':'+b,vm.values[z][b]);
	}catch(e){opera.postError('Error parsing script data: '+e);}
	if(vm.settings) {
		for(z in vm.settings) bg.setOption(z,vm.settings[z]);
	}
	alert(_('msgImported',count));
	location.reload();
}

// Export
var X=$('export'),xL=$('xList'),xE=$('bExport'),xD=$('cWithData');
function xLoad() {
	xL.innerHTML='';xE.disabled=false;xE.innerHTML=_('buttonExport');
	xD.checked=bg.settings.withData;
	for(var i=0;i<ids.length;i++) {
		var d=document.createElement('div');
		d.className='ellipsis';
		d.innerText=d.title=map[ids[i]].obj.meta.name||_('labelNoName');
		xL.appendChild(d);
	}
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
		window.open('data:application/zip;base64,'+n);
		X.close();
	}
	for(i=0;i<ids.length;i++)
		if(xL.childNodes[i].classList.contains('selected')) _ids.push(ids[i]);
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
var T=new editor($('eCode'),bg.settings.editorType);
(function(b){
	function switchCommand(){
		b.innerHTML=T.type?_('buttonNormalEditor'):_('buttonAdvancedEditor');
	}
	b.onclick=function(){
		T.switchEditor();bg.setOption('editorType',T.type);switchCommand();
	};
	switchCommand();
})($('beditor'));
function eSave(){
	bg.parseScript(null,{id:E.scr.id,code:T.getValue(),message:'',more:{update:U.checked}});
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
bg.getData(function(o){
	cache=o.cache;
	o.scripts.forEach(function(i){
		ids.push(i.id);addItem(map[i.id]={obj:i});
	});
});
function updateItem(r){
	if(!('id' in r)) return;
	var m=map[r.id];
	if(!m) map[r.id]=m={};
	if(r.obj) m.obj=r.obj;
	switch(r.status){
		case 0:loadItem(m,r);break;
		case 1:ids.push(r.id);addItem(m);break;
		default:modifyItem(m.div,r);
	}
}
bg._updateItem.push(updateItem);
