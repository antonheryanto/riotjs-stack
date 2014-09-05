(function() {
  window.templates = {};
  $('template').each(function(v) { 
    window.templates[this.id] = $(this).html();
  });

})();
