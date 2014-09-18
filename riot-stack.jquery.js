
// The admin API
function App(conf) {
  
  var self = riot.observable(this),
      init = conf.init || 'auth';
  self.conf = conf;
  self.home_module = conf.home_module || 'home';
  self.debug = conf.debug;
  self.backend = new Backend(conf);
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

    if (self.debug) {
      console.info("app load", uri);
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
    console.log("fail", error);
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
    self.trigger('before:login', me);
    self.route(location.hash);
  });

}



function Auth(backend) {
  var self = riot.observable(this),
      item = null;

  self.current = function() {
    return item;
  };

  self.authorized = function() {
    if (!item) {
      self.trigger('logout');
      return false;
    }
    return item;
  };

  self.login = function(m, fn) {
    self.one('login', fn);

    return backend.call('auth', {}, m, function(r) {
      if (!r || !r.id) {
        self.trigger('login:error', r);
        return;
      }
      item = r;
      self.trigger('login', r);
    });
  };

  self.logout = function(fn) {
    self.one('logout', fn);

    return backend.call('auth/logout', function(r) {
      item = null;
      self.trigger('logout',r);
    });
  };

  self.validate = function(r, fn) {
    self.one('validate', fn);
    
    item = r && r.id ? r : item;
    if (item) {
      return self.trigger('login', item);
    }
  };
  
  self.save = function(m, fn) {
    self.one('save', fn);
    
    return backend.call(url, {}, m, function(r) {
      self.trigger('save', r);
    });
  };

}


// Fake backend to simulate a real thing
function Backend(conf) {

  var self = this,
    debug = conf.debug && typeof console != 'undefined';
    uri = conf.uri || '/';
  
  // underlying implementation for `call` can change
  self.call = function(api, arg, data, fn, fnProgress) {
    
    var promise = new Promise(fn),
        url = uri + api;

    if (typeof arg === 'function') {
      fn = arg;
      arg = null;
    }
    if (typeof data === 'function') {
      fn = data;
      data = null;
    }
    //handle query string
    if (arg) {
      var parts = [];
      for (var i in arg) {
        if (arg.hasOwnProperty(i)) {
          parts.push(encodeURIComponent(i) + "=" + encodeURIComponent(arg[i]));
        }
      }
      url += '?' + parts.join("&");
    }
    var method = data ? 'POST' : 'GET';
    // debug message
    if (debug) console.info("->", method, url, data);

    var fd = data ? new FormData(data) : undefined;
    //start nprogress
    if (window.NProgress) {
      NProgress.start();
    }
    //add secret token
    var xhr = new XMLHttpRequest();
    xhr.onload = function (e) {
      var r = null;
      try {
        r = JSON.parse(this.response);
      } catch(ex) {
        console.warn(ex);
        promise.fail(r);
      }

      promise.always(r);
      promise[xhr.status == 200 ? 'done' : 'fail'](r);
      if (debug) console.info("<-", r);
      //start nprogress
      if (window.NProgress) {
        NProgress.done();
      }
    };

    xhr.onerror = function(e) {
      console.warn("error occur", this);
      promise.fail({ message: "offline or connection refuse" });
    };

    fnProgress = fnProgress || function(e) {
      if (window.NProgress && e.lengthComputable) {
        NProgress.set(e.loaded / e.total);
      }
    };
    xhr.addEventListener("progress", fnProgress);
    xhr.upload.onprogress = fnProgress;
    xhr.open(method, url);
    xhr.send(fd);
    // given callback
    promise.done(fn);

    return promise;
  };
}



function CrudApi(path, backend, external) {
  var self = riot.observable(this);

  self.index = function(arg,fn) {
    self.one('index', fn);
    
    return backend.call(path, arg, function(r) {
      self.trigger('index', r, arg);
    });
  };

  self.add = function(arg) {
    self.trigger('edit', {}, arg);
  };

  self.edit = function(arg, fn) {
    self.one('edit', fn);
    return backend.call(path, arg, function(r) {
      self.trigger('edit', r, arg);
    });
  };

  self.details = function(arg, fn) {
    self.one('details', fn);
    return backend.call(path, arg, function(r) {
      self.trigger('details', r, arg);
    });
  };

  self.save = function(m, args, fn, fnProgress) {
    args = args || {};
    self.one('save', fn);
    
    return backend.call(path, args, m, function(r) {
      if (!r && !external) {
        self.trigger('save');
      }
    }, fnProgress);
  };

  self.remove = function(id, fn) {
    self.one('remove', fn);
    return backend.call(path, {id:id, method: 'DELETE'});
  };
  
  self.on('save', function() {
    location.hash = '!/' + path;
  });

}


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


// A generic promiese interface by using riot.observable
function Promise (fn) {
  var self = riot.observable(this),
      status = ['done', 'fail', 'always'];
  
  var statusFn = function(name) {
      self[name] = function(arg) {
        return self[typeof arg === 'function' ? 'on' : 'trigger'](name, arg);
      };
  };

  for (var i = 0; i < status.length; i++) {
    statusFn(status[i]);
  }
}


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

