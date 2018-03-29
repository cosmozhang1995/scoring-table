Vue.config.delimiters = ["[[", "]]"]

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

function r_get(url) {
  return $.ajax({
    url: url,
    type: 'GET',
    dataType: 'json'
  });
}
function r_post(url, data) {
  return $.ajax({
    url: url,
    type: 'POST',
    dataType: 'json',
    contentType : "application/json",
    data: (typeof data !== "string") ? JSON.stringify(data) : data
  });
}
function r_put(url, data) {
  return $.ajax({
    url: url,
    type: 'PUT',
    contentType : "application/json",
    data: (typeof data !== "string") ? JSON.stringify(data) : data
  });
}
function r_delete(url) {
  return $.ajax({
    url: url,
    type: 'DELETE'
  });
}

var support = (function() {
  return new Vue({
    el: '#support',
    data: {
      ctxmenuitems: undefined,
      show_ctxmenu: false
    },
    created: function () {
      var that = this;
      $(document).on('click', function () {
        that.ctxmenuitems = [];
        that.show_ctxmenu = false;
      });
    },
    methods: {
      ctxmenu: function(menu, event) {
        if (menu) {
          event.preventDefault();
          event.stopPropagation();
          var el = $(this.$el);
          var elpos = el.offset();
          el.find('.ctxmenu')
            .css("left", event.clientX + "px")
            .css("top", event.clientY + "px");
          this.ctxmenuitems = menu;
          this.show_ctxmenu = true;
        } else {
          this.ctxmenuitems = [];
          this.show_ctxmenu = false;
        }
      },
      onCtxMenuClick: function (mitem) {
        if (mitem.action) mitem.action();
        this.ctxmenuitems = [];
        this.show_ctxmenu = false;
      }
    }
  });
})();

var nav = (function () {
  var navitem_home = { page: "home", title: "首页", active: true, resolve: function () {}, exit: function () {} };
  var navitem_add_ps = { page: "addps", title: "添加+", active: false, resolve: function () {
    var name = prompt();
    var that = this;
    r_post('/api/problemset', { name: name })
    .done(function(ps) {
      that.problemsets.push(ps);
      that.build_navitems();
      that.navto("ps/" + ps.id);
    })
    .fail(function() {
      this.navto("home");
    });
  }, exit: function () {} };
  return new Vue({
    el: "#nav",
    data: {
      support: support,
      navitems: [],
      problemsets: [],
      current_nav: navitem_home
    },
    created: function () {
      this.fetch_problemsets();
      this.build_navitems();
    },
    methods: {
      build_navitems: function () {
        var that = this;
        that.navitems = [].concat(
          [navitem_home],
          that.problemsets.map(function (ps) {
            var item = {
              page: "ps/" + ps.id,
              title: ps.name,
              active: false,
              ps_id: ps.id,
              edit: undefined,
              editing: false,
              resolve: function () {
                pspage.ps_id = item.ps_id;
                pspage.fetch_problemset();
                pspage.show = true;
              },
              exit: function () {
                pspage.show = false;
              },
              menu: [
                {
                  title: "重命名",
                  action: function() {
                    item.edit = item.title;
                    item.editing = true;
                  }
                },
                {
                  title: "删除",
                  action: function() {
                    if (confirm("确定要删除" + item.title + "吗？")) {
                      r_delete('/api/problemset/' + item.ps_id)
                      .done(function () {
                        that.problemsets = that.problemsets.filter((i) => i.id != item.ps_id);
                        that.build_navitems();
                        that.navto("home");
                      });
                    }
                  }
                }
              ]
            };
            return item;
          }),
          [navitem_add_ps]
        );
      },
      fetch_problemsets: function () {
        var that = this;
        r_get('/api/problemsets')
        .done(function(data) {
          that.$data.problemsets = data;
          that.build_navitems();
        });
      },
      navto: function (item) {
        if (typeof item === "string") {
          var url = item;
          item = this.navitems.filter((i) => i.page == url)[0];
          if (item === undefined) return;
        }
        if (!item.active) {
          this.current_nav.active = false;
          this.current_nav.exit.call(this);
          item.resolve.call(this);
          this.current_nav = item;
          this.current_nav.active = true;
        }
      },
      onEditKeypress: function (item, event) {
        if (item.ps_id !== undefined) {
          if (event.keyCode == 13) {
            var val = item.edit;
            r_put('/api/problemset/' + item.ps_id, {
              name: item.edit
            })
            .done(function() {
              item.title = val;
              item.editing = false;
            });
            
          }
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