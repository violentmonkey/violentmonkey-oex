'use strict';

initI18n();

location.search ? function() {
	// confirm install
	var delay = 2000;
	var data = {};
	var lbUrl = $('#url');
	var lbMsg = $('#msg');
	var cbClose = $('#cbClose');
	var btInstall = $('#bInstall');
	var options = $('.confirm-options');
	var parent = $('.confirm-frame');
	var timer, editor;
	parent.classList.remove('hide');

	function showMessage(message, title) {
		lbMsg.innerHTML = message;
		lbMsg.setAttribute('title', title || message);
	}

	function zfill(num, length) {
		num = num.toString();
		while(num.length < length) num = '0' + num;
		return num;
	}

	function getTimeString() {
		var now = new Date();
		return zfill(now.getHours(), 2) + ':' +
			zfill(now.getMinutes(), 2) + ':' +
			zfill(now.getSeconds(), 2);
	}

	function getScriptFile(cb) {
		bg.fetchURL(data.url, function() {
			var x = this;
			if(!x.status) data.local = true;
			if(x.status && x.status != 200 || !x.responseText)
				showMessage(_('msgErrorLoadingData'));
			else
				cb(x.responseText);
		});
	}

	function loadDependency(dict, urls, isBlob, cb) {
		urls.forEach(function(url){
			if(dict[url]) return cb();
			bg.fetchURL(url, function() {
				var x = this;
				if(x.status == 200) {
					var r = new FileReader();
					r.onload = function(e) {
						dict[url] = r.result;
						cb();
					};
					r.readAsBinaryString(x.response);
				} else cb(url);
			}, 'blob');
		});
	}

	function parseMeta(body, cb) {
		function finish(){
			showMessage(_('msgLoadedData'));
			btInstall.disabled = false;
			data.depStatus = 1;
			if(cb) cb();
		}
		function finishOne(errUrl) {
			if(errUrl) err.push(errUrl);
			i ++;
			if(i >= length) {
				if(err.length) {
					showMessage(_('msgErrorLoadingDependency'), err.join('\n'));
				} else finish();
			} else showMessage(_('msgLoadingDependency', [i, length]));
		}
		var urls = [];
		var err = [];
		var i;
		var length;
		data.depStatus=0;
		var script = bg.parseMeta(body);
		for(i in script.resources) urls.push(script.resources[i]);
		length = script.require.length + urls.length;
		if(length) {
			showMessage(_('msgLoadingDependency', [i = 0, length]));
			data.cache = {};
			loadDependency(data.cache, script.require, false, finishOne);
			loadDependency(data.cache, urls, true, finishOne);
		} else finish();
	}

	function updateClose(){
		setOption('closeAfterInstall', cbClose.checked);
	}

	function install(){
		btInstall.disabled=true;
		bg.parseScript({
			url: data.url,
			from: data.from,
			code: editor.getValue(),
			cache: data.cache,
		}, function(res){
			showMessage(res.message + '[' + getTimeString() + ']');
			if(res.code >= 0) {
				if(res.warnGrant) warnGrant(res.warnGrant);
				else if(cbClose.checked) close();
			}
		});
	}

	function close() {
		window.close();
	}

	function bindEvents() {
		cbClose.checked = getOption('closeAfterInstall');
		updateClose();
		cbClose.addEventListener('change', updateClose, false);
		$('#bClose').addEventListener('click', close, false);
		btInstall.addEventListener('click', install, false);
		var hideOptions = function(){
			options.style.display = '';
			document.removeEventListener('mousedown', hideOptions, false);
		};
		$('#bOptions').addEventListener('click', function(e){
			options.style.right = this.parentNode.offsetWidth - this.offsetWidth - this.offsetLeft + 'px';
			options.style.display = 'block';
			document.addEventListener('mousedown', hideOptions, false);
		}, false);
		options.addEventListener('mousedown', stopPropagation, false);
	}

	initEditor({
		container: parent.querySelector('.editor-code'),
		callback: function(_editor) {
			editor = _editor;
			location.search.slice(1).split('&').forEach(function(part) {
				part.replace(/^([^=]*)=(.*)$/, function(value, group1, group2) {
					data[group1] = decodeURIComponent(group2);
				});
			});
			lbUrl.innerHTML = _('msgScriptURL', [data.url || '-']);
			if(data.url) {
				lbUrl.setAttribute('title', data.url);
				showMessage(_('msgLoadingData'));
				getScriptFile(function(body) {
					editor.setValueAndFocus(body);
					parseMeta(body);
				});
			}
		},
		onexit: close,
		readonly: true,
	});
	bindEvents();
}() : function() {
	// Options
	function setTitle(node, title, def) {
		node.title = title || '';
		node.innerHTML = title ? safeHTML(title) :
			(def || '<em>' + _('labelNoName') + '</em>');
	}

	/*function debounce(cb, delay) {
		function callback() {
			cb.apply(null, args);
		}
		var timer = null, args;
		return function() {
			if(timer) clearTimeout(timer);
			args = arguments;
			timer = setTimeout(callback, delay);
		}
	}*/

	function warnGrant(name) {
		function close() {
			n.classList.remove('show');
			setTimeout(function(){n.classList.add('hide');},1000);
		}
		var n=$('#notify'),m=n.querySelector('.notify-message');
		n.classList.remove('hide');
		m.innerHTML=_('msgWarnGrant',[name||_('labelNoName')]);
		m.onclick=function(){
			bg.opera.extension.tabs.create({url:'http://wiki.greasespot.net/@grant'}).focus();
			close();
		};
		n.querySelector('.notify-close').onclick=function(e){
			e.preventDefault();close();
		};
		setTimeout(function(){n.classList.add('show');},0);
	}

	var scriptList = function() {
		var parent = $('.scripts-list');
		var wrap = $('.scripts');
		/**
		 * list = [
		 *   {
		 *     node: DOM
		 *     script: Object
		 *   },
		 *   ...
		 * ]
		 */
		var list = [];
		var dict = {};
		var cache = {};
		var mask = $('.mask');
		var commands = {
			edit: function(obj) {
				bg.editScript(obj.data.script.id, Editor.editScript);
			},
			enable: function(obj) {
				var script = obj.data.script;
				bg.enableScript(script.id, !script.enabled);
			},
			remove: function(obj) {
				var script = obj.data.script;
				bg.removeScript(obj.index);
				list.splice(obj.index, 1);
				delete dict[script.id];
				parent.removeChild(obj.data.node);
				updateHeight();
				for ( var i = obj.index; i < list.length; i ++ )
					locate(i);
				if(!list.length) showEmptyHint();
			},
			update: function(obj) {
				bg.checkUpdate(obj.data.script.id);
			},
		};

		function showEmptyHint() {
			mask.classList.remove('hide');
			mask.style.opacity = 1;
			mask.style.zIndex = 9;
			mask.innerHTML = '<div>' + _('labelNoScripts') + '</div>';
			wrap.style.opacity = '';
		}

		function hideMask() {
			wrap.style.opacity = 1;
			mask.style.opacity = 0;
			setTimeout(function() {
				mask.classList.add('hide');
			}, 1000);
		}

		function setData(data) {
			list = [];
			dict = {};
			cache = data || {};
			if(bg.ids.length) {
				hideMask();
				bg.ids.forEach(function(id) {
					addScript(bg.metas[id]);
				});
			} else
				showEmptyHint();
			Transporter.initList();
		}

		function findNode(target) {
			for(var node = target; node && node.parentNode != parent; node = node.parentNode);
			var index = -1;
			list.some(function(data, i) {
				if(data.node === node) {
					index = i;
					return true;
				}
			});
			return index >= 0 && {
				index: index,
				data: node,
			};
		}

		function findItem(target) {
			var data = findNode(target);
			if(data) data.data = list[data.index];
			return data;
		}

		function allowUpdate(script){
			return script.update && (
				script.custom.updateURL ||
				script.meta.updateURL ||
				script.custom.downloadURL ||
				script.meta.downloadURL ||
				script.custom.lastInstallURL
			);
		}

		function setAuthor(node, author) {
			var matches = author.match(/^(.*?)\s<(\S*?@\S*?)>$/);
			var label = _('labelAuthor');
			if(matches)
				node.innerHTML = label + '<a href=mailto:' + matches[2] + '>' + matches[1] + '</a>';
			else
				node.innerText = author ? label + author : '';
			node.title = author || '';
		}

		var images = {};
		function loadImage(node, src) {
			if(src in images) {
				var data = images[src];
				if(Array.isArray(data)) data.push(node);
				else if(data) node.src = src;
			} else {
				var nodes = images[src] = [node];	// loading
				var img = new Image;
				img.src = src;
				img.onload = function() {
					images[src] = true;	// loaded
					nodes.forEach(function(node) {
						node.src = src;
					});
				};
				img.onerror = function() {
					images[src] = false;	// error
				};
			}
		}

		function updateNode(res) {
			var data = dict[res.id];
			if(!data) return;
			var node = data.node;
			var script = data.script;
			var elements = data.elements;
			if(res.message)
				elements.message.innerHTML = res.message;
			node.classList[script.enabled ? 'remove' : 'add']('disabled');
			if(elements.update) elements.update.disabled = res.code == 3;
			setTitle(elements.name, script.custom.name || getLocaleString(script.meta, 'name'));
			var home = script.custom.homepageURL ||
				script.meta.homepageURL ||
				script.meta.homepage;
			if(home) elements.name.href = home;
			var supportURL = script.meta.supportURL;
			if(supportURL) {
				var support = elements.support;
				support.classList.remove('hide');
				support.href = supportURL;
				support.title = _('hintSupportPage');
			}
			setAuthor(elements.author, script.meta.author || '');
			setTitle(elements.desc, getLocaleString(script.meta, 'description'));
			var src;
			if(script.meta.icon) {
				src = cache[script.meta.icon];
				if(!src) loadImage(elements.icon, script.meta.icon);
			}
			elements.icon.src = src || 'images/icon64.png';
			elements.enable.innerHTML = script.enabled ? _('buttonDisable') : _('buttonEnable');
		}

		function initNode(data, res) {
			var node = data.node;
			var script = data.script;
			node.innerHTML =
				'<img data-id=icon class=script-icon>' +
				'<div data-id=version class=right>' +
					(script.meta.version ? 'v' + script.meta.version : '') +
				'</div> ' +
				'<div data-id=author class="right script-author ellipsis"></div>' +
				'<div class=script-info>' +
					'<a data-id=name class="script-name ellipsis" target=_blank></a>' +
					'<a data-id=support class="script-support hide" target=_blank><i class="fa fa-question-circle"></i></a>' +
				'</div>' +
				'<p data-id=desc class="script-desc ellipsis"></p>' +
				'<div class=buttons>' +
					'<button data-id=edit>' + _('buttonEdit') + '</button> ' +
					'<button data-id=enable></button> ' +
					'<button data-id=remove>' + _('buttonRemove') + '</button> ' +
					(allowUpdate(script) ? '<button data-id=update>' + _('buttonUpdate') + '</button> ' : '') +
					'<span data-id=message></span>' +
				'</div>'
			;
			data.elements = {};
			Array.prototype.forEach.call(node.querySelectorAll('[data-id]'), function(node) {
				data.elements[node.dataset.id] = node;
			});
			locate(list.indexOf(data));
			updateNode(res || {id: script.id});
		}

		var height = 90;
		var gap = 10;
		function getIndexByTop(top) {
			var i = Math.floor((top - gap) / (height + gap));
			var lower = (height + gap) * i + gap;
			var upper = lower + height;
			return top >= lower + 10 && top <= upper - 10 ? i : -1;
		}
		function locate(i, data) {
			data = data || list[i];
			if(!data) return;
			var node = data.node;
			var top = (height + gap) * i + gap;
			node.style.top = top + 'px';
		}
		function updateHeight() {
			parent.style.height = (height + gap) * list.length + gap + 'px';
		}

		var emptyDom = document.createElement('div');
		var dragging = {};
		function dragstart(e) {
			e.preventDefault();
			if(dragging.data) return;
			var data = dragging.data = findItem(e.target);
			dragging.index = data.index;
			var node = e.target;
			var rect = node.getBoundingClientRect();
			dragging.offsetX = e.clientX - rect.left;
			dragging.offsetY = e.clientY - rect.top;
			node.style.width = node.offsetWidth + 'px';
			node.style.left = e.clientX - dragging.offsetX + 'px';
			node.style.top = e.clientY - dragging.offsetY + 'px';
			// transition is reset in style so that there will not be transition on mouseup
			node.style.transition = 'none';
			node.classList.add('dragging');
			document.addEventListener('mousemove', mousemove, false);
			document.addEventListener('mouseup', mouseup, false);
		}
		function mousemove(e) {
			var node = dragging.data.data.node;
			var index = getIndexByTop(e.clientY - wrap.offsetTop + wrap.scrollTop);
			node.style.left = e.clientX - dragging.offsetX + 'px';
			node.style.top = e.clientY - dragging.offsetY + 'px';
			if(index >= 0 && index < list.length && index != dragging.index) {
				var current = dragging.index;
				var step = index > current ? 1 : -1;
				while(index != current) {
					current += step;
					var i = current;
					if(step * (i - dragging.data.index) <= 0) i -= step;
					locate(current - step, list[i]);
				}
				dragging.index = index;
			}
			dragging.scroll = 0;
			var scrollThreshold = 10;
			var offset = wrap.getBoundingClientRect();
			var delta = (e.clientY - (offset.bottom - scrollThreshold)) / scrollThreshold;
			if ( delta > 0 ) dragging.scroll = 1 + Math.min(~~ (delta * 5), 10);
			else {
				delta = (offset.top + scrollThreshold - e.clientY) / scrollThreshold;
				if(delta > 0) dragging.scroll = -1 - Math.min(~~ (delta * 5), 10);
			}
			if(dragging.scroll) scroll();
		}
		function mouseup(e) {
			var data = dragging.data;
			var node = data.data.node;
			dragging.data = null;
			dragging.scroll = 0;
			var offset = wrap.getBoundingClientRect();
			node.style.left = e.clientX - dragging.offsetX - offset.left + 'px';
			node.style.top = e.clientY - dragging.offsetY - offset.top + wrap.scrollTop + 'px';
			node.classList.remove('dragging');
			setTimeout(function(){
				node.style.left = '';
				node.style.width = '';
				node.style.transition = '';
				locate(dragging.index, data.data);
			}, 0);
			orderScript(data.index, dragging.index);
			document.removeEventListener('mousemove', mousemove, false);
			document.removeEventListener('mouseup', mouseup, false);
		}
		function scroll() {
			function scrollOnce() {
				if(dragging.scroll) {
					wrap.scrollTop += dragging.scroll;
					setTimeout(scrollOnce, 20);
				} else dragging.scrolling = false;
			}
			if(!dragging.scrolling) {
				dragging.scrolling = true;
				scrollOnce();
			}
		}
		function orderScript(idxFrom, idxTo) {
			if(idxFrom != idxTo) {
				bg.move(idxFrom, idxTo);
				var i = Math.min(idxTo, idxFrom);
				var j = Math.max(idxTo, idxFrom);
				var seq = [
					list.slice(0, i),
					list.slice(i, j+1),
					list.slice(j+1),
				];
				if(i === idxTo)
					seq[1].unshift(seq[1].pop());
				else
					seq[1].push(seq[1].shift());
				list = [];
				seq.forEach(function(seq) {
					list = list.concat(seq);
				});
			}
		}

		function addScript(script) {
			var node = document.createElement('div');
			var data = {
				script: script,
				node: node,
			};
			dict[script.id] = data;
			list.push(data);
			node.className = 'script entering';
			node.draggable = true;
			node.addEventListener('dragstart', dragstart, false);
			initNode(data);
			parent.appendChild(data.node);
			updateHeight();
			hideMask();
			setTimeout(function(){
				node.classList.remove('entering');
			}, ~~ (Math.random() * 300));
		}

		function updateItem(res) {
			switch(res.code) {
				case 0:	// script updated
					var data = dict[res.id];
					if(data) {
						data.script = bg.metas[res.id];
						initNode(data, res);
					}
					break;
				case 1:	// script installed
					addScript(bg.metas[res.id]);
					break;
				default:	// message
					updateNode(res);
			}
		}

		parent.addEventListener('click', function(e) {
			var data = e.target.dataset && e.target.dataset.id;
			if(data) {
				var obj = findItem(e.target);
				if(obj) {
					var func = commands[data];
					if(func) func(obj);
				}
			}
		}, false);

		return {
			forEach: function(cb) {
				list.forEach(cb);
			},
			setData: setData,
			updateItem: updateItem,
		};
	}();

	var Transporter = function() {
		var helper = $('#iImport');
		var cbValues = $('#cbValues');
		var btExport = $('#bExport');
		var xList = $('.export-list');

		function getFiles(data) {
			function getVMConfig(text) {
				try {
					vm = JSON.parse(text);
				} catch(e) {
					opera.postError('Error parsing ViolentMonkey configuration.');
				}
				var i;
				if(vm.values)
					for(i in vm.values) bg.setValue(null, {
						uri: i,
						values: vm.values[i],
					});
				if(vm.settings)
					for(i in vm.settings) setOption(i, vm.settings[i]);
			}
			var warn = [];
			var vm = {};
			var zip = new JSZip();
			try {
				zip.load(data);
			} catch(e) {
				alert(_('msgErrorZip'));
				return;
			}
			var vmfile = zip.file('ViolentMonkey');
			if(vmfile) getVMConfig(vmfile.asText());
			zip.file(/\.user\.js$/).forEach(function(file) {
				if(file.dir) return;
				var script = {code: file.asText()};
				if(vm.scripts) {
					var more = vm.scripts[file.name.slice(0, -8)];
					if(more) {
						delete more.id;
						script.more = more;
					}
				}
				bg.parseScript(script, function(ret) {
					if(ret.warnGrant) warn.push(ret.warnGrant);
				});
				count ++ ;
			});
			alert(_('msgImported', [count]));
			location.reload();
		}

		function importData(e) {
			var reader = new FileReader();
			reader.onload = getFiles;
			reader.readAsBinaryString(e.target.files[0]);
		}

		function exported(scripts) {
			function finish(values) {
				if(values) vm.values = values;
				zip.file('ViolentMonkey', JSON.stringify(vm));
				var data = zip.generate({compression: 'DEFLATE'});
				bg.opera.extension.tabs.create({url: 'data:application/zip;base64,' + data}).focus();
				btExport.disabled = false;
			}
			var names = {};
			var value_set = {};
			var vm = {scripts: {}, settings: getAllOptions()};
			if(cbValues.checked) vm.values={};
			var zip = new JSZip();
			scripts.forEach(function(script) {
				var name = script.custom.name || script.meta.name || 'Noname';
				if(names[name]) name += '_' + (++ names[name]);
				else names[name] = 1;
				zip.file(name + '.user.js', script.code);
				vm.scripts[name] = {
					id: script.id,
					custom: script.custom,
					enabled: script.enabled,
					update: script.update,
				};
				if(cbValues.checked)
					value_set[script.uri] = 1;
			});
			if(cbValues.checked) bg.getValues(Object.getOwnPropertyNames(value_set), finish);
			else finish();
		}

		function bindEvents() {
			helper.addEventListener('change', importData, false);
			btExport.addEventListener('click', function(e) {
				this.disabled=true;
				var ids = [];
				scriptList.forEach(function(data, i) {
					if(xList.childNodes[i].classList.contains('selected')) ids.push(data.script.id);
				});
				bg.getScripts(ids, false, exported);
			}, false);
			$('#bSelect').addEventListener('click', function(e) {
				var nodes = xList.childNodes;
				var state = !Array.prototype.every.call(nodes, function(node) {
					return node.classList.contains('selected');
				});
				Array.prototype.forEach.call(nodes, function(node) {
					node.classList[state ? 'add' : 'remove']('selected');
				});
			}, false);
			xList.addEventListener('click', function(e) {
				var node = e.target;
				if (node.parentNode === xList) node.classList.toggle('selected');
			}, false);
		}

		cbValues.checked = getOption('exportValues');
		cbValues.addEventListener('change', function(e) {
			setOption('exportValues', this.checked);
		}, false);
		bindEvents();

		return {
			initList: function() {
				xList.innerHTML = '';
				scriptList.forEach(function(data) {
					var option = document.createElement('div');
					var script = data.script;
					option.className = 'ellipsis selected';
					setTitle(option, script.custom.name || getLocaleString(script.meta, 'name'));
					xList.appendChild(option);
				});
				btExport.disabled = false;
			},
		};
	}();

	// Script Editor
	var Editor = function() {
		var parent = $('.editor-frame');
		var findNode = function() {
			var nodes = parent.querySelectorAll('[data-id]');
			var dict = {};
			Array.prototype.forEach.call(nodes, function(node) {
				dict[node.dataset.id] = node;
			});
			return function(id) {
				return dict[id];
			};
		}();
		var meta = parent.querySelector('.editor-meta');
		var btSave = findNode('save');
		var btSaveClose = findNode('savenclose');
		var btClose = findNode('close');
		var cbUpdate = findNode('update');
		var pCustom = {
			name: findNode('name'),
			runAt: findNode('run-at'),
			homepage: findNode('homepage'),
			updateURL: findNode('updateurl'),
			downloadURL: findNode('downloadurl'),
			keepInclude: findNode('keep-include'),
			include: findNode('include'),
			keepMatch: findNode('keep-match'),
			match: findNode('match'),
			keepExclude: findNode('keep-exclude'),
			exclude: findNode('exclude'),
		};
		var modified = false;
		var metaModified = false;
		var script = null;
		var editor;

		function markClean() {
			modified = false;
			metaModified = false;
			btSave.disabled = btSaveClose.disabled = true;
		}

		function markDirty(includeMeta) {
			if(includeMeta) metaModified = true;
			modified = true;
			btSave.disabled = btSaveClose.disabled = false;
		}

		function bindEvents() {
			var hideMeta = function(e) {
				meta.classList.add('hide');
				document.removeEventListener('mousedown', hideMeta, false);
			};
			meta.addEventListener('mousedown', stopPropagation, false);
			findNode('btCustom').addEventListener('click', function(e) {
				meta.classList.remove('hide');
				document.addEventListener('mousedown', hideMeta, false);
			}, false);
			btSave.addEventListener('click', save, false);
			btSaveClose.addEventListener('click', function(e) {
				save();
				close();
			}, false);
			btClose.addEventListener('click', close, false);
			cbUpdate.addEventListener('change', function(e) {
				markDirty();
			}, false);
			meta.addEventListener('change', markDirty, false);
			meta.addEventListener('dblclick', function(e) {
				var target = e.target;
				var placeholder = target.placeholder;
				if(!target.value && placeholder)
					target.value = placeholder;
			}, false);
		}

		function editScript(_script) {
			parent.classList.remove('hide');
			script = _script;
			cbUpdate.checked = script.update;
			editor.setValueAndFocus(script.code);
			editor.clearHistory();
			markClean();
			meta.classList.add('hide');
			pCustom.name.value = script.custom.name || '';
			pCustom.name.placeholder = script.meta.name || '';
			pCustom.homepage.value = script.custom.homepageURL || '';
			pCustom.homepage.placeholder = script.meta.homepageURL || '';
			pCustom.updateURL.value = script.custom.updateURL || '';
			pCustom.updateURL.placeholder = script.meta.updateURL || _('hintUseDownloadURL');
			pCustom.downloadURL.value = script.custom.downloadURL || '';
			pCustom.downloadURL.placeholder = script.meta.downloadURL || script.custom.lastInstallURL || '';
			pCustom.runAt.value = {
				'document-start': 'start',
				'document-idle': 'idle',
				'document-end': 'end',
			}[script.custom['run-at']] || 'default';
			pCustom.keepInclude.checked = script.custom._include != false;
			pCustom.keepMatch.checked = script.custom._match != false;
			pCustom.keepExclude.checked = script.custom._exclude != false;
			pCustom.include.value = (script.custom.include || []).join('\n');
			pCustom.match.value = (script.custom.match || []).join('\n');
			pCustom.exclude.value = (script.custom.exclude || []).join('\n');
		}

		function split(str) {
			var empty = /^\s*$/;
			return str.split(/\s*\n\s*/)
				.filter(function(e){return !empty.test(e);});
		}

		function save() {
			if(metaModified) {
				script.custom.name = pCustom.name.value;
				script.custom.homepageURL = pCustom.homepage.value;
				script.custom.updateURL = pCustom.updateURL.value;
				script.custom.downloadURL = pCustom.downloadURL.value;
				var runAt = {
					'start': 'document-start',
					'idle': 'document-idle',
					'end': 'document-end',
				}[pCustom.runAt.value];
				if(runAt) script.custom['run-at'] = runAt;
				else delete script.custom['run-at'];
				script.custom._include = pCustom.keepInclude.checked;
				script.custom._match = pCustom.keepMatch.checked;
				script.custom._exclude = pCustom.keepExclude.checked;
				script.custom.include = split(pCustom.include.value);
				script.custom.match = split(pCustom.match.value);
				script.custom.exclude = split(pCustom.exclude.value);
			}
			bg.parseScript({
				id: script.id,
				code: editor.getValue(),
				// suppress message
				message: '',
				more: {
					custom: script.custom,
					update: script.update = cbUpdate.checked,
				},
			}, function(ret) {
				if(ret.warnGrant) warnGrant(ret.warnGrant);
			})
			markClean();
		}

		function close() {
			if(!modified || confirm(_('confirmNotSaved'))) {
				script = null;
				parent.classList.add('hide');
			}
		}

		initEditor({
			callback: function(_editor) {
				editor = _editor;
			},
			container: parent.querySelector('.editor-code'),
			onsave: save,
			onexit: close,
			onchange: function(e) {
				markDirty();
			},
		});
		bindEvents();

		return {
			editScript: editScript,
		};
	}();

	// Switch tab
	!function() {
		function switchTab(e) {
			var current;
			forEach.call(menus, function(menu) {
				var href = menu.getAttribute('href');
				if(href == location.hash) {
					current = href;
					menu.classList.add('selected');
				} else
					menu.classList.remove('selected');
			});
			if(!current) {
				current = menus[0].getAttribute('href');
				menus[0].classList.add('selected');
			}
			current = current.slice(1);
			if(currentTab) currentTab.classList.add('hide');
			currentTab = dict[current];
			currentTab.classList.remove('hide');
			if(current == 'settings') Transporter.initList();
		}
		var menus = $$('.sidemenu>a');
		var tabs = $$('.content>[data-tab]');
		var forEach = Array.prototype.forEach;
		var dict = {};
		forEach.call(tabs, function(tab) {
			dict[tab.dataset.tab] = tab;
		});
		var currentTab = null;
		window.addEventListener('hashchange', switchTab, false);
		switchTab();
	}();

	// Load at last
	!function() {
		function updateSuboptions(op) {
			var sub = op.parentNode.nextElementSibling.querySelectorAll('input');
			Array.prototype.forEach.call(sub, function(i) {
				i.disabled = !op.checked;
			});
		}
		$('.sidebar').classList.remove('init');
		$('#currentLang').innerHTML = navigator.language;
		$('#cUpdate').checked = getOption('autoUpdate');
		$('#cUpdate').addEventListener('change', function(e) {
			setOption('autoUpdate', this.checked);
			if(this.checked) bg.autoCheck();
		}, false);
		var showButton = $('#cButton');
		showButton.checked = getOption('showButton');
		showButton.addEventListener('change', function(e) {
			setOption('showButton', this.checked);
			bg.showButton(this.checked);
			updateSuboptions(showButton);
		}, false);
		updateSuboptions(showButton);
		$('#cBadge').checked = getOption('showBadge');
		$('#cBadge').addEventListener('change', function(e) {
			setOption('showBadge', this.checked);
			bg.showBadge();
		}, false);
		var vacuum = $('#bVacuum');
		vacuum.onclick=function(){
			var self = this;
			self.disabled = true;
			self.innerHTML = _('buttonVacuuming');
			bg.vacuum(function() {
				self.innerHTML = _('buttonVacuumed');
			});
		};
		vacuum.title = _('hintVacuum');
		$('#bNew').addEventListener('click', function(e) {
			Editor.editScript(bg.newScript());
		}, false);
		$('#bUpdate').addEventListener('click', function(e) {
			bg.checkUpdateAll();
		}, false);
		bg.getData(scriptList.setData);
		bg._updateItem.push(scriptList.updateItem);
	}();
}();
