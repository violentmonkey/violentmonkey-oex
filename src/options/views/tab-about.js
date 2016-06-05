define('views/TabAbout', function (require, _exports, module) {
  var BaseView = require('cache').BaseView;
  var app = _.require('app');
  module.exports = BaseView.extend({
    name: 'about',
    className: 'content',
    templateUrl: '/options/templates/tab-about.html',
    _render: function () {
      this.$el.html(this.templateFn({
        version: app.version,
      }));
    },
  });
});
