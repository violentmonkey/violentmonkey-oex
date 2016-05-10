define('badges', function (require, _exports, module) {
  var i18n = require('utils/i18n');
  var tabs = require('utils/tabs');

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
    var tab = tabs.get();
    try {
      tab.postMessage({cmd: 'GetPopup'});
      clearLater();
    } catch (e) {
      clear();
    }
  }
  function setBadges(data) {
    tabData = data;
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
      title: i18n('extName'),
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
  var timer, tabData;
  var badges = module.exports = {
    init: init,
    get: getBadges,
    set: setBadges,
    update: updateIcon,
    getData: function () {
      return tabData;
    },
  };
});
