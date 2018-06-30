Vue.config.delimiters = ["[[", "]]"];

var backend = "";

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

function ajax2promise(ajaxRequest) {
  return new Promise(function (resolve, reject) {
    ajaxRequest
    .done(resolve)
    .fail(reject);
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
  if (event.keyCode == 37) {
    event.preventDefault();
    $(document).trigger('arrow-left');
  }
  if (event.keyCode == 38) {
    event.preventDefault();
    $(document).trigger('arrow-up');
  }
  if (event.keyCode == 39) {
    event.preventDefault();
    $(document).trigger('arrow-right');
  }
  if (event.keyCode == 40) {
    event.preventDefault();
    $(document).trigger('arrow-down');
  }
});

$(document).on("click", ".common-table td, .common-table th", function(event) {
  if (event.target === this) {
    var checkboxEl = $(this).find("input[type='checkbox']");
    if (checkboxEl) {
      checkboxEl.click();
    }
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
    r_post(backend + '/api/problemset', { name: name })
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
              pagedata: undefined,
              resolve: function () {
                if (!item.pagedata) {
                  item.pagedata = new ProblemSetPageData(item.ps_id);
                  item.pagedata.fetch_data()
                  .then(function() {
                    pspage.pagedata = item.pagedata;
                    pspage.show();
                  });
                } else {
                  pspage.pagedata = item.pagedata;
                  pspage.show();
                }
              },
              exit: function () {
                pspage.hide();
              },
              menu: [
                {
                  title: "重命名",
                  action: function() {
                    var val = prompt();
                    r_put(backend + '/api/problemset/' + item.ps_id, {
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
                      r_delete(backend + '/api/problemset/' + item.ps_id)
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
        r_get(backend + '/api/problemsets')
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
        r_get(backend + "/api/students")
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
        r_put(backend + "/api/student/" + st.id, {
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
        r_delete(backend + "/api/student/" + st.id)
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
        r_post(backend + "/api/student", {
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
            r_post(backend + "/api/student", {
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
          r_delete(backend + "/api/student/" + st.id)
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

function ProblemSetPageData (ps_id) {
  this.ps_id = ps_id;
  this.ps = {};
  this.ps_edit = {
    method: "",
    problems: ""
  };
  this.scorings = [];
  this.tabledata = [];
  this.problems = [];
  this.ps_dirty = false;
  this.all_checked = false;
  this.dirty = false;
  this._method = "";
  var that = this;
  Object.defineProperty(this, "method", {
    get: function() {
      return this._method;
    },
    set: function(val) {
      this._method = val || "";
      if (that.tabledata) {
        that.tabledata.filter((row) => row.is_first).forEach(function(row) {
          row.updateFinalScore();
        });
      }
    }
  });
  this.method_menu = [
    {
      title: "修改",
      action: function () {
        that.modifyMethod();
      }
    }
  ]
  function number2str(num) {
    if (typeof num === "number" && !isNaN(num)) return "" + num;
    else return "";
  }
  this.fetch_problemset = function () {
    var that = this;
    return new Promise(function (resolve, reject) {
      r_get(backend + '/api/problemset/' + that.ps_id)
      .done(function(data) {
        that.ps = data;
        resolve();
      })
      .fail(function(err) {
        reject();
      })
    });
  },
  this.fetch_scoring = function() {
    var that = this;
    return new Promise(function (resolve, reject) {
      r_get(backend + '/api/scorings/' + that.ps_id)
      .done(function(data) {
        that.scorings = data;
        resolve();
      })
      .fail(function(err) {
        reject();
      })
    });
  };
  this.fetch_data = function() {
    var that = this;
    return Promise.all([that.fetch_problemset(), that.fetch_scoring()])
    .then(function() {
      that.method = that.ps.method || "";
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
          for (var row of that.tabledata) {
            if (row.is_first) {
              row.scoring = [].concat(row.scoring.slice(0, idx), [create_scoring_item(NaN, row)], row.scoring.slice(idx));
              if (typeof row.gid === "number") row.dirty = true;
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
                  for (var row of that.tabledata) {
                    if (row.is_first) {
                      row.scoring = [].concat(row.scoring.slice(0, idx), row.scoring.slice(idx + 1));
                      if (typeof row.gid === "number") row.dirty = true;
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
      function create_scoring_item(scrnum, parent) {
        return {
          _num: scrnum,
          get num() { return this._num; },
          set num(val) {
            if (val !== this._num) {
              this._num = val;
              if (this.parent) {
                this.parent.dirty = true;
                this.parent.updateFinalScore();
              }
            }
          },
          get str() { return number2str(this.num); },
          editing: false,
          m_active: false,
          get active() { return this.m_active; },
          set active(val) {
            this.m_active = val;
            this.editing = false;
          },
          parent: parent
        };
      }
      that.tabledata = (function () {
        var data = [];
        for (var scoring of that.scorings) {
          var gid = scoring.gid;
          var sts = scoring.students;
          var scr = (scoring.scoring||"").split(",").map((word) => parseInt(word));
          while (scr.length < that.problems.length) scr.push(NaN);
          var firstitem = {
            is_first: true,
            gsq: "-",
            gid: gid,
            student: sts[0],
            numsts: sts.length,
            scoring: null,
            checked: false,
            editing: false,
            finalScore: NaN,
            get finalScoreStr() {
              if (isNaN(this.finalScore)) {
                return "";
              } else {
                var decdgts = 1;
                var str = "" + Math.round(this.finalScore * Math.pow(10, decdgts));
                str = str.slice(0, str.length - decdgts) + "." + str.slice(str.length - decdgts);
                while (str[str.length - 1] == "0") str = str.slice(0, str.length - 1);
                if (str[str.length - 1] == ".") str = str.slice(0, str.length - 1);
                if (str[0] == ".") str = "0" + str;
                if (str.length == 0) return "0";
                return str;
              }
            },
            updateFinalScore: function() {
              var nums = this.scoring.map((item) => item.num);
              var allNaN = true;
              for (var n of nums) {
                if (!isNaN(n)) {
                  allNaN = false;
                  break;
                }
              }
              if (allNaN) {
                this.finalScore = NaN;
                return;
              }
              nums = nums.map((n) => (isNaN(n) ? 0 : n));
              var method = that.method;
              for (var i in that.problems) {
                var prbname = that.problems[i].name;
                method = method.replace(new RegExp(prbname, "g"), "" + nums[i]);
              }
              // try {
                this.finalScore = parseFloat(eval(method));
              // } catch (e) {
              //   this.finalScore = NaN;
              // }
            },
            dirty: false
          };
          firstitem.scoring = scr.map((scrnum) => create_scoring_item(scrnum, firstitem));
          firstitem.updateFinalScore();
          data.push(firstitem);
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
      var pspage = window.pspage;
      if (pspage && pspage.pagedata === that) {
        pspage.vscroller.scrollTop(0);
        pspage.hscroller.scrollLeft(0);
      }
      that.mark_dirty(false);
    });
  };
  this.onAllChecked = function () {
    for (var rowdata of this.tabledata) {
      rowdata.checked = this.all_checked;
    }
  };
  this.regroup = function () {
    if (this.dirty) {
      alert("有尚未保存的进度，请保存后重试。");
      return;
    }
    var that = this;
    var rows = this.tabledata.filter((row) => row.checked);
    if (rows.length > 1) {
      var sts = rows.map((row) => row.student);
      if (!confirm("确定要将 " + sts.map((st) => st.name).join("、") + " 分为一组吗？")) return;
      r_post(backend + "/api/regroup/" + that.ps_id, { "sids": sts.map((st) => st.id) })
      .done(function() {
        that.fetch_data();
      });
    }
  };
  this.degroup = function () {
    if (this.dirty) {
      alert("有尚未保存的进度，请保存后重试。");
      return;
    }
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
      r_post(backend + "/api/degroup/" + gid)
      .done(function() {
        that.fetch_data();
      });
    }
  };
  this.reload = function () {
    if (this.dirty) {
      if (!confirm("有尚未保存的进度，确定要重新加载么？")) return;
    }
    this.fetch_data();
  };
  this.modifyMethod = function () {
    var oldmethod = this.method;
    var newmethod = prompt("修改总分", oldmethod);
    if (newmethod != oldmethod && newmethod) {
      this.method = newmethod;
      this.ps_dirty = true;
      this.mark_dirty();
    }
  }
  this.mark_dirty = function (dirty) {
    if (dirty === undefined) dirty = true;
    for (item of nav.navitems) {
      if (item.ps_id === this.ps_id) {
        item.dirty = dirty;
      }
    }
    this.dirty = dirty;
  };
  this.save = function () {
    var requests = [];
    var that = this;
    if (that.ps_dirty) {
      var request = ajax2promise(r_put(backend + "/api/problemset/" + that.ps_id, {
        problems: that.problems.map((prbitem) => prbitem.name).join(","),
        method: that.method
      }))
      .then(function () {
        that.ps_dirty = false;
      });
      requests.push(request);
    }
    that.tabledata.filter((item) => item.is_first).forEach(function (row) {
      for (var scritem of row.scoring) {
        scritem.active = false;
      }
      if (row.dirty) {
        var scoring = row.scoring.map((scr) => scr.str).join(",");
        if (typeof row.gid === "number") var url = backend + "/api/score/group/" + row.gid;
        else var url = backend + "/api/score/problemset/" + that.ps_id + "/student/" + row.student.id;
        var request = ajax2promise(r_put(url, { scoring: scoring }))
        .then(function (data) {
          row.gid = data.gid;
          row.dirty = false;
        });
        requests.push(request);
      }
    });
    return Promise.all(requests)
    .then(function () {
      that.mark_dirty(false);
    }, function () {
      alert("保存失败");
    });
  };
  this.export = function () {
    var that = this;
    var tabledata = this.tabledata;
    var problems = this.problems;
    var outtable = [["No", "Name"].concat(problems.map(function (item) { return item.name; }), ["Final"])];
    var current_scores = [];
    for (var rowdata of tabledata) {
      if (rowdata.is_first) {
        current_scores = rowdata.scoring.map(function (scr) { return scr.str; });
        current_scores.push(rowdata.finalScoreStr);
      }
      var student = rowdata.student;
      var outrow = ["" + student.no, "" + student.name].concat(current_scores);
      outtable.push(outrow);
    }
    var outtext = outtable.map(function (outrow) {
      return outrow.join(",");
    }).join("\n");
    console.log(outtext);
  };
}

var pspage = (function () {
  var Direction = {
    Up: 1,
    Down: 2,
    Left: 3,
    Right: 4
  };
  return new Vue({
    el: "#pspage",
    data: {
      is_shown: false,
      pagedata: undefined,
      hscroller: new Scroller(Scroller.H),
      vscroller: new Scroller(Scroller.V),
      support: support,
      active_cell: undefined
    },
    computed: {
      top_active: function () {
        if (this.active_cell && this.pagedata && this.pagedata.tabledata[0] === this.active_cell.parent) {
          return true;
        } else {
          return false;
        }
      },
      left_active: function () {
        if (this.active_cell && this.active_cell.parent.scoring[0] === this.active_cell) {
          return true;
        } else {
          return false;
        }
      }
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
        $(that.$el).find('.head-row-main-cols .common-table').css("position", "relative").css("left", -sl + "px");
      });
      $(document).on('arrow-up', () => that.onArrow(Direction.Up));
      $(document).on('arrow-down', () => that.onArrow(Direction.Down));
      $(document).on('arrow-left', () => that.onArrow(Direction.Left));
      $(document).on('arrow-right', () => that.onArrow(Direction.Right));
      $(document).on('click', (e) => that.onGlobalClick(e));
      $(document).on('keydown', function (event) {
        var key = event.key;
        var keyCode = event.keyCode;
        that.onKeyDown(key, keyCode);
      });
      $(document).on('save', () => that.save());
    },
    methods: {
      show: function () {
        this.is_shown = true;
      },
      hide: function () {
        this.is_shown = false;
        if (this.active_cell) {
          this.active_cell.active = false;
          this.active_cell = undefined;
        }
      },
      onActiveCellChanged: function () {
        var that = this;
        setTimeout(function() {
          var activeCellEl = $(that.$el).find('.main-table .common-table td.active');
          if (activeCellEl.length == 0) return;
          var wrapperEl = activeCellEl.closest('.main-table');
          var cellOffset = activeCellEl.offset();
          var cellWidth = activeCellEl.outerWidth();
          var cellHeight = activeCellEl.outerHeight();
          var cellTop = cellOffset.top;
          var cellLeft = cellOffset.left;
          var cellRight = cellLeft + cellWidth;
          var cellBottom = cellTop + cellHeight;
          var wrapperOffset = wrapperEl.offset();
          var wrapperWidth = wrapperEl.width();
          var wrapperHeight = wrapperEl.height();
          var wrapperTop = wrapperOffset.top;
          var wrapperLeft = wrapperOffset.left;
          var wrapperRight = wrapperLeft + wrapperWidth;
          var wrapperBottom = wrapperTop + wrapperHeight;
          var deltaScrollX = 0;
          var deltaScrollY = 0;
          if (cellLeft < wrapperLeft) deltaScrollX = cellLeft - wrapperLeft;
          else if (cellRight > wrapperRight) deltaScrollX = cellRight - wrapperRight;
          if (cellTop < wrapperTop) deltaScrollY = cellTop - wrapperTop;
          else if (cellBottom > wrapperBottom) deltaScrollY = cellBottom - wrapperBottom;
          if (deltaScrollX != 0) that.hscroller.scrollLeft(that.hscroller.scrollLeft() + deltaScrollX);
          if (deltaScrollY != 0) that.vscroller.scrollTop(that.vscroller.scrollTop() + deltaScrollY);
        }, 50);
      },
      onArrow: function (direction) {
        if (!this.active_cell) return;
        var active_cell = this.active_cell;
        var row = active_cell.parent;
        var idx = (function () {
          for (var i in row.scoring) {
            if (row.scoring[i] === active_cell) return parseInt(i);
          }
          return undefined;
        })();
        if (idx === undefined) return;
        var newitem = undefined;
        if (direction == Direction.Up || direction == Direction.Down) {
          var tabledata = this.pagedata.tabledata.filter((row) => row.is_first);
          var ridx = (function () {
            for (var i in tabledata) {
              if (tabledata[i] === row) return parseInt(i);
            }
            return undefined;
          })();
          if (ridx !== undefined) {
            if (direction == Direction.Up && ridx > 0) {
              newitem = tabledata[ridx - 1].scoring[idx];
            } else if (direction == Direction.Down && ridx < tabledata.length - 1) {
              newitem = tabledata[ridx + 1].scoring[idx];
            }
          }
        } else if (direction == Direction.Left || direction == Direction.Right) {
          if (direction == Direction.Left && idx > 0) {
            newitem = row.scoring[idx - 1];
          } else if (direction == Direction.Right && idx < row.scoring.length - 1) {
            newitem = row.scoring[idx + 1];
          }
        }
        if (newitem !== undefined) {
          active_cell.active = false;
          this.active_cell = newitem;
          this.active_cell.active = true;
        }
        this.onActiveCellChanged();
      },
      onGlobalClick: function (event) {
        if (this.active_cell) {
          this.active_cell.active = false;
          this.active_cell = undefined;
        }
      },
      onCellClick: function (cell, event) {
        if (this.active_cell) {
          this.active_cell.active = false;
          this.active_cell = undefined;
        }
        this.active_cell = cell;
        this.active_cell.active = true;
        event.stopPropagation();
      },
      onKeyDown: function (key, keyCode) {
        if (!this.active_cell) return;
        var keynum = parseInt(key);
        var oldnum = this.active_cell.num;
        if (!isNaN(keynum)) {
          if (this.active_cell.editing) {
            var num = this.active_cell.num;
            if (isNaN(num)) num = 0;
            this.active_cell.num = num * 10 + keynum;
          } else {
            this.active_cell.num = keynum;
            this.active_cell.editing = true;
          }
        } else if (keyCode == 8) {
          if (this.active_cell.editing) {
            var str = this.active_cell.str;
            this.active_cell.num = parseInt(str.slice(0, str.length - 1));
          } else {
            this.active_cell.num = NaN;
            this.active_cell.editing = true;
          }
        }
        if (this.active_cell.num !== oldnum && !(isNaN(this.active_cell.num) && isNaN(oldnum))) {
          this.active_cell.parent.dirty = true;
          this.pagedata.mark_dirty();
        }
      },
      save: function () {
        if (this.pagedata) {
          if (this.active_cell) {
            this.active_cell.active = false;
            this.active_cell = undefined;
          }
          this.pagedata.save();
        }
      }
    }
  });
})();

$(function() {
  nav.navto("home");
});