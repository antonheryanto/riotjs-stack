// webservice backend
function Backend(conf) {

  var self = this,
    debug = conf.debug && typeof console != 'undefined',
    url = conf.url | '/';
  
  // underlying implementation for `call` can change
  self.call = function(api, arg, data, fn, fnProgress) {
    
    var promise = new Promise(fn);
    url += api;

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
    NProgress.start();
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
      NProgress.done();
    };

    xhr.onerror = function(e) {
      console.warn("error occur", this);
      promise.fail({ message: "offline or connection refuse" });
    };

    fnProgress = fnProgress || function(e) {
      if (e.lengthComputable) {
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

