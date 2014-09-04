function Resource (url, id, type) {
  if (!id) { 
    return; 
  }

  var xhr = new XMLHttpRequest();
  var p = document.getElementById(id);

  xhr.onload = function(e) {
    if (this.status !== 200) {
      p.innerHTML = 'resource not available';
      NProgress.done();
      return;
    }

    var blob = this.response;
    var el = document.createElement(type || 'img');
    el.width = 100;
    el.onload = function(ex) {
      window.URL.revokeObjectURL(el.src); // Clean up after yourself.
    };
    el.src = window.URL.createObjectURL(blob);

    if (p.childNodes.length > 0) {
      p.removeChild(p.firstChild);
    }
    p.appendChild(el);
    NProgress.done();
  };

  xhr.addEventListener("progress", function(e) {
    if (e.lengthComputable) {
      NProgress.set(e.loaded / e.total);
    }
  }, false);
  NProgress.start();
  xhr.responseType = 'blob';
  xhr.open('GET', url);
  xhr.send();
};



