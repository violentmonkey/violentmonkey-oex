#!python
# coding=utf-8
# author: Gerald <gera2ld@163.com>
import zipfile,os,sys,re
import xml.etree.ElementTree as ET

ex_dir=re.compile(r'^\.git')
ex_file=re.compile(r'^\.git|\.(py|oex|md|less)$|^[^\.]*$')

def makeOperaAddon(src,dist):
	print('Packager for Opera addons - designed by Gerald')
	try: tree=ET.parse(os.path.join(src,'config.xml'))
	except:
		print('Error loading package at path: %s' % src)
		return
	widget=tree.getroot()
	name=widget.find('{http://www.w3.org/ns/widgets}name').text
	version=widget.get('version')
	print('Package loaded: %s version %s' % (name,version))
	os.makedirs(dist,exist_ok=True)
	with zipfile.ZipFile(os.path.join(dist,name.replace(' ','-')+'.oex'),'w',zipfile.ZIP_DEFLATED) as z:
		for root,dirs,files in os.walk(src):
			f=0
			while f<len(dirs):
				if ex_dir.search(dirs[f]): dirs.pop(f)
				else: f+=1
			for f in files:
				if ex_file.search(f): continue
				f=os.path.join(root,f)
				r=os.path.relpath(f,src)
				z.write(f,r)
	print('Packed: %s version %s' % (name,version))

if __name__=='__main__':
	makeOperaAddon('src','dist')
