app(function(api) {
  var route_filter = api.conf.route_filter || '[href^="#!/"]';
  $('body').on('click tap', route_filter, function(e) {
    var href = this.getAttribute('data-href') || this.getAttribute('href');
    if (href) {
      riot.route(href);
    }

  }).on('click', '#logout', function(e) {
    e.preventDefault();
    api.auth.logout();

  });

  riot.route(function(hash) {
    api.route(hash);
  });

}); 

