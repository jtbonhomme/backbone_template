(function(global) {
  'use strict';

  /**
   * Function to render a {{MUSTACHE}} template.
   * @param {str} templateId The id of the script that contains the template code.
   * @param {obj} data The object that contains the attributes to fill the template with.
   */
  function renderTemplate(templateId, data) {
    return JST[templateId](data);
  }

  global.renderTemplate = renderTemplate;

})(this);
