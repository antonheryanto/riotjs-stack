#!/usr/bin/env node
require('shelljs/make');

target.jquery = function() {
  cat('api/*.js','ui/*.js').to('riot-stack.jquery.js');
};

target.min = function() {
  cat('ext/dom.js','api/*.js', 'ui/*.js').to('riot-stack.js');
};

target.all = function() {
  target.jquery();
  target.min();
};
