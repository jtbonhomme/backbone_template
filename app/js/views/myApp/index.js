
(function(global) {
	'use strict';

	var LOG = LOGGER('IndexView');

	var IndexView = Backbone.View.extend({

		render: function() {
			LOG('::render::');
			this.el.innerHTML = renderTemplate('myApp/home');
			return this;
		}
	});

	global.IndexView = IndexView;

})(this);