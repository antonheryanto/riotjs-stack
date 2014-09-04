app(function(api) {
  api.root.on('click tap', api.filter, function(e) {
    e.preventDefault();
    var href = this.getAttribute('href') || this.getAttribute('data-href');
    if (href) {
      riot.route(href);
    }
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

