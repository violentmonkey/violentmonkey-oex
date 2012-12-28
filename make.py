#!python3
# coding=utf-8
# author: Gerald <gera2ld@163.com>
import zipfile,os
import xml.etree.ElementTree as ET

class packager:
    def __init__(self):
        print('Packager for Opera addons - designed by Gerald')
        try: tree=ET.parse('config.xml')
        except: return print('Error loading package')
        widget=tree.getroot()
        name=widget.find('{http://www.w3.org/ns/widgets}name').text
        version=widget.get('version')
        print('Package loaded: %s version %s' % (name,version))
        with zipfile.ZipFile('%s-v%s.oex' % (name.replace(' ','_'),version),'w',zipfile.ZIP_DEFLATED) as z:
            for root,dirs,files in os.walk('.'):
                f=0
                while f<len(dirs):
                    if dirs[f].startswith('.git'): dirs.pop(f)
                    else: f+=1
                for f in files:
                    if f.startswith('.git') or f.endswith('.py') or f.endswith('.oex'):
                        continue
                    f=os.path.join(root,f)
                    z.write(f)
        print('Packed: %s version %s' % (name,version))

packager()
