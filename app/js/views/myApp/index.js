
(function(global, views) {
	'use strict';

	var
    /*
     * Logger for my views
     */
     LOG = LOGGER('IndexView');

  var IndexView = Backbone.View.extend({

    el: '#index',

    initialize: function() {
      this.render();
    },

    render: function() {
      LOG('::render::');
      LOG("<el:" + this.el.innerHTML);
      this.el.innerHTML = renderTemplate('myApp/home', 'IndexView');
      LOG(">el:" + this.el.innerHTML);
      return this;
    }
  });

  views.IndexView = IndexView;

})(this, this.Views);