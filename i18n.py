#!python3
# coding=utf-8
# author: Gerald <gera2ld@163.com>
import re,os,json,pprint
import xml.etree.ElementTree as ET

class i18n:
    default_keys=['__author','__lang']
    sep='<=>'
    name=None
    lang=None
    path='.'
    data={}
    keys=set()
    commands=['help','load','lang']
    def __init__(self):
        print('Language tool for Opera addons - designed by Gerald\nType "help" for more information.')
        self.cmd_load()
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
            elif i>2 and self.lang is None:
                print('Please set lang!')
            else: a(arg)
    def _fromString(self,s):
        return s.replace('\\n','\n').replace('\\t','\t').replace('\\r','\r')
    def _toString(self,s):
        return s.replace('\n','\\n').replace('\t','\\t').replace('\r','\\r')
    def cmd_load(self,arg=None):
        if arg: self.path=arg
        else: self.path='.'
        try: tree=ET.parse(os.path.join(self.path,'config.xml'))
        except:
            if arg: print('Error loading package:',arg)
            return
        self.widget=tree.getroot()
        self.name=self.widget.find('{http://www.w3.org/ns/widgets}name').text
        self.version=self.widget.get('version')
        print('Package loaded: %s version %s' % (self.name,self.version))
        self.lang=None
    def cmd_help(self, arg):
        print('''\
Usage: command [args]
Commands:
    help: show this message.
    load: load package path, leading to a folder with config.xml.
    lang: set language, list all available languages if no argument is given.
    list: list all translations of current language.
    keys: print all source words, excluding the obsolete ones.
    gene: generate translations from source files, keeping the obsolete ones.
    obso: print the obsolete source words, generated after "gene".
    vacu: vacuum data by discarding the obsolete words.
    save: write the modified data to file, named "locales/$lang/messages.json".
    walk: list all translations one by one, allowing modification.
        walk Commands:
            >>b         break out of loop
            >><DATA     modify current translation to DATA, allowing HTML
            >>gNUMBER   go to the NUMBER-th entry
            >>p         previous entry
            >>          next entry, the default command''')
    def cmd_lang(self, lang):
        if not lang:
            lang='locales'
            print('\n'.join([i for i in os.listdir(os.path.join(self.path,lang)) if os.path.isdir(os.path.join(self.path,lang,i))]))
        else:
            try: data=json.load(open(os.path.join(self.path,'locales',lang,'messages.json'),encoding='utf-8'))
            except: return print('Error loading lang: %s' % lang)
            self.lang=lang
            self.data=data
            self.keys=set(data.keys())
    def cmd_list(self, arg):
        pprint.pprint(self.data)
    def cmd_keys(self, arg):
        print(self.keys)
    def cmd_gene(self, arg):
        def add(i):
            i=self._fromString(i)
            self.keys.add(i)
            self.data.setdefault(i,i)
        self.keys.clear()
        self.keys.update(self.default_keys)
        for i in os.listdir():
            i=os.path.join(self.path,i)
            if i.endswith('.js'):
                with open(i,encoding='utf-8') as f:
                    r=f.read()
                    for i in re.findall(r'\b_\(([\'"])(.*?)\1\)',r):
                        add(i[1])
            elif i.endswith('.html'):
                with open(i,encoding='utf-8') as f:
                    r=f.read()
                    for i in re.findall(r'class=(?:i18n\b|([\'"]).*?\bi18n\b.*?\1)[^>]*>(.*?)</',r):
                        add(i[1])
    def cmd_obso(self, arg):
        print([i for i in self.data if i not in self.keys])
    def cmd_vacu(self, arg):
        data={}
        for i in self.keys: data[i]=self.data.get(i,i)
        self.data=data
    def cmd_save(self, arg):
        json.dump(self.data,open(os.path.join(self.path,'locales',self.lang,'messages.json'),'w',encoding='utf-8'),separators=(',',':'))
    def cmd_walk(self, arg):
        k=list(sorted(self.data.keys()))
        l=len(k)
        i=0
        while i<l:
            print('%d/%d' % (i,l),self._toString(k[i]),self._toString(self.data[k[i]]),'',sep=self.sep)
            v=input('>>')
            if v: c,v=v[0],v[1:]
            else: c=None
            if c=='p': i-=1
            elif c=='g': i=int(v)
            elif c=='b': break
            else:
                if(c=='<'): self.data[k[i]]=self._fromString(v)
                i+=1

i18n()
