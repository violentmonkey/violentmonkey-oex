#!node
var fs=require('fs'),path=require('path'),
		uglifyjs=require('uglify-js'),less=require('less'),
		archiver=require('archiver');
function parseRule(s){
	if(s.substr(0,2)=='R:')
		return new RegExp('^'+s.substr(2)+'$');
	return s;
}
function getRules(p){
	var d=fs.readFileSync(p),
			jrules=JSON.parse(d),rules={},i,k,v;
	for(i in jrules) {
		k=parseRule(i);
		v=jrules[i];
		if(typeof v=='string') d=[parseRule(v)];
		else {
			d=[];v.forEach(function(i){d.push(parseRule(i));});
		}
		rules[i]=d;
	}
	return rules;
}
function getFileList(dir) {
	function walk(root) {
		var arr=fs.readdirSync(path.join(dir,root));
		arr.forEach(function(i){
			var p=path.join(root,i).replace(/\\/g,'/'),
					s=fs.statSync(path.join(dir,p));
			if(s.isDirectory()) walk(p);
			else files.push(p);
		});
	}
	var files=[];walk('');
	return files;
}
function Distributor(uncompressed,source){
	var t=this;
	t.uncompressed=uncompressed;
	t.mkdirs(t.uncompressed);
	t.oexstream=fs.createWriteStream(uncompressed+'.oex');
	t.oex=archiver('zip');
	t.oexstream.on('close',function(){
		if(t.onFinish) t.onFinish();
	});
	t.oexstream.on('error',function(err){throw err;});
	t.oex.pipe(t.oexstream);
	t.source=source;
	t.streams={};
	t.processing=0;
}
Distributor.prototype={
	distribute:function(dest,src,srcdir){
		function callback(){
			t.callback(dest);
		}
		var t=this,i=-1,m,r;
		t.processing++;
		if(!src) src=dest;
		dest=path.join(t.uncompressed,dest);
		if(!srcdir) srcdir=t.source;
		t.mkdirs(path.dirname(dest));
		if(typeof src=='string') src=[src];
		src=src.map(function(i){return path.join(srcdir,i);});
		if(/\.js$/.test(dest)) {
			r=uglifyjs.minify(src,{mangle:false});
			fs.writeFile(dest,r.code,callback);
		} else if(/\.css$/.test(dest)) {
			m=[];
			src.forEach(function(i){
				m.push(fs.readFileSync(i));
			});
			less.render(m.join('\n'),{
				compress:true,
			},function(e,r){
				fs.writeFile(dest,r.css,callback);
			});
		} else if(r=dest.match(/\.(html|json|xml)$/)) {
			m=[];
			src.forEach(function(i){
				m.push(fs.readFileSync(i));
			});
			m=m.join('');
			if(r[1]=='html') [
				[/<!--.*?-->/g,''],
				[/<\s+/g,'<'],
				[/\s+>/g,'>'],
			].forEach(function(i){m=m.replace(i[0],i[1]);});
			fs.writeFile(dest,m,callback);
		} else t.copyFiles(dest,src,callback);
	},
	callback:function(dest){
		this.oex.append(fs.createReadStream(dest),
			{name:path.relative(this.uncompressed,dest)});
		if(!--this.processing) this.oex.finalize();
	},
	copyFiles:function(dest,src,callback){
		function copy(){
			var f,r;
			if(f=src.shift()) {
				r=fs.createReadStream(f);
				r.pipe(w,{end:false});
				r.on('end',copy);
			} else w.end(callback);
		}
		var w=fs.createWriteStream(dest);
		copy();
	},
	mkdirs:function(dir){
		if(!dir) return;
		if(dir.substr(-1)=='/') dir=dir.substr(0,dir.length-1);
		var p=dir.split(/[\\/]/),i,s='';
		for(i=0;i<p.length;i++) {
			s=path.join(s,p[i]);
			if(!fs.existsSync(s)) fs.mkdirSync(s);
		}
	},
	finish:function(callback){
		this.onFinish=callback;
	},
};
function main(src,dist,pack){
	var rules=getRules(path.join(pack,'mappings.json')),
			filelist=getFileList(src),i,d,dis;
	console.log('Distibutor for Opera NEX addons - written in NodeJS by Gerald')
	i=fs.readFileSync(path.join(src,'config.xml'),{encoding:'utf8'});
	d={};
	d.version=i.match(/<widget[^>]*? version="(.*?)"/)[1];
	d.name=i.match(/<name>([^<]*)<\/name>/)[1];
	console.log('Package loaded: '+d.name+' version '+d.version);
	dis=new Distributor(path.join(dist,d.name.replace(/ /g,'-')),src);
	for(i in rules) {
		d=[];
		rules[i].forEach(function(r){
			var i;
			if(typeof r=='string') {
				i=filelist.indexOf(r);
				if(i>=0) {
					d.push(r);
					filelist.splice(i,1);
				}
			} else for(i=0;i<filelist.length;i++)
				if(filelist[i].match(r)) {
					d.push(filelist[i]);
					filelist.splice(i,1);
					i--;
				}
		});
		if(d.length) {
			if(i=='P:') d.forEach(function(i){
				dis.distribute(i,null,pack);
			}); else if(i!='D:')
				dis.distribute(i,d);
		}
	}
	filelist.forEach(function(i){
		dis.distribute(i);
	});
	dis.finish(function(){
		console.log('Finished.');
	});
}
main('../src','../dist','../pack');
