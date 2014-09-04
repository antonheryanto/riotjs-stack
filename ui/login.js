
app(function(api) {

  var m = api.auth,
      $login = $('#login'),
      $error = $('#login-error');

  $('#form-login').on('submit', function(e) {
    e.preventDefault();
    m.login(this).done(function(r) {
      if (r.id) { 
        $login.addClass('hide');
        return;
      }
      console.warn("login failed", r);
      $error.html(r.warning || r.error);

    }).fail(function(r) {
      console.info("login failed", r.message);
      $error.html(r.message);
    });

  });

  m.on('login', function(r) {
    $login.addClass('hide');
    api.main.removeClass('hide');
    api.me = api.auth.current();

    //check route redirect
    var hash = location.hash;
    var path = hash.slice(3);
    if (hash.substr(0,3) === '#!/' && path) {
      api.load(path);
      return;
    }

    //if logged go to home
    if (api.me && api.me.id) {
      var action = "index";
      if (api.home[action]) {
        api.home[action]();
      } else {
        api.home.trigger(action);
      }
    }
  });

  m.on('logout', function(r) {
    location.hash = '!/';
    $login.removeClass('hide');
    api.main.addClass('hide');
  });

  $('body').on('click', '#logout', function(e) {
    e.preventDefault();
    m.logout();
  });

});
