'use strict';
const {
  classes: Cc,
  interfaces: Ci,
  utils: Cu
} = Components;

var EXPORTED_SYMBOLS = ['CliqzHistory'];

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzAutocomplete',
  'chrome://cliqzmodules/content/CliqzAutocomplete.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistoryPattern',
  'chrome://cliqzmodules/content/CliqzHistoryPattern.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzCategories',
  'chrome://cliqzmodules/content/CliqzCategories.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistoryAnalysis',
  'chrome://cliqzmodules/content/CliqzHistoryAnalysis.jsm');



var CliqzHistory = {
  SAVE_THUMBNAILS: false,
  THUMBNAIL_LIMIT: 6400 ,
  tabData: [],
  lastActivePanel: null,
  lastVisit: [],
  lastVisitTransition: [],
  lastAction: Date.now(),
  listener: {
    QueryInterface: XPCOMUtils.generateQI(["nsIWebProgressListener", "nsISupportsWeakReference"]),

    onLocationChange: function(aBrowser, aWebProgress, aRequest, aLocation, aFlags) {
      if (CliqzUtils.getPref('categoryAssessment', false)) {
        CliqzCategories.assess(aBrowser.currentURI.spec);
      }
      var url = CliqzHistoryPattern.simplifyUrl(aBrowser.currentURI.spec);
      var tab = CliqzHistory.getTabForContentWindow(aBrowser.contentWindow);
      var panel = tab.linkedPanel;
      
      if (url.indexOf("chrome://") == 0 || url.substring(0, 6) == "about:" ||
        CliqzHistory.getTabData(panel, "url") == url ||
        CliqzHistory.getTabData(panel, "lock") || CliqzHistory.lastVisit.indexOf(url) == -1) {
        return;
      }
      var transition = CliqzHistory.lastVisitTransition[CliqzHistory.lastVisit.indexOf(url)];
      while (CliqzHistory.lastVisit.indexOf(url) != -1) {
        CliqzHistory.lastVisit.splice(CliqzHistory.lastVisit.indexOf(url), 1);
        CliqzHistory.lastVisitTransition.splice(CliqzHistory.lastVisit.indexOf(url), 1);
      }

      if (!CliqzHistory.getTabData(panel, "type")) {
        CliqzHistory.setTabData(panel, "type", "link");
      }
      
      if (!CliqzHistory.getTabData(panel, "query") || transition == 3  ||
        (transition == 2 && CliqzHistory.getTabData(panel, "type") == "link")  ||
        CliqzHistory.getTabData(panel, "external")) {
        CliqzHistory.setTabData(panel, "query", url);
        CliqzHistory.setTabData(panel, 'acQuery', "");
        CliqzHistory.setTabData(panel, "queryDate", new Date().getTime());
        if (CliqzHistory.getTabData(panel, "external")) CliqzHistory.setTabData(panel, "type", "external");
        else CliqzHistory.setTabData(panel, "type", "bookmark");
        CliqzHistory.setTabData(panel, "external", false);
      }
      CliqzHistory.setTabData(panel, 'url', url);
      CliqzHistory.addHistoryEntry(aBrowser);
      CliqzHistory.setTabData(panel, 'type', "link");
      CliqzHistory.setTabData(panel, "timeSpent", 0);
      CliqzHistory.reattachListeners(aBrowser, panel);
    },
    onStateChange: function(aBrowser, aWebProgress, aRequest, aStateFlags, aStatus) {
      var url = CliqzHistoryPattern.simplifyUrl(aBrowser.currentURI.spec);
      var tab = CliqzHistory.getTabForContentWindow(aBrowser.contentWindow);
      var panel = tab.linkedPanel;
      if ((aStateFlags & Ci.nsIWebProgressListener.STATE_STOP) && url == CliqzHistory.getTabData(panel, 'url') &&
        url != CliqzHistory.getTabData(panel, "lastThumb")) {
        CliqzHistory.reattachListeners(aBrowser, panel);
        CliqzHistory.updateOpenGraphData(aBrowser, panel);
        CliqzHistory.checkThumbnail(url, function() {
          CliqzHistory.generateThumbnail(aBrowser, panel, url);
        });
      }
      if ((aStateFlags & Ci.nsIWebProgressListener.STATE_STOP) && url != CliqzHistory.getTabData(panel, 'url')) {
        
        
        CliqzHistory.lastVisit.push(url);
        CliqzHistory.lastVisitTransition.push(0);
        CliqzHistory.listener.onLocationChange(aBrowser);
      }
    },
    onStatusChange: function(aBrowser, aWebProgress, aRequest, aStatus, aMessage) {
      CliqzHistory.listener.onLocationChange(aBrowser, aWebProgress, aRequest, null, null);
    }
  },
  removeAllListeners: function() {
    for (var panel in CliqzHistory.tabData) {
      CliqzHistory.removeListeners(CliqzHistory.getTabData(panel, "browser"), panel);
    }
  },
  removeListeners: function(aBrowser, panel) {
    if(aBrowser) {
      aBrowser.contentDocument.removeEventListener("click", CliqzHistory.getTabData(panel, "click"));
      aBrowser.contentDocument.removeEventListener("click", CliqzHistory.getTabData(panel, "linkClick"));
      aBrowser.contentDocument.removeEventListener("keydown", CliqzHistory.getTabData(panel, "key"));
      aBrowser.contentDocument.removeEventListener("scroll", CliqzHistory.getTabData(panel, "scroll"));
    }
  },
  reattachListeners: function(aBrowser, panel) {
    CliqzHistory.removeListeners(aBrowser, panel);
    aBrowser.contentDocument.addEventListener("click", CliqzHistory.getTabData(panel, "click"), false);
    aBrowser.contentDocument.addEventListener("click", CliqzHistory.getTabData(panel, "linkClick"), false);
    aBrowser.contentDocument.addEventListener("keydown", CliqzHistory.getTabData(panel, "key"), false);
    aBrowser.contentDocument.addEventListener("scroll", CliqzHistory.getTabData(panel, "scroll"), false);
    CliqzHistory.setTabData(panel, "browser", aBrowser);
  },
  updateOpenGraphData: function(aBrowser, panel) {
    var metaData = aBrowser.contentDocument.querySelectorAll('meta');
    if (!metaData) return;
    var data = {};
    for (var key in metaData) {
      if (!metaData[key].getAttribute) continue;
      var content = metaData[key].getAttribute("content");
      var prop = metaData[key].getAttribute("property");
      if (prop && prop.indexOf("og:") == 0) {
        var attr = prop.substr(3);
        if (data[attr] && data[attr] == content) continue;
        else if (data[attr] && typeof(data[attr]) == "string") {
          data[attr] = [data[attr]];
          data[attr].push(content);
        } else if (data[attr]) data[attr].push(content);
        else data[attr] = content;
      }
    }
    CliqzHistory.setTabData(panel, "opengraph", data);
    CliqzHistory.writeOpenGraphData(panel);
  },
  writeOpenGraphData: function(panel) {
    var data = JSON.stringify(CliqzHistory.getTabData(panel, "opengraph"));
    var dbData = CliqzHistory.getTabData(panel, "dbOpengraphData");
    var dbUrl = CliqzHistory.getTabData(panel, "dbOpengraphUrl");
    var url = CliqzHistory.getTabData(panel, "url");
    if ((data != dbData || dbUrl != url) && data.length > 2) {
      CliqzHistory.SQL("INSERT OR REPLACE INTO opengraph VALUES(:url, :data)", null, null, {
        url: url,
        data: data
      });
      CliqzHistory.setTabData(panel, "dbOpengraphData", data);
      CliqzHistory.setTabData(panel, "dbOpengraphUrl", url);
    }
  },
  generateThumbnail: function(aBrowser, panel, url) {
    var elm = aBrowser.contentDocument,
      doc = elm,
      win = aBrowser.contentWindow;

    function findPosX(obj) {
      var curleft = 0;
      if (obj.offsetParent) {
        while (1) {
          curleft += obj.offsetLeft;
          if (!obj.offsetParent) break;
          obj = obj.offsetParent;
        }
      } else if (obj.x) curleft += obj.x;
      return curleft;
    }

    function findPosY(obj) {
      var curtop = 0;
      if (obj.offsetParent) {
        while (1) {
          curtop += obj.offsetTop;
          if (!obj.offsetParent) break;
          obj = obj.offsetParent;
        }
      } else if (obj.y) curtop += obj.y;
      return curtop;
    }

    var x = findPosX(elm);
    var y = findPosY(elm);
    var width = win.innerWidth;
    var height = win.innerHeight;
    var filename = CliqzHistory.MD5(url);

    if (width < height) {
      var ratio = height / width;
      width = 208;
      height = width * ratio;
    } else {
      var ratio = width / height;
      height = 208;
      width = height * ratio;
    }

    var cnvs = doc.createElement('canvas')
    cnvs.width = width;
    cnvs.height = height;
    var ctx = cnvs.getContext("2d");

    ctx.scale(width / win.innerWidth, width / win.innerWidth);
    ctx.drawWindow(win, 0, 0, win.innerWidth, win.innerHeight, "rgb(255,255,255)");
    cnvs.toBlob(CliqzHistory.blobCallback(filename, panel, url), "image/jpeg", 0.8);
  },
  blobCallback: function(filename, panel, url) {
    return function(b) {
      var r = new CliqzUtils.getWindow().FileReader();
      r.onloadend = function() {
        Cu.import('resource://gre/modules/osfile.jsm');
        var writePath = FileUtils.getFile("ProfD", ["cliqz_thumbnails", filename + ".jpeg"]).path;
        OS.File.writeAtomic(writePath, new Uint8Array(r.result), {
          tmpPath: writePath + '.tmp'
        });
      };
      if (b.size > 2000) {
        r.readAsArrayBuffer(b);
        CliqzHistory.SQL("INSERT OR REPLACE INTO thumbnails VALUES(:url, :filename, :date)", null, null, {
          url: url,
          filename: filename + ".jpeg",
          date: Date.now()
        });
        CliqzHistory.setTabData(panel, "lastThumb", url);
      }
    }
  },
  checkThumbnail: function(url, callback) {
    if(!CliqzHistory.SAVE_THUMBNAILS) return;
    
    CliqzHistory.SQL("SELECT date FROM thumbnails WHERE url=:url AND (:date-date)<(60*60*1000)", null, function(n) {
      if (n == 0) callback();
    }, {
      url: url,
      date: Date.now()
    });
  },
  linkClickListener: function(event) {
    var panel = event.panel;
    var origTarget = event.target,
      aTarget = origTarget;

    while (aTarget.parentNode && aTarget.nodeName.toLowerCase() != "a")
      aTarget = aTarget.parentNode;

    if (aTarget.nodeName.toLowerCase() == "a" &&
      aTarget.getAttribute("href") && (event.button == 0 || event.button == 1)) {
      var url = CliqzHistory.getTabData(panel, "url");
      if (!url || url.length == 0) return;
      var linkUrl = CliqzHistoryPattern.simplifyUrl((aTarget.getAttribute("href") || ""));
      
      if (linkUrl.indexOf("//") == 0) {
        linkUrl = url.substr(0, url.indexOf("//")) + linkUrl;
        
      } else if (linkUrl.length > 0 && linkUrl[0] == "/") {
        var start = url.indexOf("/", url.indexOf("://") + 3);
        linkUrl = url.substr(0, start) + linkUrl;
      }
      
      var title = aTarget.getAttribute("title");
      
      while (!title && origTarget.hasChildNodes()) {
        origTarget = origTarget.childNodes[0];
        title = origTarget.nodeValue;
      }

      
      var target = aTarget.childNodes[0];
      while ((!title || title.trim().length === 0) && target) {
        var tmpTarget = target;
        while (tmpTarget.hasChildNodes()) tmpTarget = tmpTarget.childNodes[0];
        title = tmpTarget.nodeValue;
        target = target.nextSibling;
      }

      
      if (title && title.trim().length > 0) {
        CliqzHistory.updateTitle(CliqzHistoryPattern.simplifyUrl(linkUrl), null, title.trim());
      }
    }
  },
  addHistoryEntry: function(browser, customPanel) {
    Components.utils.import("resource://gre/modules/PrivateBrowsingUtils.jsm");
    if (!PrivateBrowsingUtils.isWindowPrivate(CliqzUtils.getWindow()) && browser) {
      var tab = CliqzHistory.getTabForContentWindow(browser.contentWindow),
       panel = tab.linkedPanel,
       url = CliqzHistory.getTabData(panel, 'url'),
       type = CliqzHistory.getTabData(panel, 'type'),
       query = CliqzHistory.getTabData(panel, 'query') || "",
       acQuery = CliqzHistory.getTabData(panel, 'acQuery') || "",
       autocompleteQuery = "",
       now = new Date().getTime(),
       queryDate = CliqzHistory.getTabData(panel, 'queryDate') || now;

      if (!url) return;

      if(CliqzHistory.getTabData(panel, "visitDate"))
        CliqzHistory.setTabData(panel, "prevVisit", CliqzHistory.getTabData(panel, "visitDate"));

      
      var externalQuery = CliqzHistoryPattern.extractQueryFromUrl(url);
      if (externalQuery && CliqzHistory.getTabData(panel, "extQuery") != externalQuery) {
        CliqzHistory.setTabData(panel, "queryDate", now);
        CliqzHistory.setTabData(panel, "extQuery", externalQuery);
        CliqzHistory.setTabData(panel, "query", externalQuery);
        CliqzHistory.setTabData(panel, 'acQuery', "");
        query = externalQuery;
        queryDate = now;
        type = "google";
      }

      CliqzHistory.addVisitToDB(url, query, now, queryDate,
        CliqzHistory.getTabData(panel, "prevVisit") || "", type, acQuery);
      CliqzHistory.setTabData(panel, "visitDate", now);
    }
  },
  addVisitToDB: function(url, query, visitDate, queryDate, prevVisit, type, autocompleteQuery) {
    
    if (["typed", "link", "autocomplete", "result", "bookmark", "external", "google"].indexOf(type) == -1)
      return;
    CliqzHistory.SQL("INSERT INTO visits (url,visit_date,last_query,last_query_date," + type + ", prev_visit, autocomplete_query)\
            VALUES (:url, :now, :query, :queryDate, 1, :prevVisit, :acQuery)",
      null, null, {
        url: url,
        query: query,
        now: visitDate,
        queryDate: queryDate,
        prevVisit: prevVisit,
        acQuery: autocompleteQuery
      });
  },
  updateTitle: function(url, title, linkTitle) {
    if (title && !linkTitle) {
      CliqzHistory.SQL("INSERT OR REPLACE INTO urltitles (url, title, linkTitle)\
                VALUES (:url, :title, (select linkTitle from urltitles where url=:url))", null, null, {
        url: url,
        title: title
      });
    } else if (!title && linkTitle) {
      CliqzHistory.SQL("INSERT OR REPLACE INTO urltitles (url, title, linkTitle)\
                VALUES (:url, (select title from urltitles where url=:url), :linkTitle)", null, null, {
        url: url,
        linkTitle: linkTitle
      });
    } else if (title && linkTitle) {
      CliqzHistory.SQL("INSERT OR REPLACE INTO urltitles (url, title, linkTitle)\
                VALUES (:url, :title, :linkTitle)", null, null, {
        url: url,
        title: title,
        linkTitle: linkTitle.trim()
      });
    }
  },
  lastMouseMove: 0,
  mouseMove: function(gBrowser) {
    return function(e) {
      if(!CliqzHistory) return;
      CliqzHistory.action(null, true);
      var now = Date.now();
      if (now - CliqzHistory.lastMouseMove > 500) {
        CliqzHistory.lastMouseMove = now;
        var activeTab = gBrowser.selectedTab;
        CliqzHistory.updateTimeSpent(activeTab.linkedPanel);
        if (activeTab.linkedPanel == CliqzHistory.lastActivePanel)
          CliqzHistory.updateInteractionData(activeTab.linkedPanel, true);
        else
          CliqzHistory.tabSelect({
            target: activeTab
          });
      }
    }
  },
  lastTimeUpdate: Date.now(),
  updateTimeSpent: function(panel) {
    var now = Date.now();
    var timeSinceAction = now - CliqzHistory.lastTimeUpdate;
    CliqzHistory.lastTimeUpdate = now;
    if (timeSinceAction > 60 * 1000  ) timeSinceAction = 60 * 1000;
    CliqzHistory.setTabData(panel, "timeSpent",
      CliqzHistory.getTabData(panel, "timeSpent") + timeSinceAction);
  },
  updateInteractionData: function(panel) {
    var visitDate = CliqzHistory.getTabData(panel, "visitDate");
    var clicks = CliqzHistory.getTabData(panel, "clickCount");
    var scrolls = CliqzHistory.getTabData(panel, "scrollCount");
    var keys = CliqzHistory.getTabData(panel, "keyCount");

    if (visitDate) {
      CliqzHistory.SQL("UPDATE visits \
                SET time_spent=:time, click_interaction=click_interaction+:clicks, \
                scroll_interaction=scroll_interaction+:scrolls, keyboard_interaction=keyboard_interaction+:keys \
                WHERE visit_date=:prev", null, null, {
        time: CliqzHistory.getTabData(panel, "timeSpent"),
        clicks: clicks,
        scrolls: scrolls,
        keys: keys,
        prev: visitDate
      });
      CliqzHistory.resetInteraction(panel);
    }
  },
  updateAllTabs: function() {
    for (var key in CliqzHistory.tabData) {
      CliqzHistory.updateInteractionData(key);
    }
  },
  updateLastActivePanel: function() {
    var tab = CliqzUtils.getWindow().gBrowser.selectedTab.linkedPanel;
    CliqzHistory.lastActivePanel = tab;
  },
  tabOpen: function(e) {
    var browser = CliqzUtils.getWindow().gBrowser,
      curPanel = CliqzHistory.lastActivePanel,
      newPanel = e.target.linkedPanel;

    CliqzHistory.updateInteractionData(curPanel);

    
    
    var inactive = Date.now() - CliqzHistory.lastAction;

    CliqzHistory.setTabData(newPanel, "lock", true);
    var checkUrl = function(p) {
      var url = p.tab.linkedBrowser.contentWindow.location.href;
      if (url == "about:blank") {
        CliqzUtils && CliqzUtils.setTimeout(checkUrl, 100, p);
        return;
      } else if (url != "about:newtab") {
        CliqzHistory.setTabData(p.newPanel, "query", CliqzHistory.getTabData(p.curPanel, 'query'));
        CliqzHistory.setTabData(p.newPanel, "queryDate", CliqzHistory.getTabData(p.curPanel, 'queryDate'));
        CliqzHistory.setTabData(p.newPanel, "linkUrl", CliqzHistory.getTabData(p.curPanel, 'linkUrl'));
        CliqzHistory.setTabData(p.newPanel, "linkTitle", CliqzHistory.getTabData(p.curPanel, 'linkTitle'));
        CliqzHistory.setTabData(p.newPanel, "prevVisit", CliqzHistory.getTabData(p.curPanel, 'visitDate'));
        
        if (inactive > 3000) {
          CliqzHistory.lastTimeUpdate = Date.now();
          CliqzHistory.setTabData(newPanel, "external", true);
        }
      }
      CliqzHistory.setTabData(p.newPanel, "lock", false);
    };
    checkUrl({
      tab: e.target,
      curPanel: curPanel,
      newPanel: newPanel
    });
  },
  tabClose: function(e) {
    var panel = e.target.linkedPanel;
    var newPanel = CliqzUtils.getWindow().gBrowser.selectedTab.linkedPanel;
    CliqzHistory.updateInteractionData(panel, true);
    CliqzHistory.tabData.splice(CliqzHistory.tabData.indexOf(panel), 1);
  },
  tabSelect: function(e) {
    var curPanel = CliqzHistory.lastActivePanel,
      newPanel = e.target.linkedPanel;

    CliqzHistory.updateLastActivePanel();
    CliqzHistory.updateInteractionData(curPanel);
    CliqzHistory.updateInteractionData(newPanel);
  },
  getTabData: function(panel, attr) {
    if (!CliqzHistory || !CliqzHistory.tabData[panel]) {
      return undefined;
    } else {
      return CliqzHistory.tabData[panel][attr];
    }
  },
  setTabData: function(panel, attr, val) {
    if (!CliqzHistory) return;

    if (!CliqzHistory.tabData[panel]) {
      CliqzHistory.tabData[panel] = [];
      CliqzHistory.resetInteraction(panel);
      CliqzHistory.setTabData(panel, "timeSpent", 0);
      CliqzHistory.tabData[panel].click = CliqzHistory.increaseActionCounter("clickCount", panel);
      CliqzHistory.tabData[panel].key = CliqzHistory.increaseActionCounter("keyCount", panel);
      CliqzHistory.tabData[panel].scroll = CliqzHistory.increaseActionCounter("scrollCount", panel);
      CliqzHistory.tabData[panel].linkClick = function(e) {
        e.panel = panel;
        CliqzHistory && CliqzHistory.linkClickListener(e);
      };
    }
    CliqzHistory.tabData[panel][attr] = val;
  },
  increaseActionCounter: function(counter, panel) {
    return function() {
      CliqzHistory.setTabData(panel, counter, CliqzHistory.getTabData(panel, counter) + 1);
      CliqzHistory.updateTimeSpent(panel);
    };
  },
  resetInteraction: function(panel) {
    CliqzHistory.setTabData(panel, "clickCount", 0);
    CliqzHistory.setTabData(panel, "keyCount", 0);
    CliqzHistory.setTabData(panel, "scrollCount", 0);
  },
  action: function(e, timeout) {
    if (!timeout) {
      CliqzHistory.lastAction = Date.now();
    } else {
      CliqzUtils.setTimeout(function() {
        if(CliqzHistory) CliqzHistory.lastAction = Date.now();
      }, 1000);
    }
  },
  updateQuery: function(query, acQuery) {
    var date = new Date().getTime();
    var panel = CliqzUtils.getWindow().gBrowser.selectedTab.linkedPanel;
    var last = CliqzHistory.getTabData(panel, 'query');
    if (last != query) {
      CliqzHistory.setTabData(panel, 'query', acQuery || query);
      CliqzHistory.setTabData(panel, 'queryDate', date);
      CliqzHistory.setTabData(panel, 'acQuery', acQuery ? query : "");
    }
  },
  dbConn: null,
  SQL: function(sql, onRow, callback, parameters) {
    let file = FileUtils.getFile("ProfD", ["cliqz.db"]);
    if (!CliqzHistory.dbConn)
      CliqzHistory.dbConn = Services.storage.openDatabase(file);

    var statement = CliqzHistory.dbConn.createAsyncStatement(sql);

    for (var key in parameters) {
      statement.params[key] = parameters[key];
    }

    CliqzHistory._SQL(CliqzHistory.dbConn, statement, onRow, callback);
  },
  _SQL: function(dbConn, statement, onRow, callback) {
    statement.executeAsync({
      resultCount: 0,
      handleResult: function(aResultSet) {
        for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
          this.resultCount++;
          if (onRow) {
            var values = [];
            try {
              var i = 0;
              while(true) {
                
                
                values[i] = row.getResultByIndex(i);
                i++;
              }
            } catch (e) {}
            onRow(values);
          }
        }
      },

      handleError: function(aError) {
        CliqzUtils.log("Error (" + aError.result + "):" + aError.message, "CliqzHistory._SQL");
        if (callback) {
          callback(0);
        }
      },
      handleCompletion: function(aReason) {
        if (callback) {
          callback(this.resultCount);
        }
      }
    });
    statement.finalize();
  },
  initDB: function() {
    var visits = "create table visits(\
            id INTEGER PRIMARY KEY NOT NULL,\
            url VARCHAR(255) NOT NULL,\
            visit_date DATE,\
            last_query VARCHAR(255),\
            autocomplete_query VARCHAR(255),\
            last_query_date DATE,\
            typed BOOLEAN DEFAULT 0,\
            link BOOLEAN DEFAULT 0,\
            result BOOLEAN DEFAULT 0,\
            autocomplete BOOLEAN DEFAULT 0,\
            google BOOLEAN DEFAULT 0,\
            bookmark BOOLEAN DEFAULT 0,\
            external BOOLEAN DEFAULT 0,\
            prev_visit DATE,\
            time_spent INTEGER DEFAULT 0,\
            click_interaction INTEGER DEFAULT 0,\
            scroll_interaction INTEGER DEFAULT 0,\
            keyboard_interaction INTEGER DEFAULT 0\
            )";
    var titles = "create table urltitles(\
            url VARCHAR(255) PRIMARY KEY NOT NULL,\
            title VARCHAR(255),\
            linktitle VARCHAR(255)\
        )";

    var opengraph = "create table opengraph(\
            url VARCHAR(255) PRIMARY KEY NOT NULL,\
            data VARCHAR(2048)\
        )";

    var thumbnails = "create table thumbnails(\
            url VARCHAR(255) PRIMARY KEY NOT NULL,\
            file VARCHAR(255),\
            date DATE\
        )";

    if (FileUtils.getFile("ProfD", ["cliqz.db"]).exists()) {
      CliqzHistory.addColumn("urltitles", "linktitle", "VARCHAR(255)");
      CliqzHistory.addColumn("visits", "prev_visit", "DATE");
      CliqzHistory.addColumn("visits", "time_spent", "INTEGER DEFAULT 0");
      CliqzHistory.addColumn("visits", "click_interaction", "INTEGER DEFAULT 0");
      CliqzHistory.addColumn("visits", "scroll_interaction", "INTEGER DEFAULT 0");
      CliqzHistory.addColumn("visits", "keyboard_interaction", "INTEGER DEFAULT 0");
      CliqzHistory.addColumn("visits", "external", "BOOLEAN DEFAULT 0");
      CliqzHistory.addColumn("visits", "autocomplete_query", "VARCHAR(255)");
      CliqzHistory.SQL("SELECT name FROM sqlite_master WHERE type='table' AND name='opengraph'", null, function(n) {
        if (n == 0) CliqzHistory.SQL(opengraph);
      });
      CliqzHistory.SQL("SELECT name FROM sqlite_master WHERE type='table' AND name='thumbnails'", null, function(n) {
        if (n == 0) CliqzHistory.SQL(thumbnails);
      });
    } else {
      CliqzHistory.SQL(visits);
      CliqzHistory.SQL(titles);
      CliqzHistory.SQL(opengraph);
      CliqzHistory.SQL(thumbnails);
    }
    
    FileUtils.getDir("ProfD", ["cliqz_thumbnails"], true);

    
    CliqzHistory.cleanUpThumbnails();

    
    CliqzUtils.setTimeout(function() {
      CliqzHistoryAnalysis.startAnalysis();
    }, 0);
  },
  addColumn: function(table, col, type) {
    CliqzHistory.SQL("SELECT * FROM sqlite_master WHERE tbl_name=:table AND sql like :col", null,
      function(n) {
        if (n == 0) CliqzHistory.SQL("alter table " + table + " add column " + col + " " + type);
      }, {
        table: table,
        col: "% " + col + " %"
      });
  },
  deleteVisit: function(url) {
    
    CliqzHistory.SQL("delete from visits where url = :url", null, null, {
      url: url
    });
    CliqzHistory.SQL("delete from urltitles where url = :url", null, null, {
      url: url
    });
    CliqzHistory.SQL("delete from thumbnails where url = :url", null, null, {
      url: url
    });
    CliqzHistory.SQL("delete from opengraph where url = :url", null, null, {
      url: url
    });
    CliqzHistory.deleteThumbnail(url);
  },
  deleteThumbnail: function(url) {
    var thumbnail = FileUtils.getFile("ProfD", ["cliqz_thumbnails", CliqzHistory.MD5(url) + ".jpeg"]);
    if (thumbnail.exists()) thumbnail.remove(true);
  },
  deleteTimeFrame: function() {
    
    CliqzHistoryPattern.historyTimeFrame(function(min, max) {
      CliqzHistory.SQL("select url from visits where visit_date < :min OR visit_date > :max", function(r) {
        
        CliqzHistory.deleteVisit(r[0]);
      }, null, {
        min: min,
        max: max
      });
    });
  },
  clearHistory: function() {
    CliqzHistory.SQL("delete from visits");
    CliqzHistory.SQL("delete from urltitles");
    CliqzHistory.SQL("delete from thumbnails");
    CliqzHistory.SQL("delete from opengraph");
    
    FileUtils.getDir("ProfD", ["cliqz_thumbnails"], true); 
    FileUtils.getDir("ProfD", ["cliqz_thumbnails"], true).remove(true);
    FileUtils.getDir("ProfD", ["cliqz_thumbnails"], true); 
  },
  cleanUpThumbnails: function() {
    var thumbDir = FileUtils.getDir("ProfD", ["cliqz_thumbnails"], true);
    var fileEnum = thumbDir.directoryEntries;
    var fileCount = 0;
    while(fileEnum.hasMoreElements()) {
      var tmp = fileEnum.getNext();
      fileCount++;
    }
    if(fileCount > CliqzHistory.THUMBNAIL_LIMIT) {
      
      CliqzUtils.setTimeout(function() {
        
        CliqzHistory.SQL("select url from thumbnails order by date limit 1000", function(r) {
          var url = r[0];
          CliqzHistory.SQL("delete from thumbnails where url = :url", null, null, {url:url});
          CliqzHistory.deleteThumbnail(url);
        });
      },0);
    }
  },
  historyObserver: {
    onBeginUpdateBatch: function() {},
    onEndUpdateBatch: function() {
      CliqzHistory.deleteTimeFrame();
    },
    onVisit: function(aURI, aVisitID, aTime, aSessionID, aReferringID, aTransitionType) {
      var url = CliqzHistoryPattern.simplifyUrl(aURI.spec);
      CliqzHistory.lastVisit.push(url);
      CliqzHistory.lastVisitTransition.push(aTransitionType);
    },
    onTitleChanged: function(aURI, aPageTitle) {
      var url = CliqzHistoryPattern.simplifyUrl(aURI.spec);
      if (url.length > 0 && aPageTitle.length > 0)
        CliqzHistory.updateTitle(url, aPageTitle)
    },
    onDeleteURI: function(aURI) {
      CliqzHistory.deleteVisit(aURI.spec);
    },
    onClearHistory: function() {
      CliqzHistory.clearHistory();
    },
    onPageChanged: function(aURI, aWhat, aValue) {},
    onDeleteVisits: function() {},
    QueryInterface: XPCOMUtils.generateQI([Ci.nsINavHistoryObserver])
  },
  getTabForContentWindow: function(window) {
    let browser;
    try {
      browser = window.QueryInterface(Ci.nsIInterfaceRequestor)
        .getInterface(Ci.nsIWebNavigation)
        .QueryInterface(Ci.nsIDocShell)
        .chromeEventHandler;
    } catch (e) {}

    if (!browser) {
      return null;
    }

    let chromeWindow = browser.ownerDocument.defaultView;

    if ('gBrowser' in chromeWindow && chromeWindow.gBrowser &&
      'browsers' in chromeWindow.gBrowser) {
      let browsers = chromeWindow.gBrowser.browsers;
      let i = browsers.indexOf(browser);
      if (i !== -1)
        return chromeWindow.gBrowser.tabs[i];
      return null;
    } else if ('BrowserApp' in chromeWindow) {
      return getTabForWindow(window);
    }
    return null;
  },
  getURI: function(tab) {
    if (tab.browser)
      return tab.browser.currentURI.spec;
    return tab.linkedBrowser.currentURI.spec;
  },
  MD5: function(str) {
    var converter =
      Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].
    createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
    converter.charset = "UTF-8";
    var result = {};
    var data = converter.convertToByteArray(str, result);
    var ch = Components.classes["@mozilla.org/security/hash;1"]
      .createInstance(Components.interfaces.nsICryptoHash);
    ch.init(ch.MD5);
    ch.update(data, data.length);
    var hash = ch.finish(false);

    function toHexString(charCode) {
      return ("0" + charCode.toString(16)).slice(-2);
    }
    return [toHexString(hash.charCodeAt(i)) for (i in hash)].join("");
  }
}