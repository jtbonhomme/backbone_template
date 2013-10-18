// mincer directives processor are listed bellow
//= require libs/template
//

/**
 * Entry point of the application
 * Creates a new app binded with 'main' div, intialize (app.init) it, and 
 * start it (app.boot)
 */

(function(global) {
  'use strict';

  var LOG = LOGGER('app');

  var app = {

     // Object containing all the singletons model
     // shared by all controls.
    data: {},

    /**
     * Instantiate models in the `data` namespace.
     *
     * @method createModels
     * @chainable
     */
    createModels: function() {
      LOG('::createModels::');
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
/*      return Promise.when(
        // static models
        Promise.lazy(this.data.defects.fetch())
      )
        .fail(function() {
          console.error('Error while fetching application data');
        });*/
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
  };

  // Instantiate the main application
  // Export main application as a global
  // Start the collecte tranport
  function createApp() {
    LOG('::createApp::');
    var el = document.getElementById('main');
    app.init(el);
  }

  function clean() {
    LOG('::clean::');
    document.removeEventListener('DOMContentLoaded', createApp);
    document.removeEventListener('DOMContentLoaded', clean);
  }

  // create application on DOM content loaded
  document.addEventListener('DOMContentLoaded', createApp, false);
  document.addEventListener('DOMContentLoaded', clean, false);

})(this);