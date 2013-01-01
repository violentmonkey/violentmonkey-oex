#!python3
# coding=utf-8
# author: Gerald <gera2ld@163.com>
import zipfile,os,re
import xml.etree.ElementTree as ET

class packager:
    name=None
    commands=['help','load']
    ex_dir=re.compile('(^\.git)')
    ex_file=re.compile('(^\.git|\.py$|\.oex$|^[^\.]*$)')
    def __init__(self):
        print('Packager for Opera addons - designed by Gerald\nType "help" for more information.')
        if self.cmd_load(): return self.cmd_pack()
        while True:
            cmd=input('$ ')
            cmd,_,arg=cmd.partition(' ')
            if not cmd: continue
            if cmd=='quit': break
            a=getattr(self,'cmd_'+cmd,None)
            try: i=self.commands.index(cmd)
            except: i=255
            if a is None:
                print('Bad command: %s' % cmd)
            elif i>1 and self.name is None:
                print('Please load package!')
            else: a(arg)
    def cmd_help(self, arg):
        print('''\
Usage: command [args]
Commands:
    help: show this message.
    load: load package path, leading to a folder with config.xml.
    pack: pack the files to a package named NAME-vVERSION.oex
    quit: exit packager''')
    def cmd_load(self, arg=None):
        if arg: self.path=arg
        else: self.path='.'
        try: tree=ET.parse(os.path.join(self.path,'config.xml'))
        except:
            if arg: print('Error loading package: %s' % arg)
            return
        self.widget=tree.getroot()
        self.name=self.widget.find('{http://www.w3.org/ns/widgets}name').text
        self.version=self.widget.get('version')
        print('Package loaded: %s version %s' % (self.name,self.version))
        return True
    def cmd_pack(self, arg=None):
        with zipfile.ZipFile('%s-v%s.oex' % (self.name.replace(' ','_'),self.version),'w',zipfile.ZIP_DEFLATED) as z:
            for root,dirs,files in os.walk(self.path):
                f=0
                while f<len(dirs):
                    if self.ex_dir.search(dirs[f]): dirs.pop(f)
                    else: f+=1
                for f in files:
                    if self.ex_file.search(f): continue
                    f=os.path.join(root,f)
                    z.write(f,os.path.relpath(f,self.path))
        print('Packed: %s version %s' % (self.name,self.version))

packager()
