/*globals Node:true, NodeList:true*/
$ = (function (document, window, $) {
  // Node covers all elements, but also the document objects
  var node = Node.prototype,
      nodeList = NodeList.prototype,
      forEach = 'forEach',
      map = 'map';
      each = [][forEach];

  nodeList[forEach] = each;
  nodeList[map] = [][map]; 

  // we have to explicitly add a window.on as it's not included
  // in the Node object.
  window.on = node.on = function (event, selector, fn) {
    var self = this;
    if (typeof selector === 'function') {
      event.split(' ').forEach(function(ev) {
        self.addEventListener(ev, selector, false);
      });
      return this;
    }

    var matches = this.mozMatchesSelector || this.webkitMatchesSelector || this.oMatchesSelector || this.matchesSelector || (function (selector) {
      // support IE10 (basically)
      var target = this,
        elements = $(selector),
        match = false;
      if (elements instanceof NodeList) {
        elements.forEach(function (el) {
          if (el === target) match = true;
        });
      } else if (elements === target) {
        match = true;
      }

      return match;
    });

    event.split(' ').forEach(function(ev) {
      self.addEventListener(ev, function (e) {
        if (matches.call(e.target, selector)) {
          fn.call(e.target, e);
        } else if (matches.call(e.target.parentNode, selector)) {
          fn.call(e.target.parentNode, e);
        } 
         
      }, false);
    });

    // allow for chaining
    return this;
  };

  nodeList.on = function (event, fn) {
    this[forEach](function (el) {
      el.on(event, fn);
    });
    return this;
  };

  $ = function (s) {
    // querySelectorAll requires a string with a length
    // otherwise it throws an exception
    var r = document.querySelectorAll(s || '☺'),
        length = r.length;
    // if we have a single element, just return that.
    // if there's no matched elements, return a nodeList to chain from
    // else return the NodeList collection from qSA
    return length == 1 ? r[0] : r;
  };

  // additional jquery compatible 
  node.addClass = function(name) {
    this.classList.add(name);
    return this;
  };

  node.removeClass = function(name) {
    this.classList.remove(name);
    return this;
  };

  node.html = function(html) {
    this.innerHTML = html;
    return this;
  };

  node.append = function(html) {
    this.innerHTML += html;
    return this;
  };

  node.remove = function() {
    this.parentNode.removeChild(this);
  };

  return $;
})(document, this);


// The admin API
function App(conf) {
  
  var self = riot.observable(this),
      init = conf.init || 'auth';
  self.conf = conf;
  self.home_module = conf.home_module || 'home';
  self.debug = conf.debug;
  self.backend = new Backend(self);
  self.auth = new Auth(self.backend);

  self.view = function(view, data) {
    template = templates[view] || view;
    return data ? riot.render(template, data) : template;
  };

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
      if (r && r.id) {
        item = r;
        return self.trigger('login', r);
      }
      return self.trigger('login:error', r);
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
function Backend(app) {

  var self = this,
    debug = app.conf.debug && typeof console != 'undefined';
    uri = app.conf.uri || '/';
  
  self.get = function(path, arg) {
    return self.call(path, arg);
  };

  self.post = function(path, data) {
    return self.call(path, null, data, null, 'POST');
  };

  self.put = self.post;

  self.delete = function(path, arg) {
    return self.call(path, arg, null, null, 'DELETE');
  };

  // underlying implementation for `call` can change
  self.call = function(api, arg, data, fn, method, fnProgress) {
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

    var xhr = new XMLHttpRequest(),
        fd;

    if (!method) {
      method = data ? 'POST' : 'GET';
    }

    xhr.open(method, url, true);
    xhr.responseType = 'json';
    
    if (data) {
      if (data instanceof HTMLElement) {
        fd = new FormData(data);
      } else {
        fd = JSON.stringify(data);
        xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
      }
    } 
    // debug message
    if (debug) console.info("->", method, url, data);

    //start nprogress
    if (window.NProgress) {
      NProgress.start();
    }
    //add secret token
    xhr.addEventListener('load', function (e) {
      if (window.NProgress) {
        NProgress.done();
      }

      var r = this.response;
      promise.always(r);
      promise[xhr.status == 200 ? 'done' : 'fail'](r);
      if (xhr.status != 200) app.trigger('error', { status: xhr.status, data: r });      
      if (debug) console.info("<-", r);
    });

    xhr.addEventListener('error', function(e) {
      console.warn("error occur", this);
      promise.fail({ message: "offline or connection refuse" });
    });

    fnProgress = fnProgress || function(e) {
      if (window.NProgress && e.lengthComputable) {
        NProgress.set(e.loaded / e.total);
      }
    };
    xhr.addEventListener('progress', fnProgress);
    xhr.upload.addEventListener('progress', fnProgress);
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
      if (!r.errors && !external) {
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

