var util = {
  option: function(data, selected, template) {
    var list = JSON.parse(JSON.stringify(data));
    return list.map(function(v) {
      if (v.id == selected) {
        v.selected = "selected";
      }
      return riot.render(template || 
        '<option value="{id}" {selected}>{name}</option>', v);
    }).join('');
  }
};
