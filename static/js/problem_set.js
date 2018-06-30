var pspage = new Vue({
  el: "#pspage",
  data: {
    ps: {},
    ps_edit: {
      name: "",
      method: "",
      problems: ""
    },
    is_editing_name: false
  },
  methods: {
    fetch_problemset: function () {
      var that = this;
      $.get('/api/problemset/' + $(that.$el).data('id'), function(data) {
        that.$data.ps = data;
      });
    },
    edit_ps_name: function() {
      this.$data.ps_edit.name = this.$data.ps.name;
      this.$data.is_editing_name = true;
    },
    submit_ps_name: function() {
      this.$data.is_editing_name = false;
    }
  }
});

$(function() {
  pspage.fetch_problemset();
});