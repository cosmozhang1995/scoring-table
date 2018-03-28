Vue.config.delimiters = ["[[", "]]"]

// Vue.directive('contextmenu', {
//   bind: function (el, binding) {
//     console.log('bind', el, binding);
//     $(el).on('contextmenu', function(event) {
//       console.log("contextmenu", event);
//       binding.value(event);
//     });
//   }
// });
Vue.directive('contextmenu', function (el, binding) {
  console.log('bind', el, binding);
  $(el).on('contextmenu', function(event) {
    console.log("contextmenu", event);
    binding.value(event);
  });
});

function resolvePage(pageurl) {
  pageurl = pageurl.split("/");
  if (pageurl[0] == "home") {
  }
  else if (pageurl[0] == "ps") {
    var ps_id = pageurl[1];
    pspage.ps_id = ps_id;
    pspage.fetch_problemset();
    pspage.show = true;
  }
}

var nav = (function () {
  var navitem_home = { page: "home", title: "首页", active: true, resolve: function () {}, exit: function () {} };
  return new Vue({
    el: "#nav",
    data: {
      navitems: [
        navitem_home
      ],
      problemsets: [],
      current_nav: navitem_home
    },
    created: function () {
      this.fetch_problemsets();
    },
    methods: {
      build_navitems: function () {
        this.$data.navitems = [].concat(
          [navitem_home],
          this.$data.problemsets.map(function (ps) {
            return {
              page: "/ps/" + ps.id,
              title: ps.name,
              active: false,
              ps_id: ps.id,
              resolve: function () {
                pspage.ps_id = this.ps_id;
                pspage.fetch_problemset();
                pspage.show = true;
              },
              exit: function () {
                pspage.show = false;
              }
            };
          })
        );
      },
      fetch_problemsets: function () {
        var that = this;
        $.get('/api/problemsets', function(data) {
          that.$data.problemsets = data;
          that.build_navitems();
        });
      },
      onNav: function (item) {
        if (!item.active) {
          this.$data.current_nav.active = false;
          this.$data.current_nav.exit();
          this.$data.current_nav = item;
          this.$data.current_nav.active = true;
          this.$data.current_nav.resolve();
        }
      },
      onMenu: function (item) {
        if (item.ps_id !== undefined) {
          item.edit = item.ps.name;
          item.editing = true;
        }
      }
    }
  });
})();

var pspage = new Vue({
  el: "#pspage",
  data: {
    show: false,
    ps_id: undefined,
    ps: {},
    ps_edit: {
      name: "",
      method: "",
      problems: ""
    },
    is_editing_name: false
  },
  computed: {
  },
  methods: {
    fetch_problemset: function () {
      var that = this;
      $.get('/api/problemset/' + this.$data.ps_id, function(data) {
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
});