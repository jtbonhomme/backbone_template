//= require libs/promise

(function(exports) {
  'use strict';

  var APPJSON = /^application\/json/;

  var methodMap = {
    'create': 'POST',
    'update': 'PUT',
    'delete': 'DELETE',
    'read':   'GET'
  };

  var AjaxPromise = Promise.extend({
    /**
     * Default content type of any request
     * @type {String}
     */
    contentType: 'application/json',

    /**
     * Default method of any request
     * @type {String}
     */
    defaultMethod: 'GET',

    initialize: function(url, method, data) {
      var cttype, accept, options, headers;

      if (typeof method === 'object') {
        options = method;
        method  = options.method;
        data    = options.data,
        cttype  = options.contentType,
        accept  = options.accept,
        headers = options.headers;
      }

      method = method || this.defaultMethod;
      cttype = cttype || this.contentType;

      if (data && cttype === 'application/json') {
        data = JSON.stringify(data);
      } else {
        data = data || null;
      }

      var
          that = this,
          xhr  = this.xhr = new XMLHttpRequest();

      this.rejecter = function xhrRejecter() {
        that.reject(xhr);
        xhr = null;
      };

      this.resolver = function xhrHandler() {
        var resp;
        // there is a response
        // that is in ok class
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            // with a content
            if (xhr.responseText) {
              if (APPJSON.test(xhr.getResponseHeader('Content-Type'))) {
                resp = JSON.parse(xhr.responseText);
              } else {
                resp = xhr.responseText;
              }
            }
          } catch(e) {
            console.error('Error while receiving XHR response content', e);
            that.reject(xhr);
            xhr = null;
            return;
          }
          that.resolve(resp);
        } else {
          that.reject(xhr);
        }
        xhr = null;
      };

      xhr.open(method, url, true);
      xhr.url = url;

      if (cttype) { xhr.setRequestHeader('Content-Type', cttype); }
      if (accept) { xhr.setRequestHeader('Accept', accept); }
      // Add additional header if necessary
      if (headers && typeof headers === 'object') {
        for (var key in headers) {
          if (typeof headers[key] !== 'undefined' && headers[key] !== null)
            { xhr.setRequestHeader(key, headers[key]); }
        }
      }

      xhr.addEventListener('load',  this.resolver, false);
      xhr.addEventListener('error', this.rejecter, false);

      xhr.send(data || null);
    },

    /**
     * Free promise memory and remove event listener
     */
    free: function() {
      this.xhr.removeEventListener('load',  this.resolver);
      this.xhr.removeEventListener('error', this.rejecter);
      this.xhr = null;
      this.resolver = null;
      this.rejecter = null;
      Promise.prototype.free.call(this);
    }
  });

  /**
   * Main ajax method.
   *
   * The second parameter can also be a hash of options
   * with the keys: `method`, `data` and `contentType`.
   *
   * @method ajax
   * @param  {String} url      XHR url
   * @param  {String} [method] HTTP method
   * @param  {Object} [data]   XHR payload
   * @return {AjaxPromise}
   */
  function ajax(url, method, data) {
    return new AjaxPromise(url, method, data);
  }

  /**
   * Synchronisation with the API.
   *
   * @method sync
   * @param {String} method CRUD method (see methodMap)
   * @param {Object} model Model to synchronize
   * @return {Promise}
   */
  function sync(method, model) {
    var url  = typeof(model.url) === 'function' ? model.url() : model.url,
        data = null;

    if (method === 'create' || method === 'update') {
      data = model.toJSON();
    }

    return new AjaxPromise(url, methodMap[method], data);
  }

  exports.ajax = ajax;
  exports.sync = sync;

})(this);
