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

