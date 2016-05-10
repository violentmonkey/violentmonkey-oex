define('app', function (require, _exports, module) {
  Promise.onUncaught = function (reason) {
    opera.postError(reason.message + '\n' + reason.stack);
  };

  var scriptUtils = require('utils/script');
  var VMDB = require('vmdb');
  var badges = require('badges');
  var requests = require('requests');
  var tabs = require('utils/tabs');
  var cache = require('utils/cache');
  window._require = require;

  var vmdb = new VMDB;
  var app = module.exports = {version: '__VERSION__'};

  var autoUpdate = function () {
    function check() {
      checking = true;
      return new Promise(function (resolve, reject) {
        if (!_.options.get('autoUpdate')) return reject();
        if (Date.now() - _.options.get('lastUpdate') >= 864e5)
          resolve(commands.CheckUpdateAll());
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

  var commands = app.commands = {
    NewScript: function () {
      return scriptUtils.newScript();
    },
    RemoveScript: function (id) {
      return vmdb.removeScript(id);
    },
    GetData: function () {
      return vmdb.getData().then(function (data) {
        data.options = _.options.getAll();
        data.version = app.version;
        return data;
      });
    },
    GetInjected: function (url) {
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
    UpdateScriptInfo: function (data) {
      return vmdb.updateScriptInfo(data.id, data).then(function (script) {
        _.messenger.post({
          cmd: 'update',
          data: script,
        });
      });
    },
    SetValue: function (data) {
      return vmdb.setValue(data.uri, data.values);
    },
    SetOption: function (data) {
      _.options.set(data.key, data.value);
    },
    ExportZip: function (data) {
      return vmdb.getExportData(data.ids, data.values);
    },
    GetScript: function (id) {
      return vmdb.getScriptData(id);
    },
    GetMetas: function (ids) {
      return vmdb.getScriptInfos(ids);
    },
    Move: function (data) {
      return vmdb.moveScript(data.id, data.offset);
    },
    Vacuum: function () {
      return vmdb.vacuum();
    },
    ParseScript: function (data) {
      return vmdb.parseScript(data).then(function (res) {
        // var meta = res.data.meta;
        _.messenger.post(res);
        return res.data;
      });
    },
    CheckUpdate: function (id) {
      vmdb.getScript(id).then(vmdb.checkUpdate);
    },
    CheckUpdateAll: function () {
      _.options.set('lastUpdate', Date.now());
      vmdb.getScriptsByIndex('update', '"update"=1').then(function (scripts) {
        return Promise.all(scripts.map(vmdb.checkUpdate));
      });
    },
    ParseMeta: function (code) {
      return scriptUtils.parseMeta(code);
    },
    AutoUpdate: autoUpdate,
    GetPopup: badges.get,
    SetPopup: badges.set,
    InstallScript: function (data) {
      var params = encodeURIComponent(data.url);
      if (data.from) params += '/' + encodeURIComponent(data.from);
      if (data.text) cache.set(data.url, data.text);
      tabs.create('/options.html#confirm/' + params);
    },
    GetRequestId: function () {
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
    AbortRequest: function (id) {
      return requests.abortRequest(id);
    },
  };

  if (+opera.version() < 12) {
    tabs.create('https://github.com/violentmonkey/violentmonkey-oex/wiki/Obsolete');
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
            if (err) opera.postError(err.message, err.stack);
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
});
