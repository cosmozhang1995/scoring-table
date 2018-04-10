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

$(document).on("keydown", function(event) {
  if (event.ctrlKey == true && event.keyCode == 83) {
    event.preventDefault();
    $(document).trigger('save');
  }
});

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
    homepage.show();
  }, exit: function () {
    homepage.hide();
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
              dirty: false,
              resolve: function () {
                pspage.ps_id = item.ps_id;
                pspage.fetch_data()
                .then(function() {
                  pspage.show();
                });
              },
              exit: function () {
                pspage.hide();
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
          that.problemsets = data;
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
      is_shown: false,
      students: [],
      st_new: {
        name: "",
        no: ""
      },
      is_adding: false,
      all_checked: false
    },
    methods: {
      show: function () {
        this.is_shown = true;
      },
      hide: function () {
        this.is_shown = false;
      },
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

var Scroller = function (direction) {
  var total = 0;
  var visible = 0;
  var current = 0;
  var view_current = 0;
  var view_total = 0;
  var handlers = {};
  var that = this;
  var mouse_down = false;
  var mouse_down_pos = { x: 0, y: 0 };
  var mouse_down_current = 0;
  var mouse_over = false;
  var wrapper_el = null;
  var block_el = null;
  var update_view = function () {
    if (wrapper_el && block_el) {
      if (direction == Scroller.H) {
        view_total = wrapper_el.width();
        view_current = current / total * view_total;
        block_el.width(visible / total * view_total);
        block_el.css("left", view_current + "px");
      } else {
        view_total = wrapper_el.height();
        view_current = current / total * view_total;
        block_el.height(visible / total * view_total);
        block_el.css("top", view_current + "px");
      }
    }
  };
  var scrollCurrent = function (pos) {
    if (pos === undefined) {
      return current;
    } else {
      if (pos > total - visible) pos = total - visible;
      if (pos < 0) pos = 0;
      current = pos;
      update_view();
      that.trigger('scroll');
    }
  };
  $(document).on('mousedown', (event) => this.onMouseDown(event));
  $(document).on('mouseup', (event) => this.onMouseUp(event));
  $(document).on('mousemove', (event) => this.onMouseMove(event));
  $(document).on("mousewheel", function (event) {
    var deltaX = event.originalEvent.deltaX;
    var deltaY = event.originalEvent.deltaY;
    var delta = direction == Scroller.H ? deltaX : deltaY;
    if (delta == 0) return;
    scrollCurrent(current + delta / 5);
});
  this.onMouseDown = function (event) {
    if (!block_el || event.target != block_el[0]) return;
    mouse_down_pos.x = event.clientX;
    mouse_down_pos.y = event.clientY;
    mouse_down_current = current;
    mouse_down = true;
    if (block_el) $(block_el).addClass('active');
  };
  this.onMouseUp = function (event) {
    // if (event.target != block_el[0]) return;
    mouse_down = false;
    if (block_el) $(block_el).removeClass('active');
  };
  this.onMouseMove = function (event) {
    if (mouse_down) {
      var dx = event.clientX - mouse_down_pos.x;
      var dy = event.clientY - mouse_down_pos.y;
      var ww = wrapper_el.width();
      var wh = wrapper_el.height();
      if (direction == Scroller.H) scrollCurrent(mouse_down_current + dx / ww * total);
      else scrollCurrent(mouse_down_current + dy / wh * total);
    }
  };
  this.init = function (el, total, visible) {
    wrapper_el = $(el);
    block_el = wrapper_el.find('.scroller-block');
    block_el.css('user-select', "none");
    update_view();
  };
  this.resize = function (new_total, new_visible) {
    if (new_total !== total || new_visible !== visible) {
      visible = new_visible;
      total = new_total;
      update_view();
    }
  };
  this.scrollTop = function (pos) {
    if (direction != Scroller.V) throw "Calling scrollTop of scroller which is not vertical";
    return scrollCurrent(pos);
  };
  this.scrollLeft = function (pos) {
    if (direction != Scroller.H) throw "Calling scrollLeft of scroller which is not horizontal";
    return scrollCurrent(pos);
  };
  this.on = function (name, handler) {
    if (!handlers[name]) handlers[name] = [];
    handlers[name].push(handler);
  };
  this.off = function (name) {
    if (handlers[name]) handlers[name] = [];
  };
  this.trigger = function (name) {
    var that = this;
    var the_handlers = handlers[name];
    var event = {};
    if (direction == Scroller.V) event.scrollTop = this.scrollTop();
    if (direction == Scroller.H) event.scrollLeft = this.scrollLeft();
    if (the_handlers && the_handlers.length > 0) {
      setTimeout(function() {
        for (var hdl of the_handlers) {
          hdl.call(that, event);
        }
      }, 0);
    }
  };
};
Scroller.H = 1;
Scroller.V = 2;

Vue.directive("scroller", {
  bind: function (el, binding, vnode) {
    var scroller = binding.value;
    scroller.init(el, 0, 0);
  }
});

Vue.directive("scroller-total", (function () {
  var current_value;
  return {
    bind: function (el, binding, vnode) {
      $(el).data('scroller').total = binding.value;
    },
    update: function (el, binding, vnode) {
      $(el).data('scroller').total = binding.value;
    }
  };
})());

Vue.directive("scroller-visible", (function () {
  var current_value;
  return {
    bind: function (el, binding, vnode) {
      $(el).data('scroller').visible = binding.value;
    },
    update: function (el, binding, vnode) {
      $(el).data('scroller').visible = binding.value;
    }
  };
})());

var pspage = (function () {
  return new Vue({
    el: "#pspage",
    data: {
      is_shown: false,
      ps_id: undefined,
      ps: {},
      ps_edit: {
        method: "",
        problems: ""
      },
      scorings: [],
      tabledata: [],
      problems: [],
      ps_dirty: false,
      all_checked: false,
      hscroller: new Scroller(Scroller.H),
      vscroller: new Scroller(Scroller.V),
      support: support
    },
    computed: {
    },
    created: function () {
      var that = this;
      setInterval(function() {
        var totalh = $(that.$el).find('.main-table .common-table').height() || 0;
        var visibleh = $(that.$el).find('.main-table').height() || 0;
        var totalw = $(that.$el).find('.main-table .common-table').width() || 0;
        var visiblew = $(that.$el).find('.main-table').width() || 0;
        that.vscroller.resize(totalh, visibleh);
        that.hscroller.resize(totalw, visiblew);
      }, 100);
      that.vscroller.on('scroll', function (event) {
        var st = event.scrollTop;
        $(that.$el).find('.main-table .common-table').css("position", "relative").css("top", -st + "px");
        $(that.$el).find('.head-cols .common-table').css("position", "relative").css("top", -st + "px");
      });
      that.hscroller.on('scroll', function (event) {
        var sl = event.scrollLeft;
        $(that.$el).find('.main-table .common-table').css("position", "relative").css("left", -sl + "px");
      });
    },
    methods: {
      show: function () {
        this.is_shown = true;
      },
      hide: function () {
        this.is_shown = false;
      },
      fetch_problemset: function () {
        var that = this;
        return new Promise(function (resolve, reject) {
          r_get('/api/problemset/' + that.ps_id)
          .done(function(data) {
            that.ps = data;
            resolve();
          })
          .fail(function(err) {
            reject();
          })
        });
      },
      fetch_scoring: function() {
        var that = this;
        return new Promise(function (resolve, reject) {
          r_get('/api/scorings/' + that.ps_id)
          .done(function(data) {
            that.scorings = data;
            resolve();
          })
          .fail(function(err) {
            reject();
          })
        });
      },
      fetch_data: function() {
        var that = this;
        return Promise.all([that.fetch_problemset(), that.fetch_scoring()])
        .then(function() {
          that.problems = (function() {
            function indexOf(prbitem) {
              var idx = undefined;
              for (var i in that.problems) {
                if (that.problems[i] === prbitem) {
                  idx = i;
                  break;
                }
              }
              return idx;
            }
            function insertAt(idx) {
              var name = prompt("插入新问题");
              if (typeof name !== "string" || name.length == 0) return;
              var prbitem = createProblemItem(name);
              for (var row of tabledata) {
                if (row.is_first && (typeof row.gid === "number")) {
                  row.scoring = [].concat(row.scoring.slice(0, idx), [NaN], row.scoring.slice(idx));
                  row.dirty = true;
                }
              }
              that.problems = [].concat(that.problems.slice(0, idx), [prbitem], that.problems.slice(idx));
              that.ps_dirty = true;
              that.mark_dirty();
            }
            function createProblemItem (word) {
              var name = word.trim();
              var prbitem = {
                name: word.trim(),
                menu: [
                  {
                    title: "重命名",
                    action: function () {
                      var oldname = prbitem.name;
                      var newname = prompt("重命名", oldname);
                      if (oldname != newname) {
                        prbitem.name = newname;
                        that.ps_dirty = true;
                        that.mark_dirty();
                      }
                    }
                  },
                  {
                    title: "删除",
                    action: function () {
                      if (!confirm("确定要删除 " + prbitem.name + " 吗？")) return;
                      var idx = indexOf(prbitem);
                      if (idx === undefined) return;
                      for (var row of tabledata) {
                        if (row.is_first && (typeof row.gid === "number")) {
                          row.scoring = [].concat(row.scoring.slice(0, idx), row.scoring.slice(idx + 1));
                          row.dirty = true;
                        }
                      }
                      that.problems = [].concat(that.problems.slice(0, idx), that.problems.slice(idx + 1));
                      that.ps_dirty = true;
                      that.mark_dirty();
                    }
                  },
                  {
                    title: "在前面插入",
                    action: function () {
                      var idx = indexOf(prbitem);
                      if (idx === undefined) return;
                      insertAt(idx);
                    }
                  },
                  {
                    title: "在后面插入",
                    action: function () {
                      var idx = indexOf(prbitem);
                      if (idx === undefined) return;
                      insertAt(idx + 1);
                    }
                  }
                ]
              };
              return prbitem;
            }
            return that.ps.problems.split(",").map(createProblemItem);
          })();
          that.ps_dirty = false;
          that.tabledata = (function () {
            var data = [];
            for (var scoring of that.scorings) {
              var gid = scoring.gid;
              var sts = scoring.students;
              var scr = (scoring.scoring||"").split(",").map((word) => parseInt(word));
              while (scr.length < that.problems.length) scr.push(NaN);
              data.push({
                is_first: true,
                gsq: "-",
                gid: gid,
                student: sts[0],
                numsts: sts.length,
                scoring: scr.map((scrnum) => {
                  var numstr = that.number2str(scrnum);
                  return {
                    num: scrnum,
                    str: that.number2str(scrnum),
                    edit: that.number2str(scrnum)
                  };
                }),
                checked: false,
                editing: false,
                dirty: false
              });
              for (var st of sts.slice(1)) {
                data.push({
                  is_first: false,
                  gid: gid,
                  student: st,
                  checked: false
                });
              }
            }
            return data;
          })();
          that.all_checked = false;
          that.vscroller.scrollTop(0);
          that.hscroller.scrollLeft(0);
          that.mark_dirty(false);
        });
      },
      onAllChecked: function () {
        for (var rowdata of this.tabledata) {
          rowdata.checked = this.all_checked;
        }
      },
      number2str: function (num) {
        if (typeof num === "number" && !isNaN(num)) return "" + num;
        else return "";
      },
      regroup: function () {
        var that = this;
        var rows = this.tabledata.filter((row) => row.checked);
        if (rows.length > 1) {
          var sts = rows.map((row) => row.student);
          if (!confirm("确定要将 " + sts.map((st) => st.name).join("、") + " 分为一组吗？")) return;
          r_post("/api/regroup/" + that.ps_id, { "sids": sts.map((st) => st.id) })
          .done(function() {
            that.fetch_data();
          });
        }
      },
      degroup: function () {
        var that = this;
        var rows = this.tabledata.filter((row) => row.checked);
        if (rows.length > 0) {
          var gid = rows[0].gid;
          var sts = rows.map((row) => row.student);
          var stnamesstr = sts.map((st) => st.name).join("、");
          for (row of rows) {
            if (row.gid != gid) {
              alert(stnamesstr + " 并不在同一分组中，请检查");
              return;
            }
          }
          if (!confirm("确定要解除 " + stnamesstr + " 的分组吗？")) return;
          r_post("/api/degroup/" + gid)
          .done(function() {
            that.fetch_data();
          });
        }
      },
      mark_dirty: function (dirty) {
        if (dirty === undefined) dirty = true;
        for (item of nav.navitems) {
          if (item.ps_id === this.ps_id) {
            item.dirty = dirty;
          }
        }
      }
    }
  });
})();

$(function() {
  nav.navto("home");
});