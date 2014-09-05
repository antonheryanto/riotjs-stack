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
  self.route_filter = conf.route_filter || '[href^="#!/"]';
  self.login = conf.login || $('#login');
  self.login_form = conf.login_form || $('#form-login');
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
      if (!r || !r.id) {
        self.trigger('login:error', r);
        return;
      }
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

  var get = ['edit','details'];
  var getFn = function(name) {
    self[name] = function(arg, fn) {
      self.one(name, fn);
      return backend.call(path, arg, function(r) {
        self.trigger(name, r, arg);
      });
    };
  };
  for (var i = 1; i < get.length; i++) {
    getFn(get[i]);
  }

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
