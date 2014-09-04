
// The admin API
function App(conf) {
  
  var self = riot.observable(this),
      init = conf.init || 'auth';
  self.route_filter = conf.route_filter || '[href^="#!/"]';
  self.root = conf.root || $('body');
  self.debug = conf.debug;
  self.backend = new Backend(conf);

  /* user/{action} user/{id}/{action} ?q=*/
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

    module[action] ? module[action](arg) : module.trigger(action, arg);
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

