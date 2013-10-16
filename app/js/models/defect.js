//= require libs/model
//= require libs/collection
//= require libs/ajax

(function(models, global) {
  'use strict';

  var
    /*
     * Logger for defects model
     */
    LOG = LOGGER('defects');

  var Defect = Model.extend({
    idParam: 'defectId'
  });

  var Defects = Collection.extend(Collection.Stateful, {
    model: Defect,
    url: '/defects',
    fetch: function() {
      LOG('::fetch::');
    }
  });

  models.Defects = Defects;

})(this.Models, this);
