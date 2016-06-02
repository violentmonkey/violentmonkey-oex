define('views/TabSettings', function (require, _exports, module) {
  var BaseView = require('cache').BaseView;
  var app = require('app');
  var tabs = _.require('utils/tabs');

  var ExportList = BaseView.extend({
    templateUrl: '/options/templates/option.html',
    events: {
      'click div': 'toggleSelected',
    },
    initialize: function () {
      var _this = this;
      BaseView.prototype.initialize.call(_this);
      _this.listenTo(app.scriptList, 'reset change update', _this.render);
    },
    _render: function () {
      var _this = this;
      _this.$el.html(app.scriptList.map(function (script) {
        return _this.templateFn(script.toJSON());
      }).join(''));
    },
    getSelected: function () {
      return _.map(this.$el.children(), function (el, i) {
        return el.classList.contains('selected') ? app.scriptList.at(i) : null;
      }).filter(function (i) {return i;});
    },
    toggleSelected: function (e) {
      e.target.classList.toggle('selected');
    },
    toggleAll: function () {
      var options = this.$el.children();
      var select = _.some(options, function (option) {
        return !option.classList.contains('selected');
      });
      options.each(function (_i, option) {
        option.classList[select ? 'add' : 'remove']('selected');
      });
    },
  });

  module.exports = BaseView.extend({
    name: 'settings',
    className: 'content',
    events: {
      'change [data-check]': 'updateCheckbox',
      'change #cUpdate': 'updateAutoUpdate',
      'click #bSelect': 'toggleSelection',
      'change #bImportHelper': 'importFile',
      'click #bExport': 'exportData',
      'click #bVacuum': 'onVacuum',
    },
    templateUrl: '/options/templates/tab-settings.html',
    _render: function () {
      var _this = this;
      var options = _.options.getAll();
      _this.$el.html(_this.templateFn(options));
      _this.exportList = new ExportList({
        el: _this.$('.export-list')[0],
      });
    },
    updateCheckbox: _.updateCheckbox,
    updateAutoUpdate: function (_e) {
      _.sendMessage({cmd: 'AutoUpdate'});
    },
    toggleSelection: function () {
      this.exportList.toggleAll();
    },
    importData: function (file) {
      function getVMConfig(text) {
        var vm;
        try {
          vm = JSON.parse(text);
        } catch (e) {
          opera.postError('Error parsing ViolentMonkey configuration.');
        }
        vm = vm || {};
        _.forEach(vm.values, function (value, key) {
          _.sendMessage({
            cmd: 'SetValue',
            data: {
              uri: key,
              values: value,
            }
          });
        });
        _.forEach(vm.settings, function (value, key) {
          _.options.set(key, value);
        });
        return vm;
      }
      function getVMFile(entry, vm) {
        return entry.async('string')
          .then(function (text) {
            var script = {code: text};
            if (vm.scripts) {
              var more = vm.scripts[entry.name.slice(0, -8)];
              if (more) script.more = _.omit(more, ['id']);
            }
            return _.sendMessage({
              cmd: 'ParseScript',
              data: script,
            });
          }).then(function () {
            return true;
          });
      }
      function getVMFiles(zip) {
        var vm = zip.file('ViolentMonkey');
        return (
          vm
            ? vm.async('string')
            .then(function (text) {
              return {
                vm: getVMConfig(text),
              };
            })
            : Promise.resolve({})
        ).then(function (data) {
          data.entries = zip.filter(function (relativePath, _file) {
            return /\.user\.js$/.test(relativePath);
          });
          return data;
        });
      }
      JSZip.loadAsync(file)
        .then(getVMFiles)
        .then(function (data) {
          var vm = data.vm || {};
          return Promise.all(data.entries.map(function (entry) {
            return getVMFile(entry, vm);
          })).then(function (res) {
            return _.filter(res).length;
          });
        }).then(function (count) {
          app.scriptList.reload();
          alert(_.i18n('msgImported', [count]));
        });
    },
    importFile: function (e) {
      var _this = this;
      var input = e.target;
      if (input.files && input.files.length) {
        _this.importData(input.files[0]);
      }
    },
    exportData: function () {
      var bExport = this.$('#bExport');
      bExport.prop('disabled', true);
      var selected = this.exportList.getSelected();
      if (!selected.length) return;
      var withValues = this.$('#cbValues').prop('checked');
      _.sendMessage({
        cmd: 'ExportZip',
        data: {
          values: withValues,
          ids: _.map(selected, 'id'),
        }
      }).then(function (data) {
        var names = {};
        var vm = {
          scripts: {},
          settings: _.options.getAll(),
        };
        if (withValues) vm.values = {};
        var files = data.scripts.map(function (script) {
          var name = script.custom.name || script.meta.name || 'Noname';
          if (names[name]) name += '_' + (++ names[name]);
          else names[name] = 1;
          vm.scripts[name] = _.pick(script, ['id', 'custom', 'enabled', 'update']);
          if (withValues) {
            var values = data.values[script.uri];
            if (values) vm.values[script.uri] = values;
          }
          return {
            name: name + '.user.js',
            content: script.code,
          };
        });
        files.push({
          name: 'ViolentMonkey',
          content: JSON.stringify(vm),
        });
        return files;
      }).then(function (files) {
        var zip = new JSZip;
        files.forEach(function (file) {
          zip.file(file.name, file.content);
        });
        return zip.generateAsync({type: 'base64'});
      }).then(function (data) {
        tabs.create('data:application/zip;base64,' + data);
        bExport.prop('disabled', false);
      });
    },
    onVacuum: function (e) {
      var button = $(e.target);
      button.prop('disabled', true).html(_.i18n('buttonVacuuming'));
      _.sendMessage({cmd: 'Vacuum'}).then(function () {
        button.html(_.i18n('buttonVacuumed'));
      });
    },
  });
});
