var AboutTab = BaseView.extend({
  el: '#tab',
  name: 'about',
  templateUrl: '/options/templates/tab-about.html',
  _render: function () {
    this.$el.html(this.templateFn({
      version: _.bg.app.version,
    }));
  },
});
