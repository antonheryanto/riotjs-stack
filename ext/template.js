(function(templates) {
  templates = templates || {};
  $('template').each(function(v) { 
    templates[this.id] = $.trim($(this).html());
  });
  
  jQuery.fn.extend({
    render: function(id, data) {
      data = data || {};
      var self = this;
      var t = templates[id];
      if (t) {
        self.html(riot.render(t, data));
      }
      return $.get('views/' + id + '.html', function(v) {
        var $v = $.trim(v);
        templates[id] = $v;
        self.html(riot.render($v,data));
      });
    }
  });

})(window.templates = window.templates || {});
