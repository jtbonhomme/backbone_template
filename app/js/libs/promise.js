(function(global) {
  'use strict';

  var LOG = LOGGER('promise');
  var LOG_ERROR = function(msg, e) {
    LOG('error', e);
    LOG(msg, e.stack);
  };

  /**
   * On async process, returning a Promise that will be resolved later
   * will help you to code dependent stuff.
   *
   * @module Lib
   * @class Promise
   * @constructor
   * @example
   *   var promise = new Promise();
   *   promise.done(function(data) { console.log(data); });
   *   setTimeout(function() { promise.resolve('done'); }, 1000);
   */
  function Promise() {
    this._resolve  = null;
    this._reject   = null;
    this._progress = null;
    this._cancel   = null;
    this._data     = null;
    this._resolved = false;
    this._rejected = false;
    this._canceled = false;
    this._context  = this;
  }

  /**
   * Run jobs in parallel. Will reject if any job fails.
   * If a job is not returning a promise, it is considered as done.
   *
   * @method when
   * @static
   * @return {Promise} new promise on running jobs.
   */
  Promise.when = function(/** as many cb as you wish */) {
    var all = new Promise(),
        args = Array.isArray(arguments[0]) ? arguments[0] : arguments,
        error = null,
        l = args.length,
        step = 0,
        resolver = all.resolve;

    function done() {
      if (++step === l) {
        resolver && resolver.call(all, error);
        free();
      }
    }

    function fail(data) {
      error = data;
      resolver = all.reject;
      done();
    }

    function free() {
      error = null;
      args = null;
      resolver = null;
    }

    all.beforeCancel(function() {
      var arg, rets = [];
      for (var i = 0; i < l; i++) {
        if ((arg = args[i]) && arg.isAPromise) {
          rets.push(arg.cancel());
        }
      }
      free();
      return Promise.when(rets);
    });

    for (var i = 0; i < l; i++) {
      var ret = args[i];
      if (typeof(ret) === 'function') {
        ret = ret.call(all._context);
        if (all.isCompleted()) { return all; }
        args[i] = ret;
      }

      if (ret && ret.isAPromise === true) {
        ret.then(done, fail);
      } else {
        ret === false ? fail() : done();
      }

      if (all.isCompleted()) { return all; }
    }

    return l ? all : all.resolve();
  };

  Promise.lazy = function(value) {
    var promise = new Promise();
    if (value && value.isAPromise === true) {
      value.progress(promise.notify, promise);
      value.always(promise.resolve, promise);
      promise.beforeCancel(value.cancel, value);
    } else {
      promise.resolve(value);
    }
    return promise;
  };

  /**
   * Run jobs one after the other. Reject as soon as one job
   * in queue as failed. If a job does not return a promise, it is
   * considered as a completed promise (rejected iff it has returned false
   * and resolved if not).
   *
   * @method chain
   * @static
   * @return {Promise}
   */
  Promise.chain = function(/** as many cb as you wish */) {
    var args = Array.isArray(arguments[0]) ? arguments[0] : arguments,
        l = args.length,
        // current callback step
        step = 0,
        // values resolved by the promises
        lastArg,
        // promise which represent the whole chaining process
        all = new Promise(),
        resolver = all.resolve,
        // promise currently being executed
        current,
        // execution context for callbacks
        context,
        // lazy chain
        lazy = false;

    // the iterator executes a callback
    // and wait for the returnes promise to complete
    function iterator(cb) {
      current = null;
      var ret = cb;
      if (typeof(cb) === 'function') {
        try {
          ret = cb.call(context, lastArg);
        } catch (e) {
          LOG_ERROR('chain error in step ' + step, e);
          fail();
          return;
        }
      }
      if (all.isCompleted()) { return; }
      // is the callback returns a promise
      // handle the asynchronous process
      if (ret && ret.isAPromise === true) {
        current = ret;
        ret.then(done, fail);
      }
      // else call the done method in the next tick
      // and fail iff the returned value is false
      else {
        ret === false ? fail() : done(ret);
      }
    }

    // free all bounded data when completed
    function free() {
      current = null;
      context = null;
      lastArg = null;
      args = null;
    }

    // done callback which saves the resolved arguments
    // and call the iterator with the next callback if
    // the process is not over.
    // when the process has completed, resolve the main
    // promise
    function done(arg) {
      if (all.isCompleted()) { return; }
      lastArg = arg;
      if (++step < l) {
        iterator(args[step]);
      } else {
        resolver.call(all, lastArg);
        free();
      }
    }

    // one fail in the process will make the whole process
    // fail
    function fail(arg) {
      if (lazy) {
        resolver = all.reject;
        done(arg);
      } else {
        all.reject(arg);
        free();
      }
    }

    // start the chaining process
    // this method is exposed
    all.start = function() {
      if (all.isCompleted()) { return; }
      context = all._context || null;
      iterator(args[0]);
      return all;
    };

    all.lazy = function(l) {
      lazy = (arguments.length) ? !!l : true;
      return all;
    };

    // cancel the chaining process
    // this method is exposed
    all.beforeCancel(function() {
      var ret = current && current.cancel();
      free();
      return ret;
    });

    return l ? all : all.resolve();
  };

  Promise.timer = function(time, data, refresh) {
    var promise = new Promise();
    var interval, timeout, step = 0;

    if (time instanceof Date) {
      time = time.getTime() - Date.now();
    }

    function notify() {
      var percent = Math.floor((++step * refresh) / time * 100);
      promise.notify(percent);
    }

    function free() {
      clearInterval(interval);
      clearTimeout(timeout);
      promise = null;
    }

    if (typeof time !== 'number' || time < 0) {
      return promise.reject();
    }

    if (typeof refresh === 'number' && refresh > 0 && refresh < time){
      interval = setInterval(notify, refresh);
    }

    timeout = setTimeout(function() {
      notify();
      promise.resolve(data);
    }, time);

    promise.ever(free);
    return promise;
  };

  Promise.resolved = function(data) {
    var p = new Promise();
    nextTick(function() {
      p.resolve(data);
    });
    return p;
  };

  Promise.rejected = function(data) {
    var p = new Promise();
    nextTick(function() {
      p.reject(data);
    });
    return p;
  };

  Promise.prototype = {

    isAPromise: true,

    /**
     * Register the context for the done/fail callbacks
     *
     * @method context
     * @param {Object} context The context for callbacks
     * @chainable
     */
    context: function(context) {
      this._context = context;
      return this;
    },

    then: function(callback, errback, context) {
      if (context) { this._context = context; }
      this.done(callback).fail(errback);
      return this;
    },

    defer: function(callback, errback, context) {
      if (!callback) { return this; }
      if (typeof errback !== 'function') {
        context = errback;
        errback = null;
      }
      if (!context) {
        context = this._context;
      }

      var p = new Promise().beforeCancel(this.cancel, this);

      this
        .progress(p.notify, p)
        .done(function(data) {
          var r;
          try {
            r = callback.call(context, data);
          } catch(e) {
            LOG_ERROR('defer', e);
            return p.reject();
          }
          if (r && r.isAPromise) {
            r.pipe(p);
          } else {
            (r === false) ? p.reject() : p.resolve(r);
          }
        })
        .fail(errback ? function(data) {
          var r;
          try {
            r = errback.call(context, data);
          } catch(e) {
            LOG_ERROR('defer', e);
            return p.reject();
          }
          if (r && r.isAPromise) {
            r.always(p.reject, p).progress(p.notify, p);
            p.beforeCancel(r.cancel, r);
          } else {
            p.reject(r);
          }
        } : p.reject, p);

      return p;
    },

    /**
     * Register a callback to be run when the promise will success.
     * Note that registering on an already resolved promise will run the callback immediatly.
     *
     * @method done
     * @param {Function} callback Process to run on success
     * @param {Object}   context  Execution context of the callback
     * @chainable
     */
    done: function(callback, context) {
      if (!callback || this._rejected || this._canceled) {
        return this;
      }
      if (context) { this._context = context; }
      if (this._resolved) {
        callback.call(this._context, this._data);
      } else {
        this._resolve = this._resolve || [];
        this._resolve.unshift([callback, this._context]);
      }
      return this;
    },

    /**
     * Register a callback to be run in case of promise failure.
     * note that registering on an already failed promise will run the callback immediatly.
     *
     * @method fail
     * @param {Function} errback Process to run on failure
     * @param {Object}   context  Execution context of the callback
     * @chainable
     */
    fail: function(errback, context) {
      if (!errback || this._resolved || this._canceled) {
        return this;
      }
      if (context) { this._context = context; }
      if (this._rejected) {
        errback.call(this._context, this._data);
      } else {
        this._reject = this._reject || [];
        this._reject.unshift([errback, this._context]);
      }
      return this;
    },

    /**
     * Register a callback to be run in any case of promise resolving or rejecting.
     * note that registering on an already finised promise will run the callback immediatly.
     *
     * @method always
     * @param {Function} callback Process to run on ending
     * @param {Object}   context  Execution context of the callback
     * @chainable
     */
    always: function(callback, context) {
      if (!callback || this._canceled) { return this; }
      if (context) { this._context = context; }
      if (this._resolved || this._rejected) {
        callback.call(this._context, this._data);
      } else {
        var cc = [callback, this._context];
        this._resolve = this._resolve || [];
        this._reject  = this._reject  || [];
        this._resolve.unshift(cc);
        this._reject.unshift(cc);
      }
      return this;
    },

    /**
     * Register a callback to be at each notifications of the promise.
     *
     * @param {Function} callback Notification handler
     * @param {Object}   context  Execution context of the callback
     * @chainable
     */
    progress: function(callback, context) {
      if (!callback || this.isCompleted()) { return this; }
      if (context) { this._context = context; }
      this._progress = this._progress || [];
      this._progress.unshift([callback, this._context]);
      return this;
    },

    /**
     * Register a callback to be run on the promise completion: resolved,
     * rejected or cancelled.
     *
     * @param  {Function} callback
     * @param  {Object}   [context]
     * @chainable
     */
    ever: function(callback, context) {
      this.always(callback, context);
      this.beforeCancel(callback, context);
      return this;
    },

    /**
     * Solve the promise as a success, will run each previously registered callback.
     *
     * @method resolve
     * @param {Object} process results
     * @chainable
     */
    resolve: function(data) {
      if (this.isCompleted()) { return this; }
      this._resolved = true;
      this._data = data;
      if (this._resolve) {
        var cb;
        while ((cb = this._resolve.pop())) {
          cb[0].call(cb[1], this._data);
        }
      }
      this.free();
      return this;
    },

    /**
     * Solve the promise as a success, will run each previously registered callback.
     *
     * @method reject
     * @param {Object} process error
     * @chainable
     */
    reject: function(data) {
      if (this.isCompleted()) { return this; }
      this._rejected = true;
      this._data = data;
      if (this._reject) {
        var cb;
        while ((cb = this._reject.pop())) {
          cb[0].call(cb[1], this._data);
        }
      }
      this.free();
      return this;
    },

    /**
     * Notify the progress handlers with some data.
     *
     * @method notify
     * @param {Object} data Object notified
     * @chainable
     */
    notify: function(data) {
      if (!this._progress || this.isCompleted()) { return this; }
      var i = this._progress.length, cb;
      while (--i >= 0) {
        cb = this._progress[i];
        cb[0].call(cb[1], data);
      }
      return this;
    },

    /**
     * Pipe a promise into a new promise.
     * @param  {Promise} promise       Promise to pipe into.
     * @param  {Any}     [resolveData] Force the piped promise to resolve this object.
     * @param  {Any}     [rejectData]  Force the piped promise to reject this object.
     * @chainable
     */
    pipe: function(promise, resolveData, rejectData) {
      this.then(function(data) {
        promise.resolve(resolveData || data);
      }, function(data) {
        promise.reject(rejectData || data);
      });
      this.progress(promise.notify, promise);
      promise.beforeCancel(this.cancel, this);
      return this;
    },

    timeout: function(delay) {
      var timer = Promise.timer(delay).done(this.reject, this);
      this.beforeCancel(timer.cancel, timer);
      this.always(timer.cancel, timer);
      return this;
    },

    delay: function(delay, refresh) {
      return this.defer(function(data) {
        return Promise.timer(delay, data, refresh);
      });
    },

    /**
     * Return true iff the promise is resolved.
     * @return {Boolean}
     */
    isResolved: function() {
      return this._resolved;
    },

    /**
     * Return true iff the promise is rejected.
     * @return {Boolean}
     */
    isRejected: function() {
      return this._rejected;
    },

    /**
     * Return true iff the promise is canceled.
     * @return {Boolean}
     */
    isCanceled: function() {
      return this._canceled;
    },

    /**
     * Return data resolved or rejected.
     * @return {Any}
     */
    getArgs: function() {
      return this._data;
    },

    /**
     * Return true if the promise has been resolved, rejected or canceled
     *
     * @method isCompleted
     * @return {Boolean}
     */
    isCompleted: function() {
      return (this._rejected || this._resolved || this._canceled);
    },

    /**
     * Method to cancel a promise.
     */
    cancel: function() {
      if (this.isCompleted()) {
        return new Promise().resolve();
      }
      var cancel = this._cancel;
      this._canceled = true;
      this._context = null;
      this._data = null;
      this.free();
      return Promise.when(cancel);
    },

    beforeCancel: function(callback, context) {
      if (!callback || this.isCompleted()) { return this; }
      this._cancel = this._cancel || [];
      this._cancel.push(context ? bind(callback, context) : callback);
      return this;
    },

    /**
     * Free the memory of all callbacks containers.
     *
     * @private
     */
    free: function() {
      this._resolve = null;
      this._reject = null;
      this._progress = null;
      this._cancel = null;
    }
  };

  /**
   * To mixin promise interface in your own class.
   * @see Ajax
   *
   * @method extend
   * @static
   */
  Promise.extend = function(methods) {
    function ExtendedPromise() {
      Promise.call(this);
      if (this.initialize) { this.initialize.apply(this, arguments); }
    }
    extend(ExtendedPromise.prototype, Promise.prototype, methods);
    return ExtendedPromise;
  };

  global.Promise = Promise;

})(this);
