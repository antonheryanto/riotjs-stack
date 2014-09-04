
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

