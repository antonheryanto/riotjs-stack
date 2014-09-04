
// The admin API
function App(conf) {
  
  var self = riot.observable(this),
      init = conf.init || 'auth';
  self.route_filter = conf.route_filter || '[href^="#!/"]';
  self.root = conf.root || $('body');
  self.debug = conf.debug;
  self.backend = new Backend(conf);

  self.load = function(path, fn) {
    
    if (!path) {
      return;
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
        console.warn('module: ', uri[0], ' is not found');
        return;
      }
      module = self.home;
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

    return module[action] ? module[action](arg) : module.trigger(action, arg);
  };

  self.auth = new Auth(self.backend);
  
  // initialization
  self.backend.call(init).always(function(data) {
    self.trigger("ready");
    self.auth.validate(data);
  
  }).done(function(data) {
    self.trigger('init', data);

  }).fail(function(error) {
    console.log("fail", error);
    // failed because
  });

}



function Auth(backend) {
  var self = riot.observable(this),
      item = null;

  self.current = function() {
    return item;
  };

  self.login = function(m, fn) {
    
    self.one('login', fn);

    return backend.call('auth', {}, m, function(r) {
      if (!r || !r.id) return;
      item = r;
      self.trigger('login',r);
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

    item = r || item;
    var e = item && item.id ? 'login' : 'logout';
    self.trigger(e, item);
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

  ['edit','details'].map(function(name) {
    self[name] = function(arg, fn) {
      self.one(name, fn);
      return backend.call(path, arg, function(r) {
        self.trigger(name, r, arg);
      });
    };
  });

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
      return api.home[action] ? api.home[action]() : api.home.trigger(action);
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


app(function(api) {
  api.root.on('click tap', api.route_filter, function(e) {
    var href = this.getAttribute('data-href') || this.getAttribute('href');
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



var util = {
  option: function(data, selected, template) {
    var list = JSON.parse(JSON.stringify(data));
    return list.map(function(v) {
      if (v.id == selected) {
        v.selected = "selected";
      }
      return riot.render(template || 
        '<option value="{id}" {selected}>{name}</option>', v);
    }).join('');
  }
};