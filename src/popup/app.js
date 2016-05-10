define('app', function (require, exports, _module) {
  var models = require('models');
  var Menu = models.Menu;
  var MenuItem = models.MenuItem;
  var MenuView = require('views/Menu');
  var CommandsView = require('views/Command');
  var DomainsView = require('views/Domain');
  var tabs = _.require('utils/tabs');
  var badges = _.require('badges');

  var scriptsMenu = exports.scriptsMenu = new Menu;
  var commandsMenu = exports.commandsMenu = new Menu;
  var domainsMenu = exports.domainsMenu = new Menu;

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

  exports.navigate = app.navigate.bind(app);

  !function () {
    function commandClick(_e, model) {
      tabs.get().postMessage({
        cmd: 'Command',
        data: model.get('name'),
      });
    }
    function domainClick(_e, model) {
      tabs.create('https://greasyfork.org/scripts/search?q=' + model.get('name'));
    }
    function scriptSymbol(data) {
      return data ? 'check' : 'remove';
    }
    function scriptClick(_e, model) {
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
      var url = tabs.get().url;
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
      SetPopup: function (data, _src, _callback) {
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
    badges.get();
  }();
});
