
(function(global, models) {
  'use strict';

  var
    /*
     * Logger for my model
     */
     LOG = LOGGER('MyModel');

   var MyModel = Backbone.Model.extend({
    initialize: function(){
      LOG('::initialize::');
    }
  });

   models.MyModel = MyModel;

 })(this, this.Models);
