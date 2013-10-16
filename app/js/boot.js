// mincer directives processor are listed bellow
//= require app
//


/**
 * Entry point of the application
 * Creates a new app binded with 'main' div, intialize (app.init) it, and 
 * start it (app.boot)
 */

(function(global) {
  'use strict';

  var LOG = LOGGER('boot');

  var app;

  // Instantiate the main application
  // Export main application as a global
  // Start the collecte tranport
  function createApp() {
    LOG('::createApp::');
    var el = document.getElementById('main');
    app = global.app = new (global.App)(el);
    app.init();
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
