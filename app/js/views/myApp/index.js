
(function(global, views) {
	'use strict';

	var
    /*
     * Logger for my views
     */
     LOG = LOGGER('IndexView');

  var IndexView = Backbone.View.extend({

    id: 'index',

    initialize: function() {
      this.render();
    },

    render: function() {
      LOG('::render::');
      this.el.innerHTML = renderTemplate('myApp/home', 'IndexView');
      return this;
    }
  });

  views.IndexView = IndexView;

})(this, this.Views);