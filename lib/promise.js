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

