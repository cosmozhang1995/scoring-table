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

function parse_csv(textdata) {
  var data = [];
  for (var line of textdata.split('\n')) {
    line = line.trim();
    if (line == "") continue;
    // var words = line.split(",").map(function(word) {
    //   word = word.trim();
    //   var match1 = word.match(/^\"(.*)\"$/);
    //   var match2 = word.match(/^\"(.*)\"$/);
    //   if (match1) word = match1[1];
    //   else if (match2) word = match2[1];
    //   return word.trim();
    // });
    var words = [];
    var word = "";
    var leftquot = null;
    var rightquot = null;
    for (c of line) {
      if (leftquot) {
        if (c == rightquot) {
          leftquot = null;
          rightquot = null;
        } else {
          word += c;
        }
      } else {
        if (c == ",") {
          words.push(word);
          word = "";
        } else if (c == '"' || c == "'") {
          leftquot = c;
          rightquot = c;
        } else {
          word += c;
        }
      }
    }
    words.push(word);
    data.push(words);
  }
  return data;
}

var support = (function() {
  return new Vue({
    el: '#support',
    data: {
      ctxmenuitems: undefined,
      show_ctxmenu: false,
      loadfile_el: undefined,
      loadfile_callback: undefined
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
      },
      loadFile: function (cb) {
        var that = this;
        that.loadfile_el = $('<input type="file" style="display:none;" />').appendTo(this.$el);
        that.loadfile_callback = cb;
        that.loadfile_el.on('change', function() {
          that.onFileChange();
          that.loadfile_el.remove();
        });
        that.loadfile_el.click();
      },
      onFileChange: function () {
        var that = this;
        var file = that.loadfile_el[0].files[0];
        var reader = new FileReader();
        reader.onload = function () {
          var data = this.result;
          if (that.loadfile_callback) that.loadfile_callback(data);
        }
        reader.readAsText(file);
      }
    }
  });
})();

var nav = (function () {
  var navitem_home = { page: "home", title: "首页", active: false, resolve: function () {
    homepage.fetchStudents();
    homepage.show = true;
  }, exit: function () {
    homepage.show = false;
  } };
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
      current_nav: null
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
              ps: ps,
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
                    var val = prompt();
                    r_put('/api/problemset/' + item.ps_id, {
                      name: val
                    })
                    .done(function() {
                      item.title = val;
                      item.ps.name = val;
                    });
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
          if (this.current_nav) {
            this.current_nav.active = false;
            this.current_nav.exit.call(this);
          }
          item.resolve.call(this);
          this.current_nav = item;
          this.current_nav.active = true;
        }
      }
    }
  });
})();

var homepage = (function () {
  function create_student_table_item(data_item) {
    return {
      id: data_item.id,
      no: data_item.no,
      name: data_item.name,
      edit: {},
      editing: false,
      checked: false
    };
  }
  return new Vue({
    el: "#homepage",
    data: {
      show: false,
      students: [],
      st_new: {
        name: "",
        no: ""
      },
      is_adding: false,
      all_checked: false
    },
    methods: {
      fetchStudents: function (st) {
        var that = this;
        that.students = [];
        that.all_checked = false;
        r_get("/api/students")
        .done(function(data) {
          that.students = data.map(create_student_table_item);
        });
      },
      editStudent: function (st) {
        st.edit.no = st.no;
        st.edit.name = st.name;
        st.editing = true;
      },
      editStudentCancel: function (st) {
        st.editing = false;
      },
      editStudentComplete: function (st) {
        r_put("/api/student/" + st.id, {
          no: st.edit.no,
          name: st.edit.name
        })
        .done(function() {
          st.no = st.edit.no;
          st.name = st.edit.name;
          st.editing = false;
        })
        .fail(function() {
          alert("提交失败");
        });
      },
      deleteStudent: function (st) {
        var that = this;
        if (!confirm("确定要删除学生 " + st.name + " 吗？")) return;
        r_delete("/api/student/" + st.id)
        .done(function() {
          that.students = that.students.filter((item) => item.id != st.id);
        })
        .fail(function() {
          alert("删除失败");
        });
      },
      addStudent: function () {
        this.st_new.no = "";
        this.st_new.name = "";
        this.is_adding = true;
      },
      addStudentCancel: function () {
        this.is_adding = false;
      },
      addStudentComplete: function () {
        var that = this;
        r_post("/api/student", {
          no: that.st_new.no,
          name: that.st_new.name
        })
        .done(function(data) {
          data.edit = {};
          data.editing = false;
          that.students = [].concat(that.students, [data]);
          that.is_adding = false;
        })
        .fail(function() {
          alert("提交失败");
        });
      },
      addStudentBatch: function () {
        var that = this;
        support.loadFile(function(data) {
          data = parse_csv(data);
          var total = data.length;
          var failed = 0;
          var uploaded = [];
          for (item of data) {
            r_post("/api/student", {
              no: item[0],
              name: item[1]
            })
            .done(function(resdata) {
              uploaded.push(resdata);
              if (uploaded.length + failed == total) {
                that.students = [].concat(that.students, uploaded.map(create_student_table_item));
              }
            })
            .fail(function() {
              failed += 1;
            });
          }
        });
      },
      onAllChecked: function () {
        for (st of this.students) {
          st.checked = this.all_checked;
        }
      },
      deleteStudentBatch: function () {
        var that = this;
        if (!confirm("确定要删除这些学生吗？")) return;
        var students = that.students.filter((item) => item.checked);
        var left = that.students.filter((item) => !item.checked);
        var total = students.length;
        var failed = 0;
        var deleted = 0;
        for (var st of students) {
          r_delete("/api/student/" + st.id)
          .done(function() {
            deleted += 1;
            if (deleted + failed == total) {
              that.students = left;
              that.all_checked = false;
              that.onAllChecked();
            }
          })
          .fail(function() {
            failed += 1;
          });
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
  nav.navto("home");
});