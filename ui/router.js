app(function(api) {
  $('body').on('click tap', api.route_filter, function(e) {
    var href = this.getAttribute('data-href') || this.getAttribute('href');
    if (href) {
      riot.route(href);
    }

  }).on('click', '#logout', function(e) {
    e.preventDefault();
    api.auth.logout();

  });

  riot.route(function(hash) {
    if(hash && hash.substr(0,3) !== '#!/') {
      return;
    }
    
    var path = hash.slice(3);
    if (!path) {
      api.auth.trigger('login', {});
      return;
    }
    api.load(path);

  });

}); 

