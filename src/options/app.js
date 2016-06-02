define('app', function (require, exports, _module) {
  var MainView = require('views/Main');
  var ConfirmView = require('views/Confirm');
  var models = require('models');
  var cache = require('cache');

  var App = cache.BaseRouter.extend({
    routes: {
      '': 'renderMain',
      'main/:tab': 'renderMain',
      'confirm/:url': 'renderConfirm',
      'confirm/:url/:from': 'renderConfirm',
    },
    renderMain: function (tab) {
      this.loadView('main', function () {
        initMain();
        return new MainView;
      }).loadTab(tab);
    },
    renderConfirm: function (url, referer) {
      this.loadView('confirm', function () {
        return new ConfirmView;
      }).initData(url, referer);
    },
  });
  var app = new App('#app');
  Backbone.history.start() || app.navigate('', {trigger: true, replace: true});

  function initMain() {
    var scriptList = exports.scriptList = new models.ScriptList;
    _.bg._.messenger.connect(window, function (res) {
      if (res.cmd === 'add') {
        res.data.message = '';
        scriptList.push(res.data);
      } else if (res.data) {
        var model = scriptList.get(res.data.id);
        if (model) model.set(res.data);
      }
    });
  }
});
