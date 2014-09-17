// The ability to split your single-page application (SPA) into loosely-coupled module
var instance;

app = riot.observable(function(arg) {

  // admin() --> return instance
  if (!arg) return instance;

  // admin(fn) --> add a new module
  if (typeof arg === 'function') {
    app.on('ready', arg);

  // admin(conf) --> initialize the application
  } else {

    instance = new App(arg);

    instance.on('ready', function() {
      app.trigger('ready', instance);
    });

  }

});

