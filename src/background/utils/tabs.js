define('utils/tabs', function (_require, _exports, module) {
  module.exports = {
    create: function (url) {
      opera.extension.tabs.create({url: url}).focus();
    },
    get: function () {
      return opera.extension.tabs.getFocused();
    },
  };
});
