// Fake backend to simulate a real thing
function Backend(app) {

  var self = this,
    debug = app.conf.debug && typeof console != 'undefined';
    uri = app.conf.uri || '/';
  
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

    var xhr = new XMLHttpRequest(),
        method = data ? 'POST' : 'GET',
        fd;

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
    xhr.addEventListener('onload', function (e) {
      if (window.NProgress) {
        NProgress.done();
      }

      var r = null;
      try {
        r = JSON.parse(this.response);
      } catch(ex) {
        console.warn(ex);
        promise.fail(r);
      }

      promise.always(r);
      promise[xhr.status == 200 ? 'done' : 'fail'](r);
      if (xhr.status != 200) app.trigger('error', { status: xhr.status, data: r });      
      if (debug) console.info("<-", r);
      //start nprogress
      
    });

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
    xhr.send(fd);
    // given callback
    promise.done(fn);

    return promise;
  };
}


