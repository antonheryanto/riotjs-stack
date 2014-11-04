
// The admin API
function App(conf) {
  
  var self = riot.observable(this),
      init = conf.init || 'auth';
  self.conf = conf;
  self.home_module = conf.home_module || 'home';
  self.debug = conf.debug;
  self.backend = new Backend(self);
  self.auth = new Auth(self.backend);

  self.load = function(path, fn) {
    
    if (!path) {
      path = self.home_module;
    }
    var raw = path.split('?');
    var uri = raw[0].split('/');
    var module = self[uri[0]],
        action = uri[1] || 'index',
        qs = raw[1],
        arg = {},
        triggerOnly;
    
    if (!module) {
      if (!qs) {
        if (self.debug) {
          console.warn('module: ', uri[0], ' is not found');
        }
        return;
      }
      module = self[self.home_module];
    }

    self.trigger("before:load", path);
    self.one("load", fn);

    // route handler
    // check query string
    if (qs) {
      qs.split('&').forEach(function(v) {
        var c = v.split('=');
        arg[c[0]] = c[1];
      });
    }
    //parse id when action is number
    var id = parseInt(action, 10);
    if (id) {
      arg.id = id;
      action = uri[2] || 'details';
    } 

    if (self.debug) {
      console.info("app load module:", uri, 'arg: ', arg, module.IS_PUBLIC ? "public" : "need login");
    }

    if (module[action] && !module.IS_PUBLIC && !self.auth.authorized()) {
      return;
    }

    return module[action] ? module[action](arg) : module.trigger(action, arg);
  };

  // initialization
  self.backend.call(init).always(function(data) {
    if (self.debug) {
      console.log('application ready');
    }
    self.trigger("ready");
    //defined function when ready
  
  }).done(function(data) {
    if (self.debug) {
      console.log('data ready and init');
    }
    //check user logged, if not procced route
    if (!self.auth.validate(data)) {
      //load module based on current hash
      self.route(location.hash);
    }

  }).fail(function(error) {
    console.warn("fail", error);
    // failed because
  });

  self.route = function(hash) {
    var path = hash.slice(3);

    if (hash.substr(0,3) === '#!/' && path) {
      self.load(path);
      return;
    }
    //if logged go to home
    self.load();

  };

  self.auth.on('login', function(me) {
    self.auth.trigger('before:login', me);
    self.route(location.hash);
  });

}

