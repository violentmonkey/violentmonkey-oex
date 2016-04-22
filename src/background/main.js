var vmdb = new VMDB;
var app = {version: '__VERSION__'};

var badges = function () {
  function cancel() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }
  function clear() {
    cancel();
    badges.button.badge.display = 'none';
    tabData = null;
  }
  function clearLater() {
    cancel();
    timer = setTimeout(clear, 200);
  }
  function getBadges() {
    var tab = opera.extension.tabs.getFocused();
    try {
      tab.postMessage({cmd: 'GetPopup'});
      clearLater();
    } catch (e) {
      clear();
    }
  }
  function setBadges(data, src) {
    badges.tabData = data;
    if (data.badge /*&& _.options.get('showBadge')*/) {
      badges.button.badge.textContent = data.badge > 99 ? '99+' : data.badge;
      badges.button.badge.display = 'block';
      cancel();
    } else {
      clear();
    }
    _.popupMessenger.post(data);
  }
  function updateIcon() {
    var isApplied = _.options.get('isApplied');
    badges.button.icon = '/images/icon18' + (isApplied ? '' : 'w') + '.png';
  }
  function show(show) {
    var toolbar = opera.contexts.toolbar;
    if (show) toolbar.addItem(badges.button);
    else toolbar.removeItem(badges.button);
  }
  function init() {
    badges.button = opera.contexts.toolbar.createItem({
      title: _.i18n('extName'),
      popup: {
        href: '/popup/index.html',
        width: 222,
        height: 100,
      },
      badge: {
        backgroundColor: '#808',
        color: 'white',
        display: 'none',
      },
    });
    updateIcon();
    show(_.options.get('showButton'));
  }
  var timer;
  var badges = {
    init: init,
    get: getBadges,
    set: setBadges,
    update: updateIcon,
  };
  return badges;
}();

var autoUpdate = function () {
  function check() {
    checking = true;
    return new Promise(function (resolve, reject) {
      if (!_.options.get('autoUpdate')) return reject();
      if (Date.now() - _.options.get('lastUpdate') >= 864e5)
        return commands.CheckUpdateAll();
    }).then(function () {
      setTimeout(check, 36e5);
    }, function () {
      checking = false;
    });
  }
  var checking;
  return function () {
    checking || check();
  };
}();

function initMessenger() {
  var callbacks = [];
  return {
    connect: function (callback) {
      callbacks.push(callback);
    },
    post: function (data) {
      callbacks = callbacks.filter(function (callback) {
        try {
          callback(data);
        } catch (e) {
          return false;
        }
        return true;
      });
    },
  };
}
_.messenger = initMessenger();
_.popupMessenger = initMessenger();

var commands = {
  NewScript: function (data, src) {
    return scriptUtils.newScript();
  },
  RemoveScript: function (id, src) {
    return vmdb.removeScript(id);
  },
  GetData: function (data, src) {
    return vmdb.getData().then(function (data) {
      data.options = _.options.getAll();
      data.version = app.version;
      return data;
    });
  },
  GetInjected: function (url, src) {
    var data = {
      isApplied: _.options.get('isApplied'),
      injectMode: _.options.get('injectMode'),
      version: app.version,
    };
    return data.isApplied
    ? vmdb.getScriptsByURL(url).then(function (res) {
      return _.assign(data, res);
    }) : data;
  },
  UpdateScriptInfo: function (data, src) {
    return vmdb.updateScriptInfo(data.id, data).then(function (script) {
      _.messenger.post({
        cmd: 'update',
        data: script,
      });
    });
  },
  SetValue: function (data, src) {
    return vmdb.setValue(data.uri, data.values);
  },
  SetOption: function (data, src) {
    _.options.set(data.key, data.value);
  },
  ExportZip: function (data, src) {
    return vmdb.getExportData(data.ids, data.values);
  },
  GetScript: function (id, src) {
    return vmdb.getScriptData(id);
  },
  GetMetas: function (ids, src) {
    return vmdb.getScriptInfos(ids);
  },
  Move: function (data, src) {
    return vmdb.moveScript(data.id, data.offset);
  },
  Vacuum: function (data, src) {
    return vmdb.vacuum();
  },
  ParseScript: function (data, src) {
    return vmdb.parseScript(data).then(function (res) {
      var meta = res.data.meta;
      if (!meta.grant.length && !_.options.get('ignoreGrant'))
        notify({
          id: 'VM-NoGrantWarning',
          title: _.i18n('Warning'),
          body: _.i18n('msgWarnGrant', [meta.name||_.i18n('labelNoName')]),
          onClicked: function () {
            _.mx.br.tabs.newTab({
              activate: true,
              url: 'http://wiki.greasespot.net/@grant',
            });
            this.close();
          },
        });
      _.messenger.post(res);
      return res.data;
    });
  },
  CheckUpdate: function (id, src) {
    vmdb.getScript(id).then(vmdb.checkUpdate);
  },
  CheckUpdateAll: function (data, src) {
    _.options.set('lastUpdate', Date.now());
    vmdb.getScriptsByIndex('update', '"update"=1').then(function (scripts) {
      return Promise.all(scripts.map(vmdb.checkUpdate));
    });
  },
  ParseMeta: function (code, src) {
    return scriptUtils.parseMeta(code);
  },
  AutoUpdate: autoUpdate,
  GetPopup: badges.get,
  SetPopup: badges.set,
  InstallScript: function (data, src) {
    var params = encodeURIComponent(data.url);
    if (data.from) params += '/' + encodeURIComponent(data.from);
    opera.extension.tabs.create({
      url: '/options.html#confirm/' + params,
    });
  },
  GetRequestId: function (data, src) {
    return requests.getRequestId();
  },
  HttpRequest: function (details, src) {
    requests.httpRequest(details, function (res) {
      src.postMessage({
        cmd: 'HttpRequested',
        data: res,
      });
    });
    return false;
  },
  AbortRequest: function (id, src) {
    return requests.abortRequest(id);
  },
};

if (+opera.version() < 12) {
  opera.extension.tabs.create({
    url: 'https://github.com/violentmonkey/violentmonkey-oex/wiki/Obsolete',
  });
} else {
  vmdb.initialized.then(function () {
    opera.extension.onmessage = function (e) {
      /*
      * o={
      * 	cmd: String,
      * 	src: {
      * 		id: String,
      * 		url: String,
      * 	},
      * 	callback: String,
      * 	data: Object
      * }
      */
      function finish(data, error) {
        e.source.postMessage({
          cmd: 'Callback',
          cmdFor: req.cmd,
          data: data,
          error: error,
        });
      }
      var req = e.data;
      var func = commands[req.cmd];
      if (func) {
        var res = func(req.data, e.source);
        if (res) return Promise.resolve(res)
        .then(function (data) {
          finish(data);
        }, function (err) {
          if (err) console.log(err.message, err.stack);
          finish(null, err);
        });
      }
      finish();
    };
    badges.init();
    setTimeout(autoUpdate, 2e4);
    opera.extension.tabs.onfocus = badges.get;
  });
}
