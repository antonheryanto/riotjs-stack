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
