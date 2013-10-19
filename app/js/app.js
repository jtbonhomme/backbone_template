// mincer directives processor are listed bellow
//= require namespaces
//= require libs/logger
//= require libs/template
//= require_tree models
//= require_tree views
//

/**
 * Entry point of the application
 * Creates a new app binded with 'main' div, intialize (app.init) it, and 
 * start it (app.boot)
 */

(function(global, models, views) {
  'use strict';

  var LOG = LOGGER('app');

  function App(el) {
    this.el = el;

    // Object containing all the singletons model
    // shared by all controls.
    this.data = {};
  }

  /**
   * Instantiate models in the `data` namespace.
   *
   * @method createModels
   * @chainable
   */
  App.prototype.createModels = function() {
    LOG('::createModels::');

    this.data.myModel  = new (models.MyModel)();

    return this;
  };

  App.prototype.bindModels = function() {
    LOG('::bindModels::');
    LOG('models binded');
  };

  /**
   * Bind global listeners of different models to handle
   * global and asynchronous events from the stream.
   *
   * @method bindListeners
   */
  App.prototype.bindListeners = function() {
    LOG('::bindListeners::');
    //this.data.system.on('low-battery', this.popup('shared/popup/battery', 'battery', 'long'), this);
  };

  /**
   * Initalize the application by registering all navigable
   * controls for the application.
   *
   * @interface
   * @chainable
   */
  App.prototype.createViews = function() {
    // Controls
    LOG('::createViews::');

    this.data.indexView  = new (views.IndexView)();
    LOG('indexView.el:' + this.data.indexView.el);
    return this;
  };

  /**
   * Fetch all data required by the application
   */
  App.prototype.fetch = function() {
    LOG('::fetch::');
/*      return Promise.when(
      // static models
      Promise.lazy(this.data.defects.fetch())
    )
      .fail(function() {
        console.error('Error while fetching application data');
      });*/
  };

  /**
   * Init process of the main application
   * First start the event source stream and start the
   * install application and fetch all models.
   * When these three process are done, free the installation
   * and start on the first screen of the main application.
   *
   * @async
   * @chainable
   */
  App.prototype.init = function() {
    LOG('::boot::');

    this.createModels();
    this.createViews();

    function success() {
      LOG('::success::');
    }

    function failure() {
      console.error('Error while booting the application');
    }

/*
    // 
    Promise.chain(
      this.fetch,
      // bind models
      this.bindModels
    )
      .context(this)
      .then(success, failure, this)
      .start();
*/
    return this;
  };

  global.App = App;

})(this, this.Models, this.Views);