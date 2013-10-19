
(function(global) {
  'use strict';

  var _slice = Array.prototype.slice;

  function filter(args, namespace) {
    var f = global.LOGGER_FILTERS;
    if (f && f[namespace]) { return; }
    return _slice.call(args);
  }

  /**
   * Console logger.
   * Using the standard `console.log` api.
   */
  function CONSOLE_LOGGER() {
    return function(args, namespace) {
      console.log.apply(console, ['%c[' + namespace + ']', 'color:red'].concat(args));
    };
  }


  /**
   * Remote logger.
   * Sends XHR requests to a remote service.
   */
  function REMOTE_LOGGER(options) {
    var flush    = [],
        size     = options.batchSize || 50,
        interval = options.batchInterval || 5000,
        url      = options.url;

    function send() {
      var logs = flush.splice(0, size),
          data = JSON.stringify(logs),
          xhr  = new XMLHttpRequest();

      function done() {
        if (xhr.status >= 300) { return fail(); }
        if (flush.length) { setTimeout(send, interval); }
      }

      function fail() {
        flush.unshift.apply(flush, logs);
        setTimeout(send, interval);
      }

      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.addEventListener('load',  done, false);
      xhr.addEventListener('error', fail, false);
      xhr.send(data);
    }

    return function(args, namespace) {
      if (!url) { return; }
      var log = {
        namespace: namespace,
        date: new Date(),
        args: args
      };
      if (flush.push(log) === 1) {
        setTimeout(send, interval);
      }
    };
  }

  var list = {
    'console': CONSOLE_LOGGER,
    'remote':  REMOTE_LOGGER
  };

  var names = (global.LOGGER_NAME || '').split(',');
  var loggers = names.map(function(name) {
    var logger = list[name];
    return logger && logger(global.LOGGER_OPTIONS || {});
  });

  /**
   * Simple LOGGER.
   * Instantiates a new logger on the given namespace.
   *
   * @example
   *   var LOG = LOGGER('master');
   *   // ...
   *   LOG('foo');         // -> 'master' 'foo'
   *   LOG('bar', [], {}); // -> 'master' 'bar' [] {}
   * @param {String} namespace
   * @return {Function}
   */
  function LOGGER(namespace) {
    return function() {
      if (!global.DEBUG) { return; }
      if (!loggers.length) { return; }
      var args = filter(arguments, namespace);
      args && loggers.forEach(function(l) { l(args, namespace); });
    };
  }

  /**
   * Toggle logging filters.
   * @param {Strings..} namespaces
   */
  function LOG_FILTER(/* namespace,.. */) {
    var f = global.LOGGER_FILTERS;
    var i = arguments.length;
    while (f && --i >= 0) {
      f[arguments[i]] = !f[arguments[i]];
    }
  }

  /**
   * Global error handler and logger.
   */
  if (global.DEBUG) {
    window.onerror = LOGGER('oops');
  }

  global.LOG_FILTER = LOG_FILTER;
  global.LOGGER     = LOGGER;

})(this);
