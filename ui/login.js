//common login process
app(function(api) {

  api.login_form.on('submit', function(e) {
    e.preventDefault();
    api.auth.login(this);
  });

  api.auth.on('login', function(r) {
    if (api.login) {
      api.login.addClass('hide');
    }

    api.me = api.auth.current();
    api.auth.trigger('before:login', api.me);
    //check route redirect
    var hash = location.hash;
    var path = hash.slice(3);
    if (hash.substr(0,3) === '#!/' && path) {
      api.load(path);
      return;
    }
    //if logged go to home
    if (api.me && api.me.id && api.home) {
      var action = "index";
      return api.home[action] ? api.home[action]() : api.home.trigger(action);
    }
  }).on('logout', function() {
    if (api.login) {
      api.login.removeClass('hide');
    }

  });

});

