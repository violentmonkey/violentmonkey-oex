var App = Backbone.Router.extend({
  routes: {
    '': 'renderMenu',
    commands: 'renderCommands',
    domains: 'renderDomains',
  },
  renderMenu: function () {
    this.view = new MenuView;
  },
  renderCommands: function () {
    this.view = new CommandsView;
  },
  renderDomains: function () {
    this.view = new DomainsView;
  },
});
var app = new App();
if (!Backbone.history.start())
  app.navigate('', {trigger: true, replace: true});

!function () {
  function commandClick(e, model) {
    _.bg.opera.extension.tabs.getFocused()
    .postMessage({
      cmd: 'Command',
      data: model.get('name'),
    });
  }
  function domainClick(e, model) {
    _.bg.opera.extension.tabs.create({
      url: 'https://greasyfork.org/scripts/search?q=' + model.get('name'),
    }).focus();
  }
  function scriptSymbol(data) {
    return data ? 'check' : 'remove';
  }
  function scriptClick(e, model) {
    var data = !model.get('data');
    _.sendMessage({
      cmd: 'UpdateScriptInfo',
      data: {
        id: model.get('id'),
        enabled: data,
      },
    }).then(function () {
      model.set({data: data});
    });
  }
  function init() {
    var url = _.bg.opera.extension.tabs.getFocused().url;
    if (/^https?:\/\//i.test(url)) {
      var matches = url.match(/:\/\/(?:www\.)?([^\/]*)/);
      var domain = matches[1];
      var pieces = domain.split('.').reverse();
      var domains = [];
      var last = pieces.shift();
      pieces.forEach(function (piece) {
        last = piece + '.' + last;
        domains.unshift(last);
      });
      if (!domains.length) domains.push(domain);
      domainsMenu.reset(domains.map(function (domain) {
        return new MenuItem({
          name: domain,
          title: true,
          className: 'ellipsis',
          onClick: domainClick,
        });
      }));
    }
  }

  var commands = {
    SetPopup: function (data, src, callback) {
      commandsMenu.reset(data.menus.map(function (menu) {
        return new MenuItem({
          name: menu[0],
          symbol: 'right-hand',
          title: true,
          className: 'ellipsis',
          onClick: commandClick,
        });
      }));
      _.sendMessage({
        cmd: 'GetMetas',
        data: data.ids,
      }).then(function (scripts) {
        scriptsMenu.reset(scripts.map(function (script) {
          return new MenuItem({
            id: script.id,
            name: script.custom.name || _.getLocaleString(script.meta, 'name'),
            data: !!script.enabled,
            symbol: scriptSymbol,
            title: true,
            className: 'ellipsis',
            onClick: scriptClick,
          });
        }));
      });
    },
  };
  init();
  _.bg._.popupMessenger.connect(commands.SetPopup);
  _.bg.badges.get();
}();
