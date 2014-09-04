
var template_escape = {"\\": "\\\\", "\n": "\\n", "\r": "\\r", "'": "\\'"},
    render_escape = {'&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;'};

function default_escape_fn(str, key) {
  return str === undefined ? '' : (str+'').replace(/[&\"<>]/g, function(char) {
    return render_escape[char];
  });
}

riot.render = function(tmpl, data, escape_fn) {
  if (escape_fn === true) escape_fn = default_escape_fn;
  
  if (typeof tmpl === 'function') return tmpl(data, escape_fn); 
  
  return tmpl.replace(/{\s*([\w\.]+)\s*}/g, function(k, v) { 
    var p = v.split(".");
    var t = data[p[0]];
    if (t === undefined || t === null) return '';
    for (var i = 1; i < p.length; i++) t = t[p[i]];
    return (escape_fn ? escape_fn(t, v) : t || (t === undefined || t === null ? '': t));
  });
};

riot.compile = function(tmpl) {
  return new Function("_", "e", "try { return '" +
    tmpl.replace(/[\\\n\r']/g, function(char) {
      return template_escape[char];

    }).replace(/{\s*([\w\.]+)\s*}/g, 
      "' + (e?e(_.$1,'$1'):_.$1||(_.$1==undefined?'':_.$1)) + '") + "'");
};

riot.compiles = function(templates) {
  var fn = {};

  for (var key in templates) {
    if(!templates.hasOwnProperty(key)) continue;
    var tmpl = templates[key];
    fn[key] = fn[key] || riot.compile(tmpl);
  }

  return fn;

};
