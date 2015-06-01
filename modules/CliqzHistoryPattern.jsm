'use strict';
const {
  classes: Cc,
  interfaces: Ci,
  utils: Cu
} = Components;

var EXPORTED_SYMBOLS = ['CliqzHistoryPattern']; 

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");
Components.utils.import("resource://gre/modules/NetUtil.jsm");

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistory',
  'chrome://cliqzmodules/content/CliqzHistory.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'Result',
  'chrome://cliqzmodules/content/Result.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzClusterHistory',
  'chrome://cliqzmodules/content/CliqzClusterHistory.jsm');

var DATA_SOURCE = "firefox_cluster",
    FF_DEF_FAVICON = 'chrome://mozapps/skin/places/defaultFavicon.png',
    Q_DEF_FAVICON = 'chrome://cliqzres/content/skin/defaultFavicon.png';

var CliqzHistoryPattern = {
  PATTERN_DETECTION_ENABLED: true,
  timeFrame: Date.now() - 60 * 60 * 24 * 7 * 1000, 
  data: null,
  pattern: null,
  firefoxHistory: null,
  noResultQuery: null,
  colors: null,
  historyCallback: null,
  latencies: [],
  
  dbConn: null,
  initDbConn: function() {
    var file = FileUtils.getFile("ProfD", ["cliqz.db"]);
    if(!CliqzHistoryPattern.dbConn)
      CliqzHistoryPattern.dbConn = Services.storage.openDatabase(file);
  },
  detectPattern: function(query, callback) {
    if (query.length <= 2) {
      CliqzHistoryPattern.noResultQuery = query;
      return;
    }
    if (DATA_SOURCE != "cliqz") {
      return;
    }
    var orig_query = query;
    CliqzHistoryPattern.latencies[orig_query] = (new Date).getTime();
    query = CliqzHistoryPattern.generalizeUrl(query);
    query = query.split(" ")[0];
    CliqzHistoryPattern.initDbConn();
    this.data = [];
    this.pattern = [];
    this.SQL
      ._execute(
        CliqzHistoryPattern.dbConn,
        "select distinct visits.last_query_date as sdate, visits.last_query as query, visits.url as url, visits.visit_date as vdate, urltitles.title as title from visits " +
        "inner join ( " +
        "select visits.last_query_date from visits, urltitles where visits.url = urltitles.url and visits.last_query_date > :time_frame and " +
        "(visits.url like :query or visits.last_query like :query or urltitles.title like :query ) " +
        "group by visits.last_query_date " +
        ") as matches  " +
        "on visits.last_query_date = matches.last_query_date " +
        "left outer join urltitles on urltitles.url = visits.url order by visits.visit_date",
        {
          query: "%" + query + "%",
          time_frame: CliqzHistoryPattern.timeFrame
        },
        ["sdate", "query", "url", "vdate", "title"],
        function(result) {
          try {
            if (!CliqzHistoryPattern.data[result.sdate]) {
              CliqzHistoryPattern.data[result.sdate] = [];
            }
            CliqzHistoryPattern.data[result.sdate].push(result);
          } catch (ex) {}
        }
      )
      .then(function() {
        
        for (var key in CliqzHistoryPattern.data) {
          CliqzHistoryPattern.mutateSession(CliqzHistoryPattern.data[key]);
        }

        
        var groupedPatterns = [];
        for (key in CliqzHistoryPattern.pattern) {
          var cur = CliqzHistoryPattern.pattern[key];
          var url = CliqzHistoryPattern.generalizeUrl(cur.url, true);
          var pat = groupedPatterns[url];
          if (pat) {
            pat.cnt += cur.cnt;
            pat.query = pat.query.concat(cur.query);
            if (cur.date > pat.date) {
              pat.date = cur.date;
            }
            if (cur.cnt > 1 && cur.pathLength > 1) {
              pat.isPattern = true;
            }
          } else {
            
            if (cur.cnt > 1 && cur.pathLength > 1){
              groupedPatterns[url] = cur;
              groupedPatterns[url].isPattern = true;
            }
            
          }
        }
        
        
        

        
        var finalPatterns = [];
        for (var key in groupedPatterns) {
          if (groupedPatterns[key].title) {
            finalPatterns.push(groupedPatterns[key]);
          }
        }
        finalPatterns = finalPatterns.sort(CliqzHistoryPattern.sortPatterns(true, 'cnt'));
        var res = CliqzHistoryPattern.preparePatterns(finalPatterns, orig_query);

        
        if (res.filteredResults().length === 0){
          if(CliqzHistoryPattern.firefoxHistory.query == orig_query) {
            res = CliqzHistoryPattern.firefoxHistory.res;
            CliqzHistoryPattern.noResultQuery = null;
          }
          else
            CliqzHistoryPattern.noResultQuery = orig_query;
        }
        else CliqzHistoryPattern.noResultQuery = null;

        CliqzHistoryPattern.historyCallback(res);
      });
  },
  
  generateResult: function(patterns, query, cluster, baseUrl) {
    if (!patterns) {
      patterns = [];
    }
    return {
      query: query,
      cluster: cluster,
      top_domain: baseUrl || CliqzHistoryPattern.maxDomainShare(patterns)[0],
      
      results: patterns,
      filteredResults: function() {
        var self = this;
        return this.results.filter(function(r){
          return r.title && CliqzUtils.getDetailsFromUrl(r.url).name == CliqzUtils.getDetailsFromUrl(self.top_domain).name;
        });
      }
    };
  },
  
  addFirefoxHistory: function(history) {
    var query = history.searchString;
    
    var clustered_result = CliqzClusterHistory.cluster(history);
    
    var cluster_data = clustered_result[1];

    
    var patterns = [];
    for (var i = 0; i < history.matchCount; i++) {
      var url = CliqzUtils.cleanMozillaActions(history.getValueAt(i)),
          title = history.getCommentAt(i);

      if (!title) {
        
        title = CliqzHistoryPattern.domainFromUrl(url, false).split(".")[0];
        if(title)
          title = title[0].toUpperCase() + title.substr(1);
      }

      if (title.length > 0 && url.length > 0 &&
          CliqzHistoryPattern.simplifyUrl(url) != null &&
          Result.isValid(url, CliqzUtils.getDetailsFromUrl(url))) {

        patterns.push({
          url: url,
          title: title,
          favicon: history.getImageAt(i),
          _genUrl: CliqzHistoryPattern.generalizeUrl(url, true)
        });
      }
    }
    
    var res = CliqzHistoryPattern.preparePatterns(patterns, query);
    CliqzHistoryPattern.firefoxHistory = [];
    CliqzHistoryPattern.firefoxHistory.res = res;
    CliqzHistoryPattern.firefoxHistory.query = query;
    if(cluster_data && res.filteredResults() && res.filteredResults()[0].url == cluster_data.url) {
      CliqzHistoryPattern.firefoxHistory = [];
      CliqzHistoryPattern.firefoxHistory.res = cluster_data;
      CliqzHistoryPattern.firefoxHistory.query = query;

      var res = cluster_data;
      res.query = query;

      
      res.filteredResults = function() {
        return this.results;
      };

    }

    
    if (query.length == 0 ||
      DATA_SOURCE == "firefox_cluster" || DATA_SOURCE == "firefox_no_cluster" ||
      (DATA_SOURCE == "cliqz" && CliqzHistoryPattern.noResultQuery == query)) {
      CliqzHistoryPattern.historyCallback(res);
    }
  },
  
  preparePatterns: function(patterns, query) {
    var baseUrl, favicon, orig_query = query;

    query = CliqzUtils.cleanUrlProtocol(query, true);

    
    patterns = CliqzHistoryPattern.filterPatterns(patterns, query.toLowerCase());
    var share = CliqzHistoryPattern.maxDomainShare(patterns);

    
    patterns = CliqzHistoryPattern.removeDuplicates(patterns);

    
    var adjustedResults = CliqzHistoryPattern.adjustBaseDomain(patterns, query);
    patterns = adjustedResults[0];
    baseUrl = adjustedResults[1];
    favicon = adjustedResults[2];
    var res = CliqzHistoryPattern.generateResult(patterns, orig_query, false, baseUrl);

    
    var fRes = res.filteredResults();
    var genQ = CliqzHistoryPattern.generalizeUrl(query);
    if (share[1] > 0.5 && fRes.length > 2
    && !(CliqzHistoryPattern.generalizeUrl(patterns[0].url).indexOf(genQ) !== 0 && share[1] < 0.8)) {
      
      var [tmpResults, tmpBaseUrl] = CliqzHistoryPattern.adjustBaseDomain(fRes, query);
      baseUrl = tmpBaseUrl;
      CliqzHistoryPattern.addBaseDomain(patterns, baseUrl, favicon);
      res.cluster = true;
    
    } else {
      
      res.filteredResults = function() {
        return this.results;
      };
    }

    
    CliqzHistoryPattern.addBaseDomain(patterns, baseUrl, favicon);
    
    if(patterns && patterns.length > 0 &&
      patterns[0].autoAdd && CliqzHistoryPattern.generalizeUrl(patterns[0].url).indexOf(genQ) != 0)
        patterns.shift();

    res.results = CliqzHistoryPattern.removeDuplicates(res.results);
    return res;
  },

  
  maxDomainShare: function(patterns) {
    var patternCount = patterns.length;
    
    var boostRange = 3;
    
    
    var boostFactor = (patternCount - boostRange) / (1 * boostRange);

    
    
    boostFactor = Math.max(1, boostFactor);

    var domains = [];
    var index = 0;
    for (var key in patterns) {
      var url = patterns[key].url;
      var domain = this.domainFromUrl(url, false);
      
      var weightedCount = index < boostRange ? boostFactor : 1;
      if (!domains[domain]) {
        domains[domain] = weightedCount;
      } else {
        var cnt = 1;
        if(patterns[key].cnt) cnt = patterns[key].cnt;
        domains[domain] += weightedCount;
      }
      index++;
    }
    var max = 0.0;
    var cnt = 0.0;
    var domain = null;
    for (key in domains) {
      cnt += domains[key];
      if (domains[key] > max) {
        max = domains[key];
        domain = key;
      }
    }

    return [domain, max / cnt];
  },
  sortPatterns: function(desc, key) {
    return function(a, b) {
      return desc ? ~~(key ? a[key] < b[key] : a < b) : ~~(key ? a[key] > b[key] : a > b);
    };
  },
  filterPatterns: function(patterns, full_query) {
    var queries = full_query.trim().split(" ");
    var newPatterns = [];
    for (var key in patterns) {
      var match = true;
      
      for (var wordKey in queries) {
        var titleUrlMatch = false;
        if (patterns[key].url.indexOf(queries[wordKey]) != -1 ||
          ((patterns[key].title || '').toLowerCase().indexOf(queries[wordKey]) != -1)) {
          titleUrlMatch = true;
        }
        var queryMatch = false;
        for (var qkey in patterns[key].query) {
          var q = patterns[key].query[qkey];
          if (q.indexOf(queries[wordKey]) != -1) {
            queryMatch = true;
            break;
          }
        }
        if (!queryMatch && !titleUrlMatch) {
          match = false;
          break;
        }
      }
      if (match) newPatterns.push(patterns[key]);
    }
    return newPatterns;
  },
  
  pushPatternsToFront: function(patterns, query) {
    var newPatterns = [];
    var max = 2,
      cnt = 0;

    for (var key in patterns) {
      var pattern = patterns[key];
      if (pattern.isPattern && cnt < max) {
        newPatterns.push(pattern);
        cnt += 1;
      }
    }
    for (var key in patterns) {
      var pattern = patterns[key];
      if (!pattern.isPattern) {
        newPatterns.push(pattern);
      }
    }
    return newPatterns;
  },
  removeDuplicates: function(patterns) {
    var newPatterns = [];
    var titles = [];
    var urls = [];
    for (var key in patterns) {
      var pattern = patterns[key], title = pattern.title;

      if (titles[title] !== true && urls[pattern._genUrl] !== true) {
        newPatterns.push(pattern);
        titles[title] = true;
        urls[pattern._genUrl] = true;
      }
    }
    return newPatterns;
  },
  
  findCommonDomain: function(patterns) {
    if (patterns.length < 2) {
      return null;
    }
    var scores = {}

    for (var key in patterns) {
      var url1 = patterns[key]._genUrl;
      scores[url1] = true;
      for (var key2 in patterns) {
        var url2 = patterns[key2]._genUrl;
        if (key != key2 && url2.indexOf(url1) == -1) {
          scores[url1] = false;
        }
      }
    }

    
    for (var key in scores) {
      if (scores[key] === true) {
        return key;
      }
    }
    return null;
  },
  
  adjustBaseDomain: function(patterns, query) {
    if (patterns.length === 0) {
      return [];
    }
    var basePattern = null, baseUrl = null, favicon = null,
        commonDomain = CliqzHistoryPattern.findCommonDomain(patterns);

    query = CliqzHistoryPattern.generalizeUrl(query, true);
    for (var key in patterns) {
      var url = patterns[key]._genUrl;
      if (url.indexOf(query) === 0) {
        baseUrl = url;
        favicon = patterns[key].favicon;
        break;
      }
    }

    if (!baseUrl) {
      baseUrl = patterns[0]._genUrl;
      favicon = patterns[0].favicon;
    }

    baseUrl = commonDomain || baseUrl.split('/')[0];

    for (var i = 0; i < patterns.length; i++) {
      var pUrl = patterns[i]._genUrl;
      if (baseUrl == pUrl ||
        baseUrl.indexOf(pUrl) != -1) {
        basePattern = patterns[i];
        if (i !== 0) break;
      }
    }
    var newPatterns = [];

    if (basePattern) {
      basePattern.base = true;
      patterns[0].debug = 'Replaced by base domain';
      newPatterns.push(basePattern);
    }

    for (var key in patterns) {
      if (patterns[key] != basePattern) newPatterns.push(patterns[key]);
    }
    return [newPatterns, baseUrl, favicon];
  },
  
  addBaseDomain: function(patterns, baseUrl, favicon) {
    baseUrl = CliqzHistoryPattern.generalizeUrl(baseUrl, true);
    
    
    if (patterns && patterns.length > 0 && !patterns[0].base) {
      var title = CliqzHistoryPattern.domainFromUrl(baseUrl, false);
      if (!title) return;
      patterns.unshift({
        title: title.charAt(0).toUpperCase() + title.split(".")[0].slice(1),
        url: baseUrl,
        favicon: favicon
      });
      patterns[0].autoAdd = true;
    }
    return baseUrl;
  },
  
  mutateSession: function(session) {
    for (var i = 0; i < session.length; i++) {
      var start = this.simplifyUrl(session[i].url);
      if (!start) continue;
      var str = start;

      
      
      
      

      for (var j = i + 1; j < session.length; j++) {
        var end = this.simplifyUrl(session[j].url);
        if (!end) continue;
        str += " -> " + end;

        if (start != end) {
          this.updatePattern(session[j], str, str.split("->").length);
        }
      }
    }
    return session;
  },
  updatePattern: function(session, path, pathLength) {
    if (!(path in this.pattern)) {
      this.pattern[path] = [];
      this.pattern[path].url = session.url;
      this.pattern[path].query = [CliqzHistoryPattern.generalizeUrl(session.query, true)];
      this.pattern[path].title = session.title;
      this.pattern[path].path = path;
      this.pattern[path].cnt = 1;
      this.pattern[path].date = session.vdate;
      this.pattern[path].pathLength = pathLength;
    } else {
      this.pattern[path].cnt += 1;
      this.pattern[path].query.push(CliqzHistoryPattern.generalizeUrl(session.query, true));
      if (session.vdate > this.pattern[path].date) {
        this.pattern[path].date = session.vdate;
      }
    }
  },
  
  simplifyUrl: function(url) {
    
    if (url.search(/http(s?):\/\/bit\.ly\/.*/i) === 0) {
      return null;
    
    } else if (url.search(/http(s?):\/\/t\.co\/.*/i) === 0) {
      return null;
    
    } else if (url.search(/http(s?):\/\/www\.google\..*\/url\?.*url=.*/i) === 0) {
      
      url = url.substring(url.lastIndexOf("url=")).split("&")[0];
      url = url.substr(4);
      return decodeURIComponent(url);

      
    } else if (url.search(/http(s?):\/\/www\.google\..*\/.*q=.*/i) === 0) {
      var q = url.substring(url.lastIndexOf("q=")).split("&")[0];
      if (q != "q=") {
        
        var param = url.indexOf("#") != -1 ? url.substr(url.indexOf("#")) : url.substr(url.indexOf("?"));
        var tbm = param.indexOf("tbm=") != -1 ? ("&" + param.substring(param.lastIndexOf("tbm=")).split("&")[0]) : "";
        var page = param.indexOf("start=") != -1 ? ("&" + param.substring(param.lastIndexOf("start=")).split("&")[0]) : "";
        return "https://www.google.com/search?" + q + tbm ;
      } else {
        return url;
      }
      
    } else if (url.search(/http(s?):\/\/www\.bing\..*\/.*q=.*/i) === 0) {
      var q = url.substring(url.indexOf("q=")).split("&")[0];
      if (q != "q=") {
        return url.substr(0, url.indexOf("search?")) + "search?" + q;
      } else {
        return url;
      }
      
    } else if (url.search(/http(s?):\/\/r.search\.yahoo\.com\/.*/i) === 0) {
      url = url.substring(url.lastIndexOf("/RU=")).split("/RK=")[0];
      url = url.substr(4);
      return decodeURIComponent(url);
      
    } else if (url.search(/http(s?):\/\/.*search\.yahoo\.com\/search.*p=.*/i) === 0) {
      var p = url.substring(url.indexOf("p=")).split("&")[0];
      if (p != "p=" && url.indexOf(";") != -1) {
        return url.substr(0, url.indexOf(";")) + "?" + p;
      } else {
        return url;
      }
    } else {
      return url;
    }
  },
  extractQueryFromUrl: function(url) {
    
    if (url.search(/http(s?):\/\/www\.google\..*\/.*q=.*/i) === 0) {
      url = url.substring(url.lastIndexOf("q=")+2).split("&")[0];
    
    } else if(url.search(/http(s?):\/\/www\.bing\..*\/.*q=.*/i) === 0) {
      url = url.substring(url.indexOf("q=")+2).split("&")[0];
    
    } else if(url.search(/http(s?):\/\/.*search\.yahoo\.com\/search.*p=.*/i) === 0) {
      url = url.substring(url.indexOf("p=")+2).split("&")[0];
    } else {
      url = null;
    }
    var decoded = url ? decodeURIComponent(url.replace(/\+/g," ")) : null;
    if(decoded) return decoded;
    else return url;
  },
  
  autocompleteTerm: function(urlbar, pattern, loose) {
    function matchQuery(queries) {
      var query = "";
      for (var key in queries) {
        var q = queries[key].toLowerCase();
        if (q.indexOf(input) === 0 && q.length > query.length) {
          query = q;
        }
      }
      return query;
    }
    if (urlbar == "www." || urlbar == "http://" || urlbar.substr(urlbar.indexOf("://")+3) == "www." || urlbar == '')
      return {};

    var type = null;
    var url = CliqzHistoryPattern.simplifyUrl(pattern.url);
    url = CliqzHistoryPattern.generalizeUrl(url, true);
    var input = CliqzHistoryPattern.generalizeUrl(urlbar);
    if(urlbar[urlbar.length-1] == '/') input += '/';
    var shortTitle = "";
    if (pattern.title) {
      shortTitle = pattern.title.split(' ')[0];
    }
    var autocomplete = false,
      highlight = false,
      selectionStart = 0,
      urlbarCompleted = "";
    var queryMatch = matchQuery(pattern.query);

    
    if (url.indexOf(input) === 0 && url != input) {
      autocomplete = true;
      highlight = true;
      urlbarCompleted = urlbar + url.substring(url.indexOf(input) + input.length);
      type = 'url';
    }
    
    else if (queryMatch.length > 0 && queryMatch != input && urlbar.indexOf("www.") != 0) {
      autocomplete = true;
      highlight = true;
      urlbarCompleted = urlbar + queryMatch.substring(queryMatch.toLowerCase().indexOf(input) + input.length) + " - " + url;
      type = 'query';
    }
    
    else if (shortTitle.toLowerCase().indexOf(input) === 0 && shortTitle.length >= input.length && urlbar.indexOf("www.") != 0) {
      autocomplete = true;
      highlight = true;
      urlbarCompleted = urlbar + shortTitle.substring(shortTitle.toLowerCase().indexOf(input) + input.length) + " - " + url;
      type = 'title';
    
    } else if (input.trim().indexOf(" ") != -1 &&
      input[input.length - 1] != " " && loose && urlbar.indexOf("www.") != 0) {
      var queryEnd = input.split(" ")[input.split(" ").length - 1].toLowerCase();
      if (pattern.title && pattern.title.toLowerCase().indexOf(queryEnd) != -1) {
        var words = pattern.title.split(" ");

        for (var key in words) {
          if (words[key].toLowerCase().indexOf(queryEnd) === 0) {
            var word = words[key];
            break;
          }
        }
      }
      if (word) {
        urlbarCompleted = urlbar + word.substr(word.toLowerCase().indexOf(queryEnd) + queryEnd.length) + " - " + url;
        autocomplete = true;
        highlight = true;
        type = 'word';
      } else {
        autocomplete = false;
        highlight = false;
      }
    }
    if (autocomplete) {
      selectionStart = urlbar.toLowerCase().lastIndexOf(input) + input.length;
    }

    
    if(urlbar.indexOf("://") != -1) {
      var prot_user = urlbar.substr(0, urlbar.indexOf("://")+3);
      var prot_auto = pattern.url.substr(0, pattern.url.indexOf("://")+3);
      pattern.url = pattern.url.replace(prot_auto, prot_user);
    }

    return {
      url: url,
      full_url: pattern.url,
      autocomplete: autocomplete,
      urlbar: urlbarCompleted,
      selectionStart: selectionStart,
      highlight: highlight,
      type: type
    };
  },
  
  stripTitle: function(pattern) {
    if (pattern.length < 3) return "";
    var title1 = pattern[1].title.split(" ").reverse();
    var title2 = pattern[2].title.split(" ").reverse();
    var wordCount = 0;
    for (; wordCount < title1.length && wordCount < title2.length &&
      title1[wordCount] == title2[wordCount]; wordCount++);
    for (var i = 3; i < pattern.length && i < 5; i++) {
      var refTitle = pattern[i].title.split(" ").reverse();
      for (var w = 0; w < refTitle.length && w < wordCount; w++) {
        if (refTitle[w] != title1[w]) {
          if (wordCount == 2) {
            return "";
          } else {
            wordCount -= 1;
            i = 2;
            continue;
          }
        }
      }
    }
    var found = title1.slice(0, wordCount);
    if (found.length < 2) {
      return "";
    } else {
      return found.reverse().join(" ");
    }
  },
  SQL: {
    _execute: function PIS__execute(conn, sql, params, columns, onRow) {
      var statement = conn.createAsyncStatement(sql);
      if(params){
          for(var key in params) {
            statement.params[key] = params[key];
          }
      }
      var onThen, 
        promiseMock = {
          then: function(func) {
            onThen = func;
          }
        };

      statement.executeAsync({
        handleCompletion: function(reason) {
          if(onThen) onThen();
        },

        handleError: function(error) {},

        handleResult: function(resultSet) {
          var row;
          while (row = resultSet.getNextRow()) {
            
            var result;
            if (columns != null) {
              
              if (columns.length == 1) {
                result = row.getResultByName(columns[0]);
              }
              
              else {
                result = {};
                for (var i = 0; i < columns.length; i++) {
                  var column = columns[i];
                  result[column] = row.getResultByName(column);
                }
              }
            }
            
            onRow(result);
          }
        }
      });
      return promiseMock;
    }
  },
  
  generalizeUrl: function(url, skipCorrection) {
    if (!url) {
      return "";
    }
    var val = url.toLowerCase();
    var cleanParts = CliqzUtils.cleanUrlProtocol(val, false).split('/'),
      host = cleanParts[0],
      pathLength = 0,
      SYMBOLS = /,|\./g;
    if (!skipCorrection) {
      if (cleanParts.length > 1) {
        pathLength = ('/' + cleanParts.slice(1).join('/')).length;
      }
      if (host.indexOf('www') === 0 && host.length > 4) {
        
        if (SYMBOLS.test(host[3]) && host[4] != ' ')
        
          val = val.substr(0, val.length - pathLength).replace(SYMBOLS, '.') +
          (pathLength ? val.substr(-pathLength) : '');
      }
    }
    url = CliqzUtils.cleanUrlProtocol(val, true);
    return url[url.length - 1] == '/' ? url.slice(0,-1) : url;
  },
  formatDate: function(date) {
    if (!date) {
      return "";
    }
    var now = (new Date).getTime();
    var diff = parseInt((now - date) / 1000);
    if (diff === 0) {
      return CliqzUtils.getLocalizedString("ago1Minute");
    }
    if (diff < 60) {
      return CliqzUtils.getLocalizedString("ago1Minute");
    }
    if (diff < 3600) {
      return CliqzUtils.getLocalizedString("agoXMinutes", parseInt(diff / 60));
    }
    if (diff < 3600 * 24) {
      return CliqzUtils.getLocalizedString("agoXHours", parseInt(diff / 3600));
    }
    return CliqzUtils.getLocalizedString("agoXDays", parseInt(diff / (3600 * 24)));
  },
  createInstantResult: function(res, searchString) {
    
    if(res.urls) {
      var instant = Result.generic('cliqz-pattern', res.url, null, res.title, null, searchString, res);
      instant.comment += " (history rules cluster!)"
      instant.data.template = "pattern-h2";

    } else {
      var results = res.filteredResults();
      var logExtra = '';

      if(results.length == 0)
        return null; 

      if (searchString.length == 0) {
        
        var instant = Result.generic('cliqz-pattern', "", null, "", null, searchString);
        instant.data.title = CliqzUtils.getLocalizedString("history_results_cluster")
        instant.data.url = results[0].url;
        instant.comment += " (history top sites)!";
        instant.data.template = "pattern-h1";
        instant.data.generic = true;
      
      
      
      
      } else if (res.cluster) {
        var domain = res.top_domain.indexOf(".") ? res.top_domain.split(".")[0] : res.top_domain;
        var instant = Result.generic('cliqz-pattern', results[0].url, null, results[0].title, null, searchString);
        var title = results[0].title;
        if(!title) {
          title = CliqzHistoryPattern.domainFromUrl(results[0].url).split(".")[0];
          title = title[0].toUpperCase() + title.substr(1);
        }
        instant.data.title = title;
        instant.data.url = results[0].url;
        instant.comment += " (history domain cluster)!";
        instant.data.template = "pattern-h2";
        results.shift();
      } else {
        var instant = Result.generic('cliqz-pattern', "", null, "", null, searchString);
        instant.data.title = CliqzUtils.getLocalizedString("history_results")
        instant.data.url = instant.val;
        instant.comment += " (history)!";
        instant.data.template = "pattern-h3";
        instant.data.generic = true;
      }

      instant.data.urls = [];
      for (var i = 0; i < results.length; i++) {
        var domain = CliqzHistoryPattern.generalizeUrl(results[i].url, true).split('/')[0],
            url = results[i].url;

        if (url[url.length - 1] == '/') url = url.substring(0, url.length - 1);

        var favicon = !res.cluster && (results[i].favicon == FF_DEF_FAVICON ? Q_DEF_FAVICON : results[i].favicon),
            cleanUrl = CliqzUtils.cleanUrlProtocol(CliqzHistoryPattern.simplifyUrl(url), true);

        instant.data.urls.push({
          href: results[i].url,
          link: cleanUrl,
          domain: cleanUrl.split("/")[0],
          vdate: CliqzHistoryPattern.formatDate(results[i].date),
          title: results[i].title,
          extra: "history-" + i,
          favicon: favicon,
          logo: CliqzUtils.getLogoDetails(CliqzUtils.getDetailsFromUrl(results[i].url))
        });
        if ((instant.data.urls.length > 9 && instant.data.template == "pattern-h1") ||
            (instant.data.urls.length > 5  && instant.data.template == "pattern-h2") ||
            (instant.data.urls.length > 2  && instant.data.template == "pattern-h3")) {
          break;
        }
      }
    }

    res.shown = instant.data.urls.length;
    return instant;
  },
  
  removeUrlFromResult: function(urlList, url) {
    var url = CliqzHistoryPattern.generalizeUrl(url);
    for(var key in urlList) {
      var r_url = CliqzHistoryPattern.generalizeUrl(urlList[key].href);
      if (r_url == url) {
        urlList.splice(key, 1);
        return;
      }
    }
  },
  
  historyTimeFrame: function(callback) {
    Cu.import('resource://gre/modules/PlacesUtils.jsm');
    var history = [];
    var min, max;
    this.SQL
      ._execute(
        PlacesUtils.history.QueryInterface(Ci.nsPIPlacesDatabase).DBConnection,
        "SELECT min(last_visit_date) as min_date, max(last_visit_date) as max_date FROM moz_places", null, ["min_date", "max_date"],
        function(result) {
          try {
            min = parseInt(result.min_date / 1000);
            max = parseInt(result.max_date / 1000);
          } catch (ex) {}
        }
      )
      .then(function() {
        callback(min, max);
      });
  },
  
  domainFromUrl: function(url, subdomain) {
    var urlparts = CliqzUtils.getDetailsFromUrl(url);
    return subdomain ? urlparts.host : urlparts.domain;
  }
}