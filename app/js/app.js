// mincer directives processor are listed bellow
//
//= require libs/template
//
// require_tree controls

/**
 * App is the global namespace for the application
 *
 * @module global
 * @class App
 */
(function(global, models, controls) {
  'use strict';

  var LOG = LOGGER('app');

  /**
   * @constructor
   */
  function App(el) {
    LOG('::App::');

    Application.call(this, el);

     // Object containing all the singletons model
     // shared by all controls.
    this.data = {};
  }

  extend(App.prototype, Application.prototype, {

    /**
     * Instantiate models in the `data` namespace.
     *
     * @method createModels
     * @chainable
     */
    createModels: function() {
      LOG('::createModels::');

      this.data.defects         = new (models.Defects)();

      LOG('models created');
      return this;
    },

    bindModels: function() {
      LOG('::bindModels::');
      LOG('models binded');
    },

    /**
     * Bind global listeners of different models to handle
     * global and asynchronous events from the stream.
     *
     * @method bindListeners
     */
    bindListeners: function() {
      LOG('::bindListeners::');
      //this.data.system.on('low-battery', this.popup('shared/popup/battery', 'battery', 'long'), this);
    },

    /**
     * Initalize the application by registering all navigable
     * controls for the application.
     *
     * @interface
     * @chainable
     */
    registerControls: function() {
      // Controls
      LOG('::registerControls::');
      //this
        // Main
        //.registerControl('clock', controls.Clock)
        // Global controls
        //.addGlobalControl('browse', controls.Browse)
      return this;
    },

    /**
     * Fetch all data required by the application
     */
    fetch: function() {
      LOG('::fetch::');
      return Promise.when(
        // static models
        Promise.lazy(this.data.defects.fetch())
      )
        .fail(function() {
          console.error('Error while fetching application data');
        });
    },

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
    init: function() {
      LOG('::boot::');
      this.createModels();

      function success() {
        LOG('::success::');
      }

      function failure() {
        console.error('Error while booting the application');
      }

      // 
      Promise.chain(
        this.fetch,
        // bind models
        this.bindModels
      )
        .context(this)
        .then(success, failure, this)
        .start();

      return this;
    }

  });

  global.App = App;

})(this, this.Models, this.Controls);