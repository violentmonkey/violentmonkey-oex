var MenuView = MenuBaseView.extend({
  initialize: function () {
    MenuBaseView.prototype.initialize.call(this);
    this.listenTo(scriptsMenu, 'reset', this.render);
    this.listenTo(commandsMenu, 'reset', this.render);
    this.listenTo(domainsMenu, 'reset', this.render);
  },
  _render: function () {
    var _this = this;
    _this.$el.html(_this.templateFn({
      hasSep: !!scriptsMenu.length
    }));
    var comp = _this.components();
    var top = comp.top;
    var bot = comp.bot;
    _this.addMenuItem({
      name: _.i18n('menuManageScripts'),
      symbol: 'fa-cog',
      onClick: function (e) {
        _.bg.opera.extension.tabs.create({
          url: '/options.html',
        }).focus();
      },
    }, top);
    if (domainsMenu.length)
      _this.addMenuItem({
        name: _.i18n('menuFindScripts'),
        symbol: 'fa-search',
        onClick: function (e) {
          var tabData = _.bg.badges.getData();
          var matches = tabData && tabData.url.match(/:\/\/(?:www\.)?([^\/]*)/);
          matches && _.bg.opera.extension.tabs.create({
            url: 'https://greasyfork.org/scripts/search?q=' + matches[1],
          }).focus();
        },
        onClickDetail: function (e) {
          app.navigate('domains', {trigger: true});
        },
      }, top);
    if (commandsMenu.length) _this.addMenuItem({
      name: _.i18n('menuCommands'),
      symbol: 'fa-arrow-right',
      onClick: function (e) {
        app.navigate('commands', {trigger: true});
      },
    }, top);
    _this.addMenuItem({
      name: function (data) {
        return data ? _.i18n('menuScriptEnabled') : _.i18n('menuScriptDisabled');
      },
      data: _.options.get('isApplied'),
      symbol: function (data) {
        return data ? 'fa-check' : 'fa-times';
      },
      onClick: function (e, model) {
        var isApplied = !model.get('data');
        _.options.set('isApplied', isApplied);
        model.set({data: isApplied});
        _.bg.badges.update();
      },
    }, top);
    scriptsMenu.each(function (item) {
      _this.addMenuItem(item, bot);
    });
    setTimeout(function () {
      _this.fixStyles(bot, comp.plh);
    });
  },
});
