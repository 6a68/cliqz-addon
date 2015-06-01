
'use strict';


const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CliqzHumanWeb'];

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");

Cu.import('resource://gre/modules/XPCOMUtils.jsm');


XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzAntiPhishing',
  'chrome://cliqzmodules/content/CliqzAntiPhishing.jsm');

var nsIAO = Components.interfaces.nsIHttpActivityObserver;
var nsIHttpChannel = Components.interfaces.nsIHttpChannel;

var refineFuncMappings ;

function md5cycle(x, k) {
    var a = x[0], b = x[1], c = x[2], d = x[3];

    a = ff(a, b, c, d, k[0], 7, -680876936);
    d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17,  606105819);
    b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897);
    d = ff(d, a, b, c, k[5], 12,  1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341);
    b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7,  1770035416);
    d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063);
    b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7,  1804603682);
    d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290);
    b = ff(b, c, d, a, k[15], 22,  1236535329);

    a = gg(a, b, c, d, k[1], 5, -165796510);
    d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14,  643717713);
    b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691);
    d = gg(d, a, b, c, k[10], 9,  38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335);
    b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5,  568446438);
    d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961);
    b = gg(b, c, d, a, k[8], 20,  1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467);
    d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14,  1735328473);
    b = gg(b, c, d, a, k[12], 20, -1926607734);

    a = hh(a, b, c, d, k[5], 4, -378558);
    d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16,  1839030562);
    b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060);
    d = hh(d, a, b, c, k[4], 11,  1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632);
    b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4,  681279174);
    d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979);
    b = hh(b, c, d, a, k[6], 23,  76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487);
    d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16,  530742520);
    b = hh(b, c, d, a, k[2], 23, -995338651);

    a = ii(a, b, c, d, k[0], 6, -198630844);
    d = ii(d, a, b, c, k[7], 10,  1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905);
    b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6,  1700485571);
    d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523);
    b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6,  1873313359);
    d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380);
    b = ii(b, c, d, a, k[13], 21,  1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070);
    d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15,  718787259);
    b = ii(b, c, d, a, k[9], 21, -343485551);

    x[0] = add32(a, x[0]);
    x[1] = add32(b, x[1]);
    x[2] = add32(c, x[2]);
    x[3] = add32(d, x[3]);

}

function cmn(q, a, b, x, s, t) {
    a = add32(add32(a, q), add32(x, t));
    return add32((a << s) | (a >>> (32 - s)), b);
}

function ff(a, b, c, d, x, s, t) {
    return cmn((b & c) | ((~b) & d), a, b, x, s, t);
}

function gg(a, b, c, d, x, s, t) {
    return cmn((b & d) | (c & (~d)), a, b, x, s, t);
}

function hh(a, b, c, d, x, s, t) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
}

function ii(a, b, c, d, x, s, t) {
    return cmn(c ^ (b | (~d)), a, b, x, s, t);
}

function md51(s) {
    var txt = '';
    var n = s.length;
    var state = [1732584193, -271733879, -1732584194, 271733878];
    var i;
    for (i=64; i<=s.length; i+=64) {
        md5cycle(state, md5blk(s.substring(i-64, i)));
    }
    s = s.substring(i-64);
    var tail = [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0];
    for (var i=0; i<s.length; i++)
        tail[i>>2] |= s.charCodeAt(i) << ((i%4) << 3);
        tail[i>>2] |= 0x80 << ((i%4) << 3);
        if (i > 55) {
            md5cycle(state, tail);
            for (i=0; i<16; i++) tail[i] = 0;
        }
    tail[14] = n*8;
    md5cycle(state, tail);
    return state;
}


function md5blk(s) { 
    var md5blks = [], i; 
        for (i=0; i<64; i+=4) {
        md5blks[i>>2] = s.charCodeAt(i)
        + (s.charCodeAt(i+1) << 8)
        + (s.charCodeAt(i+2) << 16)
        + (s.charCodeAt(i+3) << 24);
    }
    return md5blks;
}

var hex_chr = '0123456789abcdef'.split('');

function rhex(n)
{
    var s='', j=0;
    for(; j<4; j++)
        s += hex_chr[(n >> (j * 8 + 4)) & 0x0F]
        + hex_chr[(n >> (j * 8)) & 0x0F];
    return s;
}

function hex(x) {
    for (var i=0; i<x.length; i++)
        x[i] = rhex(x[i]);
    return x.join('');
}

function md5(s) {
    return hex(md51(s));
}



function add32(a, b) {
    return (a + b) & 0xFFFFFFFF;
}

var CliqzHumanWeb = {
    VERSION: '1.3',
    WAIT_TIME: 2000,
    LOG_KEY: 'humanweb',
    debug: false,
    httpCache: {},
    httpCache401: {},
    queryCache: {},
    privateCache: {},
    UrlsCache : {},
    strictMode: false,
    qs_len:30,
    rel_part_len:18,
    doubleFetchTimeInSec: 3600,
    can_urls: {},
    deadFiveMts: 5,
    deadTwentyMts: 20,
    msgType:'humanweb',
    userTransitions: {
        search: {}
    },
    searchEngines: [], 
    rArray: [], 
    extractRules: {}, 
    payloads: {}, 
    messageTemplate: {},
    idMappings: {},
    patternsURL: 'https://cdn.cliqz.com/human-web/patterns',
    configURL: 'https://safe-browsing.cliqz.com/config',
    searchCache: {},
    ts : "",
    mRefresh : {},
    ismRefresh : false,
    activityDistributor : Components.classes["@mozilla.org/network/http-activity-distributor;1"]
                               .getService(Components.interfaces.nsIHttpActivityDistributor),
    userTransitionsSearchSession: 5*60,
    key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
    q:   {
        name:   "queryKey",
        parser: /(?:^|&)([^&=]*)=?([^&]*)/g
    },
    parser: {
        strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
        loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
    },
    activeUsage : 0,
    activeUsageThreshold : 2,
    _md5: function(str) {
        return md5(str);
    },
    parseUri: function (str) {
        
        var m = null;
        var _uri = null;
        var i = null;
        var m   = CliqzHumanWeb.parser[CliqzHumanWeb.strictMode ? "strict" : "loose"].exec(str);
        var _uri = {};
        var i   = 14;

        while (i--) _uri[CliqzHumanWeb.key[i]] = m[i] || "";

        _uri[CliqzHumanWeb.q.name] = {};
        _uri[CliqzHumanWeb.key[12]].replace(CliqzHumanWeb.q.parser, function ($0, $1, $2) { if ($1) { _uri[CliqzHumanWeb.q.name][$1] = $2; }});
        return _uri;
    },
    maskURL: function(url){
        var url_parts = null;
        var masked_url = null;
        url_parts = CliqzHumanWeb.parseUri(url);

        if (CliqzHumanWeb.dropLongURL(url)) {
            
            if(url_parts['host'].indexOf('google') > 0){
                if(url_parts['queryKey']['url']){
                    masked_url = url_parts['queryKey']['url'];
                    masked_url = CliqzHumanWeb.maskURL(decodeURIComponent(''+masked_url));
                    return masked_url;
                }
            }
            masked_url = url_parts.protocol + "://"  + url_parts.authority + "/ (PROTECTED)" ;
            return masked_url;
        }
        return url;
    },
    getTime:function() {
        try { var ts = CliqzUtils.getPref('config_ts', null)} catch(ee){};
        if(!ts){
            var d = null;
            var m = null;
            var y = null;
            var h = null;
            var hr = null;
            var _ts = null;
            d = (new Date().getDate()  < 10 ? "0" : "" ) + new Date().getDate();
            m = (new Date().getMonth() < 10 ? "0" : "" ) + parseInt((new Date().getMonth()) + 1);
            h = (new Date().getUTCHours() < 10 ? "0" : "" ) + new Date().getUTCHours();
            y = new Date().getFullYear();
            _ts = y + "" + m + "" + d + "" + h;
        }
        else{
            h = (new Date().getUTCHours() < 10 ? "0" : "" ) + new Date().getUTCHours();
            _ts = ts + "" + h;
        }
        return _ts;
    },
    isSuspiciousURL: function(aURI) {
        var url_parts = {};
        var whitelist = ['google','yahoo','bing'];

        url_parts = CliqzHumanWeb.parseUri(aURI);

        
        
        if (url_parts.source.indexOf('about:') == 0){
            return true;
        }

        if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(url_parts.host)) {
            return true;
        }

        if (url_parts.user!="" || url_parts.password!="" ) {
            return true;
        }

        
        if (url_parts.port != "" & (url_parts.port!="80" || url_parts.port!="443")) {
            return true;
        }

        if ( url_parts.protocol != "http"  & url_parts.protocol!="https"  & url_parts.protocol != "") {
            return true;
        }

        if ( url_parts.source.indexOf('#') > -1 & CliqzHumanWeb.checkIfSearchURL(url_parts.source) != true) {
            if (CliqzHumanWeb.debug) CliqzUtils.log("Dropped because of # in url: " + decodeURIComponent(aURI)  , CliqzHumanWeb.LOG_KEY);
            return true;
        }

        if ( url_parts.host.indexOf('localhost') > -1){
            return true;
        }
    },
    dropLongURL: function(url){
        var url_parts = {};

        url_parts = CliqzHumanWeb.parseUri(url);
        if (url_parts.query.length > CliqzHumanWeb.qs_len) {
            return true;
        }


        var v = url_parts.relative.split(/[/._ -]/);
        for (let i=0; i<v.length; i++) {
            if (v[i].length > CliqzHumanWeb.rel_part_len) {
                return true;
            }
        }

        
        


    },
    cleanHttpCache: function() {
      for(var key in CliqzHumanWeb.httpCache) {
        if ((CliqzHumanWeb.counter - CliqzHumanWeb.httpCache[key]['time']) > 60*CliqzHumanWeb.tmult) {
          delete CliqzHumanWeb.httpCache[key];
        }
      }
      for(var key in CliqzHumanWeb.httpCache401) {
        if ((CliqzHumanWeb.counter - CliqzHumanWeb.httpCache401[key]['time']) > 60*CliqzHumanWeb.tmult) {
          delete CliqzHumanWeb.httpCache401[key];
        }
      }
    },
    getHeaders: function(strData) {
      
      var o = {};
      o['status'] = strData.split(" ")[1];

      var l = strData.split("\n");
      for(var i=0;i<l.length;i++) {
        if (l[i].indexOf('Location: ') == 0) {
          o['loc'] = decodeURIComponent(l[i].split(" ")[1].trim());
        }
        if (l[i].indexOf('WWW-Authenticate: ') == 0) {
          var tmp = l[i].split(" ");
          var tmp = tmp.slice(1, tmp.length).join(" ");
          o['auth'] = tmp;
        }
      }

      return o;
    },
    httpObserver: {
        
        observeActivity: function(aHttpChannel, aActivityType, aActivitySubtype, aTimestamp, aExtraSizeData, aExtraStringData) {

            try {
                var aChannel = aHttpChannel.QueryInterface(nsIHttpChannel);
                var url = decodeURIComponent(aChannel.URI.spec);
                var ho = CliqzHumanWeb.getHeaders(aExtraStringData);
                var status = ho['status'];
                var loc = ho['loc'];
                var httpauth = ho['auth'];



                if (status=='301' || status == '302') {
                    CliqzHumanWeb.httpCache[url] = {'status': status, 'time': CliqzHumanWeb.counter, 'location': loc};
                }

                else if (status=='401') {
                    CliqzHumanWeb.httpCache401[url] = {'time': CliqzHumanWeb.counter};
                }

                else if(status){
                    CliqzHumanWeb.httpCache[url] = {'status': status, 'time': CliqzHumanWeb.counter};
                }



              } catch(ee){if (CliqzHumanWeb && CliqzHumanWeb.debug)  CliqzUtils.log('observeActivity: ' + ee, CliqzHumanWeb.LOG_KEY)};
        }
    },
    
    historyTimeFrame: function(callback) {
        Cu.import('resource://gre/modules/PlacesUtils.jsm');
        var history = [];
        var min, max;

        var res = [];
        var st = PlacesUtils.history.QueryInterface(Ci.nsPIPlacesDatabase).DBConnection.createStatement("SELECT min(last_visit_date) as min_date, max(last_visit_date) as max_date FROM moz_places");

        var res = [];
        st.executeAsync({
            handleResult: function(aResultSet) {
                for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
                    res.push({"minDate": row.getResultByName("min_date"), "maxDate": row.getResultByName("max_date")});
                }
            },
            handleError: function(aError) {
                CliqzUtils.log("SQL error: " + aError.message, CliqzHumanWeb.LOG_KEY);
                callback(true);
            },
            handleCompletion: function(aReason) {
                if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED) {
                    CliqzUtils.log("SQL canceled or aborted", CliqzHumanWeb.LOG_KEY);
                    callback(null);
                }
                else {
                     try {
                        min = parseInt(res[0]['minDate'] / 1000);
                        max = parseInt(res[0]['maxDate'] / 1000);
                    } catch (ex) {}
                    callback(min, max);
                }
            }
        });
    },
    SQL: function(sql, onRow, callback, parameters) {
        var st = CliqzHumanWeb.dbConn.createAsyncStatement(sql);

        for(var key in parameters) {
            st.params[key] = parameters[key];
        }

    CliqzHumanWeb._SQL(CliqzHumanWeb.dbConn, st, onRow, callback);
  },
    _SQL: function(dbConn, statement, onRow, callback) {
        statement.executeAsync({
        onRow: onRow,
          callback: callback,
          handleResult: function(aResultSet) {
            var resultCount = 0;
            for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
              resultCount++;
              if (this.onRow) {
                this.onRow(statement.row);
              }
            }
            if (this.callback) {
              this.callback(resultCount);
            }
          },

          handleError: function(aError) {
            CliqzUtils.log("Error (" + aError.result + "):" + aError.message, CliqzHumanWeb.LOG_KEY);
            if (this.callback) {
              this.callback(0);
            }
          },
          handleCompletion: function(aReason) {
            
          }
        });
        statement.finalize();
    },
    deleteVisit: function(url) {
        CliqzHumanWeb.SQL("delete from usafe where url = :url", null, null, {
            url: CliqzHumanWeb.escapeSQL(url)
        });
    },
    deleteTimeFrame: function() {
        CliqzHumanWeb.historyTimeFrame(function(min, max) {
        CliqzHumanWeb.SQL("delete from usafe where last_visit < :min", null, null, {
            min: min
        });
        CliqzHumanWeb.SQL("delete from usafe where last_visit > :max", null, null, {
            max: max
        });
    });
  },
    clearHistory: function() {
        CliqzHumanWeb.SQL("delete from usafe");
    },
    historyObserver: {
        onBeginUpdateBatch: function() {},
        onEndUpdateBatch: function() {
          CliqzHumanWeb.deleteTimeFrame();
        },
        onVisit: function(aURI, aVisitID, aTime, aSessionID, aReferringID, aTransitionType) {},
        onTitleChanged: function(aURI, aPageTitle) {},
        onBeforeDeleteURI: function(aURI) {},
        onDeleteURI: function(aURI) {
          CliqzHumanWeb.deleteVisit(aURI.spec);
        },
        onClearHistory: function() {
          CliqzHumanWeb.clearHistory();
        },
        onPageChanged: function(aURI, aWhat, aValue) {},
        onDeleteVisits: function() {},
        QueryInterface: XPCOMUtils.generateQI([Ci.nsINavHistoryObserver])
      },
    linkCache: {},
    cleanLinkCache: function() {
      for(var key in CliqzHumanWeb.linkCache) {
        if ((CliqzHumanWeb.counter - CliqzHumanWeb.linkCache[key]['time']) > 30*CliqzHumanWeb.tmult) {
          delete CliqzHumanWeb.linkCache[key];
        }
      }
    },
    getRedirects: function(url, res) {
        var res = res || []
        for(var key in CliqzHumanWeb.httpCache) {
            if(CliqzHumanWeb.httpCache[key]){
                if (CliqzHumanWeb.httpCache[key]['location']!=null && (CliqzHumanWeb.httpCache[key]['status']=='301' || CliqzHumanWeb.httpCache[key]['status']=='302')) {
                    if (CliqzHumanWeb.httpCache[key]['location']==url || decodeURIComponent(CliqzHumanWeb.httpCache[key]['location']) == url) {
                        res.unshift(key)
                        CliqzHumanWeb.getRedirects(key, res);
                    }
                }
            }
        }
        return res;
    },
    checkIfSearchURL:function(activeURL) {
        var requery = /\.google\..*?[#?&;]q=[^$&]+/; 
        var yrequery = /.search.yahoo\..*?[#?&;]p=[^$&]+/; 
        var brequery = /\.bing\..*?[#?&;]q=[^$&]+/; 
        var reref = /\.google\..*?\/(?:url|aclk)\?/; 
        var rerefurl = /url=(.+?)&/; 
        if ((requery.test(activeURL) || yrequery.test(activeURL) || brequery.test(activeURL) ) && !reref.test(activeURL)){
            return true;
        }
        else{
            return false;
        }


    },
    userSearchTransition: function(rq){
        
        if (rq!=null) {
            var source = rq['qurl'];
            var query = rq['q'].replace(/\s+/g, " ").trim().toLowerCase();

            if (source && query && query.length>0) {
                
                

                if (CliqzHumanWeb.userTransitions['search'][query] == null) {
                    CliqzHumanWeb.userTransitions['search'][query] = {'time': CliqzHumanWeb.counter, 'data': []}
                }
                CliqzHumanWeb.userTransitions['search'][query]['data'].push([source, CliqzHumanWeb.counter - CliqzHumanWeb.userTransitions['search'][query]['time']]);
                }
            }

    },
    getParametersQS: function(url) {
        var res = {};
        var KeysValues = url.split(/[\?&]+/);
        for (var i = 0; i < KeysValues.length; i++) {
            var kv = KeysValues[i].split("=");
            if (kv.length==2) res[kv[0]] = kv[1];
        }
        return res;
    },
    getEmbeddedURL: function(targetURL) {
        var ihttps = targetURL.lastIndexOf('https://')
        var ihttp = targetURL.lastIndexOf('http://')
        if (ihttps>0 || ihttp>0) {
            
            var parqs = CliqzHumanWeb.getParametersQS(targetURL);
            if (parqs['url']) {
                return decodeURIComponent(parqs['url']);
            }
        }
        else return null;
    },
    auxIsAlive: function() {
        return true;
    },
    auxGetPageData: function(url, onsuccess, onerror) {

        var error_message = null;

        var req = Components.classes['@mozilla.org/xmlextras/xmlhttprequest;1'].createInstance();
        req.open('GET', url, true);
        req.overrideMimeType('text/html');
        req.channel.loadFlags |= Ci.nsIRequest.LOAD_ANONYMOUS;
        
        

        
        

        req.onload = function(){

            
            


            
            
            
            
            


            
                
                
                if (req.responseURL != url) {
                    if (decodeURI(decodeURI(req.responseURL)) != decodeURI(decodeURI(url))) {
                        error_message = 'dangerous redirect';
                        if (CliqzHumanWeb.debug) CliqzUtils.log("Error on doublefetch: " + error_message, CliqzHumanWeb.LOG_KEY);
                        if (CliqzHumanWeb.debug) CliqzUtils.log("DANGER: " + url + ' ' + req.responseURL , CliqzHumanWeb.LOG_KEY);
                        
                        onerror(error_message);
                        return;
                    }
                }

                var document = Services.appShell.hiddenDOMWindow.document;
                var doc = document.implementation.createHTMLDocument("example");
                doc.documentElement.innerHTML = req.responseText;

                var x = CliqzHumanWeb.getPageData(url, doc);
                var st_code = '' + req.status;

                onsuccess(st_code,x);

            
        }

        req.onerror = function() {
            onerror(error_message);
        }
        req.ontimeout = function() {
            error_message = 'timeout';
            if (CliqzHumanWeb.debug) CliqzUtils.log("Error on doublefetch: " + error_message, CliqzHumanWeb.LOG_KEY);
            req.onerror();
        }

        req.timeout = 10000;
        req.send(null);


    },
    auxIntersection: function(a, b) {
        var ai=0, bi=0;
        var result = new Array();
        while( ai < a.length && bi < b.length ) {
            if      (a[ai] < b[bi] ){ ai++; }
            else if (a[ai] > b[bi] ){ bi++; }
            else {
                result.push(a[ai]);
                ai++;
                bi++;
            }
        }
        return result;
    },
    auxUnion: function(a, b) {
        var h = {};
        for (var i = a.length-1; i >= 0; -- i) h[a[i]] = a[i];
        for (var i = b.length-1; i >= 0; -- i) h[b[i]] = b[i];
        var res = [];
        for (var k in h) {
            if (h.hasOwnProperty(k)) res.push(h[k]);
        }
        return res;
    },
    validDoubleFetch: function(stcode_bef, stcode_aft, struct_bef, struct_aft) {
        
        


        if (CliqzHumanWeb.debug) {
            CliqzUtils.log("xbef: " + JSON.stringify(struct_bef), CliqzHumanWeb.LOG_KEY);
            CliqzUtils.log("xaft: " + JSON.stringify(struct_aft), CliqzHumanWeb.LOG_KEY);
            CliqzUtils.log("stcodeb: " + stcode_bef, CliqzHumanWeb.LOG_KEY);
            CliqzUtils.log("stcodea: " + stcode_aft, CliqzHumanWeb.LOG_KEY);
        }



        

        if(stcode_bef && stcode_aft){
            if ((stcode_bef.trim() != stcode_aft.trim())) {
                if (CliqzHumanWeb.debug) CliqzUtils.log("fovalidDoubleFetch: mismatch status code", CliqzHumanWeb.LOG_KEY);
                return false;
            }
        }
        else if(stcode_aft != '200' && stcode_aft != '0' ) {
            return false;
        }

        

        if (!(struct_bef['t'] && struct_aft['t'])) {
            if (CliqzHumanWeb.debug) CliqzUtils.log("fovalidDoubleFetch: found an empty title", CliqzHumanWeb.LOG_KEY);
            return false;
        }


        
        if (!(struct_bef['iall'] && struct_aft['iall'])) {
            if (CliqzHumanWeb.debug) CliqzUtils.log("fovalidDoubleFetch: found a noindex", CliqzHumanWeb.LOG_KEY);
            return false;
        }


        
        var ratio_lh = (struct_bef['lh'] || 0) / ((struct_bef['lh'] || 0) + (struct_aft['lh'] || 0));
        if ((struct_bef['lh'] || 0) > 10*1024) {
            var ratio_lh = (struct_bef['lh'] || 0) / ((struct_bef['lh'] || 0) + (struct_aft['lh'] || 0));
            if (ratio_lh < 0.10 || ratio_lh > 0.90) {
                if (CliqzHumanWeb.debug) CliqzUtils.log("fovalidDoubleFetch: lh is not balanced", CliqzHumanWeb.LOG_KEY);
                return false;
            }
        }

        
        var ratio_nl = (struct_bef['nl'] || 0) / ((struct_bef['nl'] || 0) + (struct_aft['nl'] || 0));
        if ((struct_bef['lh'] || 0) > 30) {
            var ratio_nl = (struct_bef['nl'] || 0) / ((struct_bef['nl'] || 0) + (struct_aft['nl'] || 0));
            if (ratio_nl < 0.10 || ratio_nl > 0.90) {
                if (CliqzHumanWeb.debug) CliqzUtils.log("fovalidDoubleFetch: nl is not balanced", CliqzHumanWeb.LOG_KEY);
                return false;
            }
        }

        
        var t1 = struct_bef['t'] || '';
        var t2 = struct_aft['t'] || '';
        var jc = 1.0;

        if (t1!=t2) {

            var vt1 = t1.split(' ').filter(function(el) {return el.length>1});
            var vt2 = t2.split(' ').filter(function(el) {return el.length>1});

            jc = CliqzHumanWeb.auxIntersection(vt1,vt2).length / CliqzHumanWeb.auxUnion(vt1,vt2).length;

            if (Math.max(vt1.length, vt2.length) <= 4) {
                
                if (jc >= 0.5) return true;
                else return false;
            }
            else {
                
                if (jc <= 0.5) {
                    

                    var tt1 = t1.replace(/[^A-Za-z 0-9 \.,\?""!@#\$%\^&\*\(\)-_=\+;:<>\/\\\|\}\{\[\]`~]*/g, '');
                    var tt2 = t2.replace(/[^A-Za-z 0-9 \.,\?""!@#\$%\^&\*\(\)-_=\+;:<>\/\\\|\}\{\[\]`~]*/g, '');

                    if ((tt1.length > t1.length*0.5) && ((tt2.length > t2.length*0.5))) {
                        
                        var vtt1 = tt1.split(' ').filter(function(el) {return el.length>1});
                        var vtt2 = tt2.split(' ').filter(function(el) {return el.length>1});
                        jc = CliqzHumanWeb.auxIntersection(vtt1,vtt2).length / CliqzHumanWeb.auxUnion(vtt1,vtt2).length;
                        
                        if (jc <= 0.80) {
                            if (CliqzHumanWeb.debug) CliqzUtils.log("validDoubleFetch: fail title overlap after ascii", CliqzHumanWeb.LOG_KEY);
                            return false;
                        }
                    }
                    else {
                      if (CliqzHumanWeb.debug) CliqzUtils.log("validDoubleFetch: fail title overlap", CliqzHumanWeb.LOG_KEY);
                      return false;
                    }
                }

                
                
                

                
                if ((struct_bef['nip'] == null || struct_aft['nip'] == null) || (struct_bef['nip'] == 0 && struct_aft['nip'] != 0)) {
                    if (CliqzHumanWeb.debug) CliqzUtils.log("validDoubleFetch: fail nip", CliqzHumanWeb.LOG_KEY);
                    return false;
                }

                
                if ((struct_bef['nf'] == null || struct_aft['nf'] == null) || (struct_bef['nf'] == 0 && struct_aft['nf'] != 0)) {
                    if (CliqzHumanWeb.debug) CliqzUtils.log("validDoubleFetch: fail text nf", CliqzHumanWeb.LOG_KEY);
                    return false;
                }

                return true;
            }
        }
        else {
            
            return true;
        }

        return false;

    },
    doubleFetch: function(url, page_doc) {

        
        

        var isok = true;

        if (page_doc['x'] == null) {
            
            
            
            isok = false
        }

        else {
            if (page_doc['x']['iall'] == false) {
                
                isok = false;
            }
        }

        if (CliqzHumanWeb.dropLongURL(url)) {

            if (page_doc['x'] && page_doc['x']['canonical_url']) {
                
                if (CliqzHumanWeb.dropLongURL(page_doc['x']['canonical_url'])) {
                    
                    isok = false;
                }
                else {
                    
                    
                    isok = true;
                }
            }
            else {
                if(page_doc['isMU']){
                    isok = true;
                }
                else{
                    isok = false;
                }
            }
        }

        if (isok) {


            CliqzHumanWeb.auxGetPageData(url, function(st_code, data) {

                if (CliqzHumanWeb.debug) CliqzUtils.log("success on doubleFetch, need further validation" + url, CliqzHumanWeb.LOG_KEY);

                if (CliqzHumanWeb.validDoubleFetch(page_doc['st'], st_code, page_doc['x'], data)) {
                    if (CliqzHumanWeb.debug) CliqzUtils.log("success on doubleFetch, need further validation" + url, CliqzHumanWeb.LOG_KEY);
                    CliqzHumanWeb.setAsPublic(url);
                    
                    
                    
                    
                    if (CliqzHumanWeb.dropLongURL(url)) {
                        if(page_doc['x']['canonical_url']){
                            page_doc['url'] = page_doc['x']['canonical_url'];
                        }
                    }
                    page_doc['x'] = data;
                    if(page_doc['isMU']){
                        
                        var payload = {};
                        payload['reason'] = page_doc['isMU'];
                        payload['qurl'] = url;
                        try {var location = CliqzUtils.getPref('config_location', null)} catch(ee){};
                        payload['ctry'] = location;

                        CliqzHumanWeb.telemetry({'type': CliqzHumanWeb.msgType, 'action': 'suspiciousUrl', 'payload': payload});

                        
                        
                        

                        
                        

                        if (!CliqzHumanWeb.dropLongURL(url)) {
                            CliqzHumanWeb.telemetry({'type': CliqzHumanWeb.msgType, 'action': 'page', 'payload': page_doc});
                         }
                        else{
                           if(page_doc['x']['canonical_url']){
                                page_doc['url'] = page_doc['x']['canonical_url'];
                                CliqzHumanWeb.telemetry({'type': CliqzHumanWeb.msgType, 'action': 'page', 'payload': page_doc});

                            }
                        }
                        
                        

                    }
                    else{
                        CliqzHumanWeb.telemetry({'type': CliqzHumanWeb.msgType, 'action': 'page', 'payload': page_doc});
                    }
                }
                else {
                    if (CliqzHumanWeb.debug) CliqzUtils.log("failure on doubleFetch! " + "structure did not match" + url, CliqzHumanWeb.LOG_KEY);
                    CliqzHumanWeb.setAsPrivate(url);
                }
            },
            function(error_message) {
                if (CliqzHumanWeb.debug) CliqzUtils.log("failure on doubleFetch! " + error_message, CliqzHumanWeb.LOG_KEY);
                CliqzHumanWeb.setAsPrivate(url);
            });

        }
        else {
            if (CliqzHumanWeb.debug) CliqzUtils.log("doubleFetch refused to process this url: " + url, CliqzHumanWeb.LOG_KEY);
            CliqzHumanWeb.setAsPrivate(url);
        }

    },
    getMetaRefresh: function(cd, url){
        var metas = null;
        var redURL = null;
        var title = null;
        try{redURL = cd.split('URL=')[1].split('>')[0].replace('"','').replace("'","")}catch(ee){};
        CliqzHumanWeb.httpCache[url] = {'status': '301', 'time': CliqzHumanWeb.counter, 'location': redURL};

        
        if(url.indexOf('r.search.yahoo.com') > -1){
            try{var _url = CliqzHumanWeb.linkCache[decodeURIComponent(url)]['s']}catch(ee){var _url = url}
            CliqzHumanWeb.linkCache[decodeURIComponent(redURL.replace("'",""))] = {'s': ''+_url, 'time': CliqzHumanWeb.counter};
        }
        return redURL;

    },
    eventDoorWayPage: function(cd){
        var payload = {};
        var url = cd.location.href;
        var doorwayURL = cd.getElementsByTagName('a')[0].href;
        try {var location = CliqzUtils.getPref('config_location', null)} catch(ee){};
        var orignalDomain = CliqzHumanWeb.parseUri(url).host;
        var dDomain = CliqzHumanWeb.parseUri(doorwayURL).host;
        if(orignalDomain == dDomain) return;
        payload = {"url":url, "durl":doorwayURL,"ctry": location};
        CliqzHumanWeb.telemetry({'type': CliqzHumanWeb.msgType, 'action': 'doorwaypage', 'payload': payload});

    },
    getPageData: function(url, cd) {

        var len_html = null;
        var len_text = null;
        var title = null;
        var numlinks = null;
        var inputs = null;
        var inputs_nh = null;
        var inputs_pwd = null;
        var forms = null;
        var pg_l = null;
        var metas = null;
        var tag_html = null;
        var iall = true;
        var all = null;
        var canonical_url = null;

        try { len_html = cd.documentElement.innerHTML.length; } catch(ee) {}
        try { len_text = cd.documentElement.textContent.length; } catch(ee) {}
        try { title = cd.getElementsByTagName('title')[0].textContent; } catch(ee) {}
        

        try { numlinks = cd.getElementsByTagName('a').length; } catch(ee) {}
        try {
            inputs = cd.getElementsByTagName('input') || [];
            inputs_nh = 0;
            inputs_pwd = 0;
            for(var i=0;i<inputs.length;i++) {
                if (inputs[i]['type'] && inputs[i]['type']!='hidden') inputs_nh+=1;
                if (inputs[i]['type'] && inputs[i]['type']=='password') inputs_pwd+=1;
            }
        } catch(ee) {}

        try { forms = cd.getElementsByTagName('form'); } catch(ee) {}

        
        
        if(numlinks == 1 && cd.location){
            CliqzHumanWeb.eventDoorWayPage(cd);
        }

        var metas = cd.getElementsByTagName('meta');

        
        try {
            for (let i=0;i<metas.length;i++) {if (metas[i].getAttribute("http-equiv") == "content-language" || metas[i].getAttribute("name") == "language") {
                pg_l = metas[i].getAttribute("content");
            }};

            if (pg_l == null) {
                tag_html = cd.getElementsByTagName('html');
                pg_l = tag_html[0].getAttribute("lang");
            };
        }catch(ee){}


        
        try {
            for (let i=0;i<metas.length;i++) {
                var cnt = metas[i].getAttribute('content');
                if (cnt!=null && cnt.indexOf('noindex') > -1) {
                    iall = false;
                }
            }
        }catch(ee){}

        
        var link_tag = cd.getElementsByTagName('link');
        for (var j=0;j<link_tag.length;j++) {
            if (link_tag[j].getAttribute("rel") == "canonical") canonical_url = link_tag[j].href;
        }


        if (canonical_url != null && canonical_url.length > 0) {
            
            if (canonical_url[0] == '/') {
                var ourl = CliqzHumanWeb.parseURL(url);
                
                canonical_url = ourl['protocol'] + '://' + ourl['hostname'] + canonical_url;
            }
        }

        
        try {var location = CliqzUtils.getPref('config_location', null)} catch(ee){}


        var x = {'lh': len_html, 'lt': len_text, 't': title, 'nl': numlinks, 'ni': (inputs || []).length, 'ninh': inputs_nh, 'nip': inputs_pwd, 'nf': (forms || []).length, 'pagel' : pg_l , 'ctry' : location, 'iall': iall, 'canonical_url': canonical_url };
        
        return x;
    },
    getCDByURL: function(url) {


        var dd_url = url;

        try {
            dd_url = decodeURI(decodeURI(url));
        } catch(ee) {}

        for (var j = 0; j < CliqzHumanWeb.windowsRef.length; j++) {
            var gBrowser = CliqzHumanWeb.windowsRef[j].gBrowser;
            if (gBrowser.tabContainer) {
                var numTabs = gBrowser.tabContainer.childNodes.length;
                for (var i=0; i<numTabs; i++) {
                    var currentTab = gBrowser.tabContainer.childNodes[i];
                    var currentBrowser = gBrowser.getBrowserForTab(currentTab);
                    var currURL=''+currentBrowser.contentDocument.location;

                    if (CliqzHumanWeb.debug) {
                        CliqzUtils.log("getCDByURL: " + (currURL==''+url) + " >> " + url + " " + currURL, CliqzHumanWeb.LOG_KEY);
                    }

                    if (currURL==''+url) {
                        return currentBrowser.contentDocument;
                    }
                    else {
                        
                        
                        
                        try {
                            if (decodeURI(decodeURI(currURL))==dd_url) return currentBrowser.contentDocument;
                        }
                        catch(ee) {}
                    }
                }
            }
        }

        return null;
    },
    listener: {
        tmpURL: undefined,
        QueryInterface: XPCOMUtils.generateQI(["nsIWebProgressListener", "nsISupportsWeakReference"]),

        onLocationChange: function(aProgress, aRequest, aURI) {
            


            if (aURI.spec == this.tmpURL) return;
            this.tmpURL = aURI.spec;

            if (CliqzHumanWeb.ismRefresh){
                try{
                    var tabID = CliqzHumanWeb.getTabID();
                    if(tabID){
                        var mrefreshUrl = CliqzHumanWeb.mRefresh[tabID];
                        var parentRef = CliqzHumanWeb.linkCache[mrefreshUrl]['s']
                        CliqzHumanWeb.linkCache[decodeURIComponent(aURI.spec)] = {'s': ''+mrefreshUrl, 'time': CliqzHumanWeb.counter};
                        CliqzHumanWeb.state['v'][mrefreshUrl]['qr'] = CliqzHumanWeb.state['v'][parentRef]['qr'];
                        if(CliqzHumanWeb.state['v'][mrefreshUrl]['qr']){
                            
                            CliqzHumanWeb.state['v'][mrefreshUrl]['qr']['t'] = 'gad';
                        }
                        CliqzHumanWeb.ismRefresh = false;
                        delete CliqzHumanWeb.mRefresh[tabID];
                    }
                }
                catch(ee){};
            }


            
            var requery = /\.google\..*?[#?&;]q=[^$&]+/; 
            var yrequery = /.search.yahoo\..*?[#?&;]p=[^$&]+/; 
            var brequery = /\.bing\..*?[#?&;]q=[^$&]+/; 
            var reref = /\.google\..*?\/(?:url|aclk)\?/; 
            var rerefurl = /url=(.+?)&/; 
            var gadurl = /\.google..*?\/(aclk)\?/;
            var currwin = CliqzUtils.getWindow();
            var _currURL = '' + currwin.gBrowser.selectedBrowser.contentDocument.location;


            
            if(_currURL.indexOf('t.co/') > -1){
                CliqzUtils.httpGet(_currURL,
                function(res){
                    if(res && res.response){
                        try {
                         var _metaCD = res.response;

                         var redURL = CliqzHumanWeb.getMetaRefresh(_metaCD,_currURL );
                        } catch(e){}
                    }
                }, null, 2000);
            }
            else if(_currURL.indexOf('r.search.yahoo.com') > -1){
                CliqzUtils.httpGet(_currURL,
                function(res){
                    if(res && res.response){
                        try {
                         var _metaCD = res.response;
                         var redURL = CliqzHumanWeb.getMetaRefresh(_metaCD,_currURL );
                        } catch(e){}
                    }
                }, null, 2000);
            }
            else if(gadurl.test(_currURL)){
                var tabID = CliqzHumanWeb.getTabID();
                if(tabID){
                    CliqzHumanWeb.ismRefresh = true;
                    CliqzHumanWeb.mRefresh[tabID] = decodeURIComponent(_currURL);
                }
            }

            CliqzHumanWeb.lastActive = CliqzHumanWeb.counter;
            CliqzHumanWeb.lastActiveAll = CliqzHumanWeb.counter;

            var activeURL = CliqzHumanWeb.currentURL();
            
            if (CliqzHumanWeb.isSuspiciousURL(activeURL)) return;



            if (activeURL.indexOf('about:')!=0) {
                if (CliqzHumanWeb.state['v'][activeURL] == null) {
                    

                    CliqzAntiPhishing.auxOnPageLoad(activeURL);

                    var se = CliqzHumanWeb.checkSearchURL(activeURL);
                    if (se > -1){
                        currwin.setTimeout(function(currURLAtTime) {

                            
                            if (CliqzHumanWeb) {
                                try {

                                    

                                    var activeURL = CliqzHumanWeb.currentURL();
                                    var document = null;
                                    var searchURL = null;

                                    if (currURLAtTime == activeURL) {
                                        document = currwin.gBrowser.selectedBrowser.contentDocument;
                                        searchURL = activeURL;
                                    }
                                    else{
                                        document = CliqzHumanWeb.getCDByURL(currURLAtTime);
                                        searchURL = currURLAtTime;

                                    }


                                    CliqzHumanWeb.checkURL(document);
                                    CliqzHumanWeb.queryCache[searchURL] = {'d': 0, 'q': CliqzHumanWeb.searchCache[se]['q'], 't': CliqzHumanWeb.searchCache[se]['t']};
                                }
                                catch(ee) {
                                    
                                    if (CliqzHumanWeb.debug) {
                                        CliqzUtils.log('Exception: ' + ee, CliqzHumanWeb.LOG_KEY);
                                    }
                                }
                            }

                        }, CliqzHumanWeb.WAIT_TIME, activeURL);
                    }

                    var status = null;

                    if (CliqzHumanWeb.httpCache[activeURL]!=null) {
                        status = CliqzHumanWeb.httpCache[activeURL]['status'];
                    }

                    var referral = null;
                    var qreferral = null;


                    if (CliqzHumanWeb.linkCache[activeURL] != null) {
                        
                        referral = CliqzHumanWeb.linkCache[activeURL]['s'];
                    }


                    
                    var red = [];
                    red = CliqzHumanWeb.getRedirects(activeURL, red);
                    if(red.length == 0){
                        red = null;
                    }
                    
                    if (red && referral == null) {
                            var redURL = red[0];
                            var refURL = CliqzHumanWeb.linkCache[redURL];
                            if(refURL){
                                referral = refURL['s'];
                            }

                            

                            if (CliqzHumanWeb.queryCache[redURL]) {
                                CliqzHumanWeb.queryCache[activeURL] = CliqzHumanWeb.queryCache[redURL];
                            }
                    }


                    CliqzHumanWeb.state['v'][activeURL] = {'url': activeURL, 'a': 0, 'x': null, 'tin': new Date().getTime(),
                            'e': {'cp': 0, 'mm': 0, 'kp': 0, 'sc': 0, 'md': 0}, 'st': status, 'c': [], 'ref': referral, 'red':red};

                    if (referral) {
                        
                        if (CliqzHumanWeb.state['v'][referral] && CliqzHumanWeb.state['v'][referral]['qr']) {
                            CliqzHumanWeb.state['v'][activeURL]['qr'] = {}
                            CliqzHumanWeb.state['v'][activeURL]['qr']['q'] = CliqzHumanWeb.state['v'][referral]['qr']['q'];
                            CliqzHumanWeb.state['v'][activeURL]['qr']['t'] = CliqzHumanWeb.state['v'][referral]['qr']['t'];
                            CliqzHumanWeb.state['v'][activeURL]['qr']['d'] = CliqzHumanWeb.state['v'][referral]['qr']['d']+1;

                           
                            
                            if(CliqzHumanWeb.state['v'][activeURL]['qr']['d'] > 2){
                                delete CliqzHumanWeb.state['v'][activeURL]['qr'];
                            }
                            else if(CliqzHumanWeb.state['v'][activeURL]['qr']['d'] == 2){
                                if(CliqzHumanWeb.parseUri(activeURL)['host'] != CliqzHumanWeb.parseUri(referral)['host']){
                                    delete CliqzHumanWeb.state['v'][activeURL]['qr'];
                                }
                            }
                        }
                    }

                    currwin.setTimeout(function(currWin, currURL) {

                        
                        
                        

                        try {

                            
                            
                            
                            
                            
                            




                            var cd = CliqzHumanWeb.getCDByURL(currURL);
                            if (cd==null) {
                                if (CliqzHumanWeb.debug) {
                                    CliqzUtils.log("CANNOT GET THE CONTENT OF : " + currURL, CliqzHumanWeb.LOG_KEY);
                                }
                                return;
                            }

                            

                            var se = CliqzHumanWeb.checkSearchURL(currURL);


                            if (se == -1){
                                CliqzHumanWeb.checkURL(cd);
                                
                                CliqzHumanWeb.activeUsage += 1;

                            }

                            var x = CliqzHumanWeb.getPageData(currURL, cd);

                            if (x['canonical_url']) {
                                CliqzHumanWeb.can_urls[currURL] = x['canonical_url'];
                            }

                            if (CliqzHumanWeb.state['v'][currURL] != null) {
                                CliqzHumanWeb.state['v'][currURL]['x'] = x;
                            }

                            if (CliqzHumanWeb.queryCache[currURL]) {
                                CliqzHumanWeb.state['v'][currURL]['qr'] = CliqzHumanWeb.queryCache[currURL];
                                delete CliqzHumanWeb.queryCache[currURL];
                            }

                            if (CliqzHumanWeb.state['v'][currURL] != null) {
                                CliqzHumanWeb.addURLtoDB(currURL, CliqzHumanWeb.state['v'][currURL]['ref'], CliqzHumanWeb.state['v'][currURL]);
                                CliqzHumanWeb.queryCache[currURL];
                            }

                        } catch(ee) {
                            if (CliqzHumanWeb.debug) {
                                CliqzUtils.log("Error fetching title and length of page: " + ee, CliqzHumanWeb.LOG_KEY);
                            }
                        }

                    }, CliqzHumanWeb.WAIT_TIME, currwin, activeURL);

                }
                else {
                    
                    
                    CliqzHumanWeb.state['v'][activeURL]['tend'] = null;
                }

                
                currwin.gBrowser.selectedBrowser.contentDocument.addEventListener("keypress", CliqzHumanWeb.captureKeyPressPage);
                currwin.gBrowser.selectedBrowser.contentDocument.addEventListener("mousemove", CliqzHumanWeb.captureMouseMovePage);
                currwin.gBrowser.selectedBrowser.contentDocument.addEventListener("mousedown", CliqzHumanWeb.captureMouseClickPage);
                currwin.gBrowser.selectedBrowser.contentDocument.addEventListener("scroll", CliqzHumanWeb.captureScrollPage);
                currwin.gBrowser.selectedBrowser.contentDocument.addEventListener("copy", CliqzHumanWeb.captureCopyPage);

            }
        },
        onStateChange: function(aWebProgress, aRequest, aFlag, aStatus) {
            
        }
    },
    pacemaker: function() {

        var activeURL = CliqzHumanWeb.currentURL();

        if (activeURL && (activeURL).indexOf('about:')!=0) {
            if ((CliqzHumanWeb.counter - CliqzHumanWeb.lastActive) < 5*CliqzHumanWeb.tmult) {
                
                
                
                try {
                    CliqzHumanWeb.state['v'][activeURL]['a'] += 1;
                } catch(ee) {}
            }
        }


        if ((activeURL==null) && ((CliqzHumanWeb.counter/CliqzHumanWeb.tmult) % 10 == 0)) {
            
            CliqzHumanWeb.pushAllData();
        }



        if ((CliqzHumanWeb.counter/CliqzHumanWeb.tmult) % 1 == 0) {

            var openPages = CliqzHumanWeb.getAllOpenPages();
            var tt = new Date().getTime();

            for (var url in CliqzHumanWeb.state['v']) {
                if (CliqzHumanWeb.state['v'].hasOwnProperty(url)) {

                    if (openPages.indexOf(url)==-1) {
                        

                        if (CliqzHumanWeb.state['v'][url]['tend']==null) {
                            CliqzHumanWeb.state['v'][url]['tend'] = tt;
                        }

                        if ((tt - CliqzHumanWeb.state['v'][url]['tend']) > CliqzHumanWeb.deadFiveMts*60*1000) {
                            
                            CliqzHumanWeb.state['m'].push(CliqzHumanWeb.state['v'][url]);
                            CliqzHumanWeb.addURLtoDB(url, CliqzHumanWeb.state['v'][url]['ref'], CliqzHumanWeb.state['v'][url]);
                            delete CliqzHumanWeb.state['v'][url];
                            delete CliqzHumanWeb.queryCache[url];
                        }
                    }
                    else {
                        
                        if ((tt - CliqzHumanWeb.state['v'][url]['tin']) > CliqzHumanWeb.deadTwentyMts*60*1000) {
                            

                            CliqzHumanWeb.state['v'][url]['tend'] = null;
                            CliqzHumanWeb.state['v'][url]['too_long'] = true;
                            CliqzHumanWeb.state['m'].push(CliqzHumanWeb.state['v'][url]);
                            CliqzHumanWeb.addURLtoDB(url, CliqzHumanWeb.state['v'][url]['ref'], CliqzHumanWeb.state['v'][url]);
                            delete CliqzHumanWeb.state['v'][url];
                            delete CliqzHumanWeb.queryCache[url];
                            
                            

                        }
                    }
                }
            }
        }

        if ((CliqzHumanWeb.counter/CliqzHumanWeb.tmult) % 10 == 0) {
            if (CliqzHumanWeb.debug) {
                CliqzUtils.log('Pacemaker: ' + CliqzHumanWeb.counter/CliqzHumanWeb.tmult + ' ' + activeURL + ' >> ' + CliqzHumanWeb.state.id, CliqzHumanWeb.LOG_KEY);
            }
            CliqzHumanWeb.cleanHttpCache();
            CliqzHumanWeb.cleanLinkCache();
        }

        if ((CliqzHumanWeb.counter/CliqzHumanWeb.tmult) % (1*60) == 0) {
            
            CliqzHumanWeb.listOfUnchecked(1, CliqzHumanWeb.doubleFetchTimeInSec, null, CliqzHumanWeb.processUnchecks);
        }

        if ((CliqzHumanWeb.counter/CliqzHumanWeb.tmult) % 10 == 0) {
            var ll = CliqzHumanWeb.state['m'].length;
            if (ll > 0) {
                var v = CliqzHumanWeb.state['m'].slice(0, ll);
                CliqzHumanWeb.state['m'] = CliqzHumanWeb.state['m'].slice(ll, CliqzHumanWeb.state['m'].length);

                
            }
        }

        
        if ((CliqzHumanWeb.counter/CliqzHumanWeb.tmult) % (60 * 60 * 24) == 0) {
            if (CliqzHumanWeb.debug) {
                CliqzUtils.log('Load pattern config', CliqzHumanWeb.LOG_KEY);
            }
            CliqzHumanWeb.loadContentExtraction();
        }

        
        if ((CliqzHumanWeb.counter/CliqzHumanWeb.tmult) % (60 * 20 * 1) == 0) {
            if (CliqzHumanWeb.debug) {
                CliqzUtils.log('Load ts config', CliqzHumanWeb.LOG_KEY);
            }
            CliqzHumanWeb.fetchAndStoreConfig();
        }

        if ((CliqzHumanWeb.counter/CliqzHumanWeb.tmult) % (60 * 60 * 1) == 0) {
            if (CliqzHumanWeb.debug) {
                CliqzUtils.log('Check if alive', CliqzHumanWeb.LOG_KEY);
            }
            CliqzHumanWeb.checkActiveUsage();
        }

        CliqzHumanWeb.counter += 1;

    },
    cleanUserTransitions: function(force) {
        for(var query in CliqzHumanWeb.userTransitions['search']) {
            if ((force) || ((CliqzHumanWeb.counter - CliqzHumanWeb.userTransitions['search'][query]['time']) > CliqzHumanWeb.userTransitionsSearchSession*CliqzHumanWeb.tmult)) {

                
                
                
                
                if (CliqzHumanWeb.userTransitions['search'][query]['data'].length > 1) {
                    try {var location = CliqzUtils.getPref('config_location', null)} catch(ee){};
                    var doc = {'q': query, 'sources': CliqzHumanWeb.userTransitions['search'][query]['data'],'ctry': location};
                    if (CliqzHumanWeb.debug) {
                        CliqzUtils.log(JSON.stringify(doc,undefined,2), CliqzHumanWeb.LOG_KEY);
                    }
                    CliqzHumanWeb.telemetry({'type': CliqzHumanWeb.msgType, 'action': 'userTransition.search', 'payload': doc});
                }
                delete CliqzHumanWeb.userTransitions['search'][query];
            }
        }

    },
    pushAllData: function() {

        
        CliqzHumanWeb.cleanUserTransitions(true);

        var tt = new Date().getTime();
        var res = [];
        for (var url in CliqzHumanWeb.state['v']) {
            if (CliqzHumanWeb.state['v'][url]) res.push(url);
        }

        for (var i=0; i<res.length; i++) {
            
            var url = res[i];
            if (CliqzHumanWeb.state['v'][url]) {
                if (CliqzHumanWeb.state['v'][url]['tend']==null) {
                    CliqzHumanWeb.state['v'][url]['tend'] = tt;
                }
                CliqzHumanWeb.addURLtoDB(url, CliqzHumanWeb.state['v'][url]['ref'], CliqzHumanWeb.state['v'][url]);
                CliqzHumanWeb.state['m'].push(CliqzHumanWeb.state['v'][url]);
                delete CliqzHumanWeb.state['v'][url];
                delete CliqzHumanWeb.queryCache[url];
            }
        }

        
        var ll = CliqzHumanWeb.state['m'].length;
        if (ll > 0) {
            var v = CliqzHumanWeb.state['m'].slice(0, ll);
            CliqzHumanWeb.state['m'] = CliqzHumanWeb.state['m'].slice(ll, CliqzHumanWeb.state['m'].length);
            CliqzHumanWeb.pushTelemetry();
        }
    },
    unload: function() {
        
        try {var activeUsageTrk = CliqzUtils.getPref('config_activeUsage', null)} catch(ee){};
        if(activeUsageTrk){
            var tDiff = parseInt((new Date().getTime() - activeUsageTrk) / 1000);
            if(tDiff && tDiff > 3600){
                CliqzHumanWeb.checkActiveUsage();
            }
            else{
                CliqzUtils.setPref('config_activeUsageCount', CliqzHumanWeb.activeUsage);
            }
        }
        
        CliqzHumanWeb.pushTelemetry();
        CliqzUtils.clearTimeout(CliqzHumanWeb.pacemakerId);
        CliqzUtils.clearTimeout(CliqzHumanWeb.trkTimer);
    },
    unloadAtBrowser: function(){
        try {
            CliqzHumanWeb.activityDistributor.removeObserver(CliqzHumanWeb.httpObserver);
        } catch(e){}
    },
    currentURL: function() {
        var currwin = CliqzUtils.getWindow();
        if (currwin) {
            var currURL = ''+currwin.gBrowser.selectedBrowser.contentDocument.location;
            try {
                currURL = decodeURIComponent(currURL.trim());
            } catch(ee) {}

            if (currURL!=null || currURL!=undefined) return currURL;
            else return null;
        }
        else return null;
    },
    pacemakerId: null,
    
    captureKeyPress: function(ev) {
        if ((CliqzHumanWeb.counter - (CliqzHumanWeb.lastEv['keypress']|0)) > 1 * CliqzHumanWeb.tmult && ((CliqzHumanWeb.counter - (CliqzHumanWeb.lastEv['keypresspage']|0)) > 1 * CliqzHumanWeb.tmult)) {
            if (CliqzHumanWeb.debug) {
                CliqzUtils.log('captureKeyPressAll', CliqzHumanWeb.LOG_KEY);
            }
            CliqzHumanWeb.lastEv['keypress'] = CliqzHumanWeb.counter;
            CliqzHumanWeb.lastActiveAll = CliqzHumanWeb.counter;
        }
    },
    captureMouseMove: function(ev) {
        if ((CliqzHumanWeb.counter - (CliqzHumanWeb.lastEv['mousemove']|0)) > 1 * CliqzHumanWeb.tmult && ((CliqzHumanWeb.counter - (CliqzHumanWeb.lastEv['mousemovepage']|0)) > 1 * CliqzHumanWeb.tmult)) {
            if (CliqzHumanWeb.debug) {
                CliqzUtils.log('captureMouseMoveAll', CliqzHumanWeb.LOG_KEY);
            }
            CliqzHumanWeb.lastEv['mousemove'] = CliqzHumanWeb.counter;
            CliqzHumanWeb.lastActiveAll = CliqzHumanWeb.counter;
        }
    },
    captureMouseClick: function(ev) {
        if ((CliqzHumanWeb.counter - (CliqzHumanWeb.lastEv['mouseclick']|0)) > 1 * CliqzHumanWeb.tmult && ((CliqzHumanWeb.counter - (CliqzHumanWeb.lastEv['mouseclickpage']|0)) > 1 * CliqzHumanWeb.tmult)) {
            if (CliqzHumanWeb.debug) {
                CliqzUtils.log('captureMouseClickAll', CliqzHumanWeb.LOG_KEY);
            }
            CliqzHumanWeb.lastEv['mouseclick'] = CliqzHumanWeb.counter;
            CliqzHumanWeb.lastActiveAll = CliqzHumanWeb.counter;
        }
    },
    captureKeyPressPage: function(ev) {
        if ((CliqzHumanWeb.counter - (CliqzHumanWeb.lastEv['keypresspage']|0)) > 1 * CliqzHumanWeb.tmult) {
            if (CliqzHumanWeb.debug) {
                
            }
            CliqzHumanWeb.lastEv['keypresspage'] = CliqzHumanWeb.counter;
            CliqzHumanWeb.lastActive = CliqzHumanWeb.counter;
            var activeURL = CliqzHumanWeb.currentURL();
            if (CliqzHumanWeb.state['v'][activeURL]!=null && CliqzHumanWeb.state['v'][activeURL]['a'] > 1*CliqzHumanWeb.tmult) {
                CliqzHumanWeb.state['v'][activeURL]['e']['kp'] += 1;
            }
        }
    },
    captureMouseMovePage: function(ev) {
        if ((CliqzHumanWeb.counter - (CliqzHumanWeb.lastEv['mousemovepage']|0)) > 1 * CliqzHumanWeb.tmult) {
            if (CliqzHumanWeb.debug) {
                CliqzUtils.log('captureMouseMovePage', CliqzHumanWeb.LOG_KEY);
            }
            CliqzHumanWeb.lastEv['mousemovepage'] = CliqzHumanWeb.counter;
            CliqzHumanWeb.lastActive = CliqzHumanWeb.counter;
            var activeURL = CliqzHumanWeb.currentURL();
            if (CliqzHumanWeb.state['v'][activeURL]!=null && CliqzHumanWeb.state['v'][activeURL]['a'] > 1*CliqzHumanWeb.tmult) {
                CliqzHumanWeb.state['v'][activeURL]['e']['mm'] += 1;
            }
        }
    },
    getURLFromEvent: function(ev) {
        try {
            if (ev.target.href!=null || ev.target.href!=undefined) {
                return decodeURIComponent(''+ev.target.href);
            }
            else {
                if (ev.target.parentNode.href!=null || ev.target.parentNode.href!=undefined) {
                    return decodeURIComponent(''+ev.target.parentNode.href);
                }
            }
        }
        catch(ee) {
            if (CliqzHumanWeb.debug) {
                CliqzUtils.log('Error in getURLFromEvent: ' + ee, CliqzHumanWeb.LOG_KEY);
            }
        }
        return null;
    },
    captureMouseClickPage: function(ev) {

        
        

        var targetURL = CliqzHumanWeb.getURLFromEvent(ev);

        if (targetURL!=null) {

            var embURL = CliqzHumanWeb.getEmbeddedURL(targetURL);
            if (embURL!=null) targetURL = embURL;
            var activeURL = CliqzHumanWeb.currentURL();
            if (CliqzHumanWeb.debug) {
                CliqzUtils.log('captureMouseClickPage>> ' + CliqzHumanWeb.counter + ' ' + targetURL  + ' : ' + " active: " + activeURL + " " + (CliqzHumanWeb.state['v'][activeURL]!=null) + " " + ev.target + ' :: ' + ev.target.value  + ' >>' + JSON.stringify(CliqzHumanWeb.lastEv), CliqzHumanWeb.LOG_KEY);
            }

            

            if (CliqzHumanWeb.state['v'][activeURL]!=null) {
                CliqzHumanWeb.linkCache[targetURL] = {'s': ''+activeURL, 'time': CliqzHumanWeb.counter};
                
                
                
                
                

                var linkURL = targetURL;
                if(CliqzHumanWeb.httpCache[targetURL]){
                    if(CliqzHumanWeb.httpCache[targetURL]['status'] == '301'){
                        linkURL = CliqzHumanWeb.httpCache[targetURL]['location'];
                    }
                }

                if(!CliqzHumanWeb.isSuspiciousURL(linkURL) && !CliqzHumanWeb.dropLongURL(linkURL)){
                    CliqzHumanWeb.getPageFromHashTable(linkURL, function(_res) {
                        if (_res && (_res['private'] == 0)) {
                            CliqzHumanWeb.state['v'][activeURL]['c'].push({'l': ''+ CliqzHumanWeb.maskURL(linkURL), 't': CliqzHumanWeb.counter});
                        }
                        else if(!_res){
                            CliqzHumanWeb.state['v'][activeURL]['c'].push({'l': ''+ CliqzHumanWeb.maskURL(linkURL), 't': CliqzHumanWeb.counter});

                        }

                    })
                }

            }
        }

        if ((CliqzHumanWeb.counter - (CliqzHumanWeb.lastEv['mouseclickpage']|0)) > 1 * CliqzHumanWeb.tmult) {
            if (CliqzHumanWeb.debug) {
                CliqzUtils.log('captureMouseClickPage', CliqzHumanWeb.LOG_KEY);
            }
            CliqzHumanWeb.lastEv['mouseclickpage'] = CliqzHumanWeb.counter;
            CliqzHumanWeb.lastActive = CliqzHumanWeb.counter;
            var activeURL = CliqzHumanWeb.currentURL();
            if (CliqzHumanWeb.state['v'][activeURL]!=null && CliqzHumanWeb.state['v'][activeURL]['a'] > 1*CliqzHumanWeb.tmult) {
                CliqzHumanWeb.state['v'][activeURL]['e']['md'] += 1;
            }
        }
    },
    captureScrollPage: function(ev) {
        if ((CliqzHumanWeb.counter - (CliqzHumanWeb.lastEv['scrollpage']|0)) > 1 * CliqzHumanWeb.tmult) {
            if (CliqzHumanWeb.debug) {
                CliqzUtils.log('captureScrollPage ', CliqzHumanWeb.LOG_KEY);
            }

            CliqzHumanWeb.lastEv['scrollpage'] = CliqzHumanWeb.counter;
            CliqzHumanWeb.lastActive = CliqzHumanWeb.counter;
            var activeURL = CliqzHumanWeb.currentURL();
            if (CliqzHumanWeb.state['v'][activeURL]!=null && CliqzHumanWeb.state['v'][activeURL]['a'] > 1*CliqzHumanWeb.tmult) {
                CliqzHumanWeb.state['v'][activeURL]['e']['sc'] += 1;
            }
        }
    },
    captureCopyPage: function(ev) {
        if ((CliqzHumanWeb.counter - (CliqzHumanWeb.lastEv['copypage']|0)) > 1 * CliqzHumanWeb.tmult) {
            if (CliqzHumanWeb.debug) {
                CliqzUtils.log('captureCopyPage', CliqzHumanWeb.LOG_KEY);
            }
            CliqzHumanWeb.lastEv['copypage'] = CliqzHumanWeb.counter;
            CliqzHumanWeb.lastActive = CliqzHumanWeb.counter;
            var activeURL = CliqzHumanWeb.currentURL();
            if (CliqzHumanWeb.state['v'][activeURL]!=null && CliqzHumanWeb.state['v'][activeURL]['a'] > 1*CliqzHumanWeb.tmult) {
                CliqzHumanWeb.state['v'][activeURL]['e']['cp'] += 1;
            }
        }
    },
    counter: 0,
    tmult: 4,
    tpace: 250,
    lastEv: {},
    lastActive: null,
    lastActiveAll: null,
    getAllOpenPages: function() {
        var res = [];
        try {
            for (var j = 0; j < CliqzHumanWeb.windowsRef.length; j++) {
                var gBrowser = CliqzHumanWeb.windowsRef[j].gBrowser;
                if (gBrowser.tabContainer) {
                    var numTabs = gBrowser.tabContainer.childNodes.length;
                    for (var i=0; i<numTabs; i++) {
                        var currentTab = gBrowser.tabContainer.childNodes[i];
                        var currentBrowser = gBrowser.getBrowserForTab(currentTab);
                        var currURL=''+currentBrowser.contentDocument.location;
                        if (currURL.indexOf('about:')!=0) {
                            res.push(decodeURIComponent(currURL));
                        }
                    }
                }
            }
            return res;
        }
        catch(ee) {
            return [];
        }
    },
    windowsRef: [],
    windowsMem: {},
    init: function(window) {
        refineFuncMappings = {
           "splitF":CliqzHumanWeb.refineSplitFunc,
           "parseU":CliqzHumanWeb.refineParseURIFunc,
           "maskU":CliqzHumanWeb.refineMaskUrl
        };


        if (CliqzHumanWeb.debug) CliqzUtils.log("Init function called:", CliqzHumanWeb.LOG_KEY)
        CliqzHumanWeb.initDB();
        var win_id = CliqzUtils.getWindowID()

        if (CliqzHumanWeb.state == null) {
            CliqzHumanWeb.state = {};
        }
        else {

            var util = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIDOMWindowUtils);
            var win_id = util.outerWindowID;

            if (CliqzHumanWeb.windowsMem[win_id] == null) {
                CliqzHumanWeb.windowsMem[win_id] = window;
                CliqzHumanWeb.windowsRef.push(window);
            }
        }

        var util = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIDOMWindowUtils);
        var win_id = util.outerWindowID;

        if (CliqzHumanWeb.windowsMem[win_id] == null) {
            CliqzHumanWeb.windowsMem[win_id] = window;
            CliqzHumanWeb.windowsRef.push(window);
        }

        if (CliqzHumanWeb.pacemakerId==null) {
            CliqzHumanWeb.pacemakerId = CliqzUtils.setInterval(CliqzHumanWeb.pacemaker, CliqzHumanWeb.tpace, null);
        }

        CliqzHumanWeb.loadContentExtraction();
        CliqzHumanWeb.fetchAndStoreConfig();

    },
    initAtBrowser: function(){
        CliqzHumanWeb.activityDistributor.addObserver(CliqzHumanWeb.httpObserver);
    },
    state: {'v': {}, 'm': [], '_id': Math.floor( Math.random() * 1000 ) },
    hashCode: function(s) {
        return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);
    },
    msgSanitize: function(msg){

        

        try {msg.ts = CliqzUtils.getPref('config_ts', null)} catch(ee){};


        if(!msg.ts || msg.ts == ''){
            return null;
        }



        if (msg.action == 'page') {
            if(msg.payload.tend  && msg.payload.tin){
                var duration = msg.payload.tend - msg.payload.tin;
                if (CliqzHumanWeb.debug) CliqzUtils.log("Duration spent: " +  msg.payload.tend + " : " +  msg.payload.tin + " : " + duration ,CliqzHumanWeb.LOG_KEY);
            }
            else{
                var duration = null;
                if (CliqzHumanWeb.debug) CliqzUtils.log("Duration spent: " +  msg.payload.tend + " : " +  msg.payload.tin + " : " + duration ,CliqzHumanWeb.LOG_KEY);
            }

            msg.payload['dur'] = duration;

            delete msg.payload.tend;
            delete msg.payload.tin;

            
            if(msg.payload.ref){
                if(CliqzHumanWeb.isSuspiciousURL(msg.payload['ref'])){
                    msg.payload['ref'] = null;
                }
                else{
                    msg.payload['ref'] = CliqzHumanWeb.maskURL(msg.payload['ref']);
                }
            }

            
            if(msg.payload.red){
                var cleanRed = [];
                msg.payload.red.forEach(function(e){
                    cleanRed.push(CliqzHumanWeb.maskURL(e));
                })
                msg.payload.red = cleanRed;
            }

        }

        
        
        

        if(CliqzHumanWeb.can_urls[msg.payload.url]){
            msg.payload.url = CliqzHumanWeb.can_urls[msg.payload.url];
        }

        

        if(msg.payload.qr){
          if(msg.payload.qr.d > 2){
            delete msg.payload.qr;
          }
        }

        
        if(msg.action=='doorwaypage') {
            if((CliqzHumanWeb.isSuspiciousURL(msg.payload['durl'])) || (CliqzHumanWeb.isSuspiciousURL(msg.payload['url']))){
                return null;
            }
            if((CliqzHumanWeb.dropLongURL(msg.payload['durl'])) || (CliqzHumanWeb.dropLongURL(msg.payload['url']))){
                return null;
            }
        }


        

        if(msg.action=='query') {
            
            if ((msg.payload.q == null) || (msg.payload.q == '')) {
                return null;
            }
            else {
                
                if (msg.payload.q.length > 50) return null;
                if (msg.payload.q.split(' ').length > 7) return null;
                
                if (/[^:]+:[^@]+@/.test(msg.payload.q)) return null;
                
                if (/^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(msg.payload.q)) return null;

                var v = msg.payload.q.split(' ');
                for(let i=0;i<v.length;i++) {
                    if (v[i].length > 20) return null;
                    if (/[^:]+:[^@]+@/.test(v[i])) return null;
                    if (/^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(v[i])) return null;
                }

            }
        }


        return msg;


    },
    
    
    
    trk: [],
    trkTimer: null,
    telemetry: function(msg, instantPush) {
        if (!CliqzHumanWeb || 
            CliqzUtils.getPref('dnt', false) ||
            CliqzUtils.isPrivate(CliqzUtils.getWindow())) return;

        msg.ver = CliqzHumanWeb.VERSION;
        msg = CliqzHumanWeb.msgSanitize(msg);
        if (msg) CliqzHumanWeb.trk.push(msg);
        CliqzUtils.clearTimeout(CliqzHumanWeb.trkTimer);
        if(instantPush || CliqzHumanWeb.trk.length % 100 == 0){
            CliqzHumanWeb.pushTelemetry();
        } else {
            CliqzHumanWeb.trkTimer = CliqzUtils.setTimeout(CliqzHumanWeb.pushTelemetry, 60000);
        }
    },
    _telemetry_req: null,
    _telemetry_sending: [],
    _telemetry_start: undefined,
    telemetry_MAX_SIZE: 500,
    previousDataPost: null,
    pushTelemetry: function() {
        if(CliqzHumanWeb._telemetry_req) return;

        
        

        
        

        
        
        CliqzHumanWeb.duplicateEvents(CliqzHumanWeb.trk);

        CliqzHumanWeb._telemetry_sending = CliqzHumanWeb.trk.splice(0);
        CliqzHumanWeb._telemetry_start = (new Date()).getTime();
        var data = JSON.stringify(CliqzHumanWeb._telemetry_sending);
        if (data.length > 10) {
            if (CliqzHumanWeb.previousDataPost && data == CliqzHumanWeb.previousDataPost) {
                
                var notificationMsg = {};
                notificationMsg['reason'] = "duplicate payload";
                notificationMsg['payload'] = data;
                CliqzHumanWeb.notification(notificationMsg);
            }
            CliqzHumanWeb.previousDataPost = data;
        }
        CliqzHumanWeb._telemetry_req = CliqzUtils.httpPost(CliqzUtils.SAFE_BROWSING, CliqzHumanWeb.pushTelemetryCallback, data, CliqzHumanWeb.pushTelemetryError);
    },
    pushTelemetryCallback: function(req){
        try {
            var response = JSON.parse(req.response);
            CliqzHumanWeb._telemetry_sending = [];
            CliqzHumanWeb._telemetry_req = null;
        } catch(e){}
    },
    pushTelemetryError: function(req){
        
        CliqzHumanWeb.trk = CliqzHumanWeb._telemetry_sending.concat(CliqzHumanWeb.trk);

        
        var slice_pos = CliqzHumanWeb.trk.length - CliqzHumanWeb.telemetry_MAX_SIZE + 100;
        if(slice_pos > 0){
            CliqzHumanWeb.trk = CliqzHumanWeb.trk.slice(slice_pos);
        }

        CliqzHumanWeb._telemetry_sending = [];
        CliqzHumanWeb._telemetry_req = null;
    },
    
    
    
    initDB: function() {
        if ( FileUtils.getFile("ProfD", ["cliqz.dbusafe"]).exists() ) {
            if (CliqzHumanWeb.olddbConn==null) {
                 CliqzHumanWeb.olddbConn = Services.storage.openDatabase(FileUtils.getFile("ProfD", ["cliqz.dbusafe"]));
            }
            CliqzHumanWeb.removeTable();
        }

        if ( FileUtils.getFile("ProfD", ["cliqz.dbhumanweb"]).exists() ) {
            if (CliqzHumanWeb.dbConn==null) {
                CliqzHumanWeb.dbConn = Services.storage.openDatabase(FileUtils.getFile("ProfD", ["cliqz.dbhumanweb"]))
                
            }
            CliqzHumanWeb.createTable();
            return;
        }
        else {
            CliqzHumanWeb.dbConn = Services.storage.openDatabase(FileUtils.getFile("ProfD", ["cliqz.dbhumanweb"]));
            CliqzHumanWeb.createTable();
        }

    },
    dbConn: null,
    auxSameDomain: function(url1, url2) {
        var d1 = CliqzHumanWeb.parseURL(url1).hostname.replace('www.','');
        var d2 = CliqzHumanWeb.parseURL(url2).hostname.replace('www.','');
        return d1==d2;
    },
    getPageFromDB: function(url, callback) {
        var res = [];
        var st = CliqzHumanWeb.dbConn.createStatement("SELECT * FROM usafe WHERE url = :url");
        st.params.url = url;
        var res = [];
        st.executeAsync({
            handleResult: function(aResultSet) {
                for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
                    res.push({"url": row.getResultByName("url"), "ref": row.getResultByName("ref"), "private": row.getResultByName("private"), "checked": row.getResultByName("checked")});
                }
            },
            handleError: function(aError) {
                CliqzUtils.log("SQL error: " + aError.message, CliqzHumanWeb.LOG_KEY);
                callback(true);
            },
            handleCompletion: function(aReason) {
                if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED) {
                    CliqzUtils.log("SQL canceled or aborted", CliqzHumanWeb.LOG_KEY);
                    callback(null);
                }
                else {
                    if (res.length == 1) {
                        callback(res[0]);
                    }
                    else {
                        callback(null);
                    }
                }
            }
        });
    },
    getPageFromHashTable: function(url, callback) {
        var res = [];
        var st = CliqzHumanWeb.dbConn.createStatement("SELECT * FROM hashusafe WHERE hash = :hash");
        st.params.hash = (md5(url)).substring(0,16);
        st.executeAsync({
            handleResult: function(aResultSet) {
                for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
                    res.push({"hash": row.getResultByName("hash"), "private": row.getResultByName("private")});
                }
            },
            handleError: function(aError) {
                CliqzUtils.log("SQL error: " + aError.message, CliqzHumanWeb.LOG_KEY);
                callback(true);
            },
            handleCompletion: function(aReason) {
                if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED) {
                    CliqzUtils.log("SQL canceled or aborted", CliqzHumanWeb.LOG_KEY);
                    callback(null);
                }
                else {
                    if (res.length == 1) {
                        callback(res[0]);
                    }
                    else {
                        callback(null);
                    }
                }
            }
        });
    },
    isPrivate: function(url, depth, callback) {
        
        
        
        var res = [];
        var st = CliqzHumanWeb.dbConn.createStatement("SELECT * FROM usafe WHERE url = :url");
        st.params.url = url;

        var res = [];
        st.executeAsync({
            handleResult: function(aResultSet) {
                for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
                    res.push({"url": row.getResultByName("url"), "ref": row.getResultByName("ref"), "private": row.getResultByName("private"), "checked": row.getResultByName("checked")});
                }
            },
            handleError: function(aError) {
                CliqzUtils.log("SQL error: " + aError.message, CliqzHumanWeb.LOG_KEY);
                callback(true);
            },
            handleCompletion: function(aReason) {
                if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED) {
                    CliqzUtils.log("SQL canceled or aborted", CliqzHumanWeb.LOG_KEY);
                    callback(true);
                }
                else {
                    if (res.length == 1) {
                        if (res[0].ref!='' && res[0].ref!=null) {
                        
                            if (depth < 10) {
                                if (CliqzHumanWeb.auxSameDomain(res[0].ref, url)) {
                                    CliqzHumanWeb.isPrivate(res[0].ref, depth+1, function(priv) {
                                    callback(priv);
                                    });
                                }
                                else callback(false);
                            }
                            else {
                                
                                
                                
                                
                                callback(true);
                            }
                        }
                        else {
                            callback(false);
                        }
                    }
                    else {
                        callback(true);
                    }
            }
        }
        });
    },
    parseHostname: function(hostname) {
        var o = {'hostname': null, 'username': '', 'password': '', 'port': null};

        var h = hostname;
        var v = hostname.split('@');
        if (v.length > 1) {
            var w = v[0].split(':');
            o['username'] = w[0];
            o['password'] = w[1];
            h = v[1];
        }

        v = h.split(':');
        if (v.length > 1) {
            o['hostname'] = v[0];
            o['port'] = parseInt(v[1]);
        }
        else {
            o['hostname'] = v[0];
            o['port'] = 80;
        }

        return o;
    },
    parseURL: function(url) {
        
        var o = {};

        var v = url.split('://');
        if (v.length >= 1) {

            o['protocol'] = v[0];
            var s = v.slice(1, v.length).join('://');
            v = s.split('/');

            var oh = CliqzHumanWeb.parseHostname(v[0]);
            o['hostname'] = oh['hostname'];
            o['port'] = oh['port'];
            o['username'] = oh['username'];
            o['password'] = oh['password'];
            o['path'] = '/';
            o['query_string'] = null;

            if (v.length>1) {
                s = v.splice(1, v.length).join('/');
                v = s.split('?')
                o['path'] = '/' + v[0];
                if (v.length>1) {
                    o['query_string'] = v.splice(1, v.length).join('?');
                }
            }
        }
        else {
            return null;
        }

        return o;

    },
    addURLtoDB: function(url, ref, paylobj) {

        var tt = new Date().getTime();
        var se = CliqzHumanWeb.checkSearchURL(url);
        if (se > -1 ){
            return
        }

        
        var ft = 1;
        var privateHash = false;
        CliqzHumanWeb.getPageFromHashTable(url, function(_res) {
            if (_res) {
                if(_res['private'] == 1 ){
                    privateHash = true;
                }
                else{
                    ft = 0;
                }
            }
            else{
                
                 paylobj['ft'] = true;
            }
        })


        var stmt = CliqzHumanWeb.dbConn.createStatement("SELECT url, checked, ft, private, payload FROM usafe WHERE url = :url");
        stmt.params.url = url;

        var res = [];
        stmt.executeAsync({
            handleResult: function(aResultSet) {
                for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
                    res.push({'url': row.getResultByName("url"), 'checked': row.getResultByName("checked"), 'ft' :row.getResultByName('ft'), 'private' :row.getResultByName('private'), 'payload' :row.getResultByName('payload') });
                }
            },
            handleError: function(aError) {
                CliqzUtils.log("SQL error: " + aError.message, CliqzHumanWeb.LOG_KEY);
            },
            handleCompletion: function(aReason) {
                if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED) {
                    CliqzUtils.log("SQL canceled or aborted", CliqzHumanWeb.LOG_KEY);
                }
                else {
                    if (res.length == 0 && !privateHash ){
                        var setPrivate = false;
                        var st = CliqzHumanWeb.dbConn.createStatement("INSERT INTO usafe (url,ref,last_visit,first_visit, reason, private, checked,payload, ft) VALUES (:url, :ref, :last_visit, :first_visit, :reason, :private, :checked, :payload, :ft)");
                        st.params.url = url;
                        st.params.ref = ref;
                        st.params.last_visit = tt;
                        st.params.first_visit = tt;
                        st.params.ft = ft;
                        st.params.payload = JSON.stringify(paylobj || {});

                        if (paylobj['x']==null) {
                            
                            st.params.checked = 1;
                            st.params.private = 1;
                            st.params.reason = 'empty page data';
                            setPrivate = true;
                        }
                        else if (CliqzHumanWeb.isSuspiciousURL(url)) {
                            
                            st.params.checked = 1;
                            st.params.private = 1;
                            st.params.reason = 'susp. url';
                            setPrivate = true;
                        }
                        else {
                            if (CliqzHumanWeb.httpCache401[url]) {
                                st.params.checked = 1;
                                st.params.private = 1;
                                st.params.reason = '401';
                                setPrivate = true;
                            }
                            else {
                                st.params.checked = 0;
                                st.params.private = 0;
                                st.params.reason = '';
                                setPrivate = false;
                            }
                        }

                        
                        st.executeAsync({
                            handleError: function(aError) {
                                CliqzUtils.log("SQL error: " + aError.message, CliqzHumanWeb.LOG_KEY);
                            },
                            handleCompletion: function(aReason) {
                                if(CliqzHumanWeb.debug){
                                    CliqzUtils.log("Insertion success", CliqzHumanWeb.LOG_KEY);
                                }
                            }
                        });
                        if(setPrivate){
                            CliqzHumanWeb.setAsPrivate(url);
                        }
                    }
                    else if(res.length > 0){
                        if (res[0]['checked']==0) {
                                
                                var metricsBefore = JSON.parse(res[0]['payload'])['e'];
                                var metricsAfter = paylobj['e'];
                                paylobj['e'] = CliqzHumanWeb.aggregateMetrics(metricsBefore, metricsAfter);

                                
                                if(res[0]['ft']==1){
                                    paylobj['ft'] = true;
                                }
                                var st = CliqzHumanWeb.dbConn.createStatement("UPDATE usafe SET last_visit = :last_visit, payload = :payload WHERE url = :url");
                                st.params.url = url;
                                st.params.last_visit = tt;
                                st.params.payload = JSON.stringify(paylobj || {});
                                
                                st.executeAsync({
                                    handleError: function(aError) {
                                        CliqzUtils.log("SQL error: " + aError.message, CliqzHumanWeb.LOG_KEY);
                                    },
                                    handleCompletion: function(aReason) {
                                        if(CliqzHumanWeb.debug){
                                            CliqzUtils.log("Insertion success", CliqzHumanWeb.LOG_KEY);
                                        }
                                    }
                                });
                                paylobj['e'] = {'cp': 0, 'mm': 0, 'kp': 0, 'sc': 0, 'md': 0};
                        }
                        else{
                            if (res[0]['checked']==1 && res[0]['private'] == 0) {
                                
                                var metricsBefore = res[0]['payload']['e'];
                                var metricsAfter = paylobj['e'];
                                paylobj['e'] = CliqzHumanWeb.aggregateMetrics(metricsBefore, metricsAfter);

                                var st = CliqzHumanWeb.dbConn.createStatement("UPDATE usafe SET last_visit = :last_visit, payload = :payload, checked = :checked WHERE url = :url");
                                st.params.url = url;
                                st.params.last_visit = tt;
                                st.params.payload = JSON.stringify(paylobj || {});
                                st.params.checked = 0;
                                
                                st.executeAsync({
                                    handleError: function(aError) {
                                        CliqzUtils.log("SQL error: " + aError.message, CliqzHumanWeb.LOG_KEY);
                                    },
                                    handleCompletion: function(aReason) {
                                        if(CliqzHumanWeb.debug){
                                            CliqzUtils.log("Insertion success", CliqzHumanWeb.LOG_KEY);
                                        }
                                    }
                                });
                                paylobj['e'] = {'cp': 0, 'mm': 0, 'kp': 0, 'sc': 0, 'md': 0};
                            }
                        }
                    }
                }
            }
        });
    },
    setAsPrivate: function(url) {
        var st = CliqzHumanWeb.dbConn.createStatement("DELETE from usafe WHERE url = :url");
        st.params.url = url;
        
        st.executeAsync({
            handleError: function(aError) {
                CliqzUtils.log("SQL error: " + aError.message, CliqzHumanWeb.LOG_KEY);
            },
            handleCompletion: function(aReason) {
                if(CliqzHumanWeb.debug){
                    CliqzUtils.log("Delete success", CliqzHumanWeb.LOG_KEY);
                 }
            }
        });
        if(CliqzHumanWeb.state['v'][url]){
            delete CliqzHumanWeb.state['v'][url];
        }


        
        var hash_st = CliqzHumanWeb.dbConn.createStatement("INSERT OR IGNORE INTO hashusafe (hash, private) VALUES (:hash, :private)")
        hash_st.params.hash = (md5(url)).substring(0,16);
        hash_st.params.private = 1;
        
        hash_st.executeAsync({
            handleError: function(aError) {
                CliqzUtils.log("SQL error: " + aError.message, CliqzHumanWeb.LOG_KEY);
            },
            handleCompletion: function(aReason) {
                if(CliqzHumanWeb.debug){
                    CliqzUtils.log("Insertion success", CliqzHumanWeb.LOG_KEY);
                }
            }
        });
        if (CliqzHumanWeb.debug) {
            CliqzUtils.log('MD5: ' + url + md5(url) + " ::: "  + (md5(url)).substring(0,16), CliqzHumanWeb.LOG_KEY);
        }
    },
    setAsPublic: function(url) {
        var st = CliqzHumanWeb.dbConn.createStatement("DELETE from usafe WHERE url = :url")
        st.params.url = url;
        
        st.executeAsync({
            handleError: function(aError) {
                CliqzUtils.log("SQL error: " + aError.message, CliqzHumanWeb.LOG_KEY);
            },
            handleCompletion: function(aReason) {
                if(CliqzHumanWeb.debug){
                    CliqzUtils.log("Insertion success", CliqzHumanWeb.LOG_KEY);
                }
            }
        });
        if(CliqzHumanWeb.state['v'][url]){
            delete CliqzHumanWeb.state['v'][url];
        }

        
        var hash_st = CliqzHumanWeb.dbConn.createStatement("INSERT OR IGNORE INTO hashusafe (hash, private) VALUES (:hash, :private)")
        hash_st.params.hash = (md5(url)).substring(0,16);
        hash_st.params.private = 0;
        
        hash_st.executeAsync({
            handleError: function(aError) {
                CliqzUtils.log("SQL error: " + aError.message, CliqzHumanWeb.LOG_KEY);
            },
            handleCompletion: function(aReason) {
                if(CliqzHumanWeb.debug){
                    CliqzUtils.log("Insertion success", CliqzHumanWeb.LOG_KEY);
                }
            }
        });
        if (CliqzHumanWeb.debug) {
            CliqzUtils.log('MD5: ' + url + md5(url), CliqzHumanWeb.LOG_KEY);
        }

    },
    listOfUnchecked: function(cap, sec_old, fixed_url, callback) {
        var tt = new Date().getTime();
        var stmt = null;
        if (fixed_url == null) {
            
            stmt = CliqzHumanWeb.dbConn.createAsyncStatement("SELECT url, payload FROM usafe WHERE last_visit < :last_visit and private = :private and checked = :checked LIMIT :cap;");
        }
        else {
            stmt = CliqzHumanWeb.dbConn.createAsyncStatement("SELECT url, payload FROM usafe WHERE last_visit < :last_visit and url = :url and private = :private and checked = :checked LIMIT :cap;");
            stmt.params.url = fixed_url;
        }
        stmt.params.last_visit = (tt - sec_old*1000);
        stmt.params.private = 0;
        stmt.params.cap = cap;
        stmt.params.checked = 0;

        var res = [];
        stmt.executeAsync({
            handleResult: function(aResultSet) {
                for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
                    res.push([row.getResultByName("url"), JSON.parse(row.getResultByName("payload")) ]);
                }
            },
            handleError: function(aError) {
                CliqzUtils.log("SQL error: " + aError.message, CliqzHumanWeb.LOG_KEY);
            },
            handleCompletion: function(aReason) {
                if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED) {
                    CliqzUtils.log("SQL canceled or aborted", CliqzHumanWeb.LOG_KEY);
                }
                else {
                    callback(res.splice(0,cap), null);
                }
            }
        });
    },
    processUnchecks: function(listOfUncheckedUrls) {
        
        if(listOfUncheckedUrls.length > 1){
            
            
            var notificationMsg = {};
            notificationMsg['reason'] = "listOfUncheckedUrls greater than one";
            notificationMsg['count'] = listOfUncheckedUrls.length;
            CliqzHumanWeb.notification(notificationMsg);

        }

        for(var i=0;i<listOfUncheckedUrls.length;i++) {
            var url = listOfUncheckedUrls[i][0];
            var page_doc = listOfUncheckedUrls[i][1];
            var page_struct_before = page_doc['x'];

            CliqzHumanWeb.isPrivate(url, 0,function(isPrivate) {
                if (isPrivate) {
                    var st = CliqzHumanWeb.dbConn.createStatement("UPDATE usafe SET reason = :reason, checked = :checked, private = :private , ft = :ft WHERE url = :url");
                    st.params.url = url;
                    st.params.checked = 1;
                    st.params.private = 1;
                    st.params.ft = 0;
                    st.params.reason = 'priv. st.';
                    
                    st.executeAsync({
                        handleError: function(aError) {
                            CliqzUtils.log("SQL error: " + aError.message, CliqzHumanWeb.LOG_KEY);
                        },
                        handleCompletion: function(aReason) {
                            if(CliqzHumanWeb.debug){
                                CliqzUtils.log("Insertion success", CliqzHumanWeb.LOG_KEY);
                            }
                        }
                    });
                    CliqzHumanWeb.setAsPrivate(url);
                }
                else {
                    CliqzHumanWeb.doubleFetch(url, page_doc);
                }
            });
        }
    },
    
    forceDoubleFetch: function(url) {
        
        
        var notificationMsg = {};
        notificationMsg['reason'] = "force double fetch triggered";
        CliqzHumanWeb.notification(notificationMsg);

        CliqzHumanWeb.listOfUnchecked(1000000000000, 0, url, CliqzHumanWeb.processUnchecks);
    },
    outOfABTest: function() {
        (CliqzHumanWeb.dbConn.executeSimpleSQLAsync || CliqzHumanWeb.dbConn.executeSimpleSQL)('DROP TABLE usafe;');
    },
    removeTable: function(reason) {
        try{
            (CliqzHumanWeb.olddbConn.executeSimpleSQLAsync || CliqzHumanWeb.olddbConn.executeSimpleSQL)('DROP TABLE usafe;');
        }catch(ee){};
    },
    debugInterface: function() {
        var ww = Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
                    .getService(Components.interfaces.nsIWindowWatcher);
        try{var win = ww.openWindow(null, "chrome://cliqzmodules/content/debugInterface",
                        "debugInterface", null, null);}catch(ee){CliqzUtils.log(ee,'debugInterface')}
    },
    loadContentExtraction: function(){
        
        CliqzUtils.httpGet(CliqzHumanWeb.patternsURL,
          function success(req){
            if(!CliqzHumanWeb) return;

            var patternConfig = JSON.parse(req.response);
            CliqzHumanWeb.searchEngines = patternConfig["searchEngines"];
            CliqzHumanWeb.extractRules = patternConfig["scrape"];
            CliqzHumanWeb.payloads = patternConfig["payloads"];
            CliqzHumanWeb.idMappings = patternConfig["idMapping"];
            CliqzHumanWeb.rArray = [];
            patternConfig["urlPatterns"].forEach(function(e){
              CliqzHumanWeb.rArray.push(new RegExp(e));
            })
          },
          function error(res){
            CliqzUtils.log('Error loading config. ', CliqzHumanWeb.LOG_KEY)
            });
    },
    fetchAndStoreConfig: function(){
        
        CliqzUtils.httpGet(CliqzHumanWeb.configURL,
          function success(req){
            if(!CliqzHumanWeb) return;
                try {
                    var config = JSON.parse(req.response);
                    for(var k in config){
                        CliqzUtils.setPref('config_' + k, config[k]);
                    }
                } catch(e){};
          },
          function error(res){
            CliqzUtils.log('Error loading config. ', CliqzHumanWeb.LOG_KEY)
          }, 5000);
    },
    checkURL: function(cd){
        var url = cd.location.href;
        var pageContent = cd;
        
        
        for(var i=0;i<CliqzHumanWeb.rArray.length;i++){
            if(CliqzHumanWeb.rArray[i].test(url)){
                CliqzHumanWeb.extractContent(i, pageContent);

                
                if(CliqzHumanWeb.searchEngines.indexOf(''+i) != -1 ){return;}
                if (CliqzHumanWeb.debug) {
                    CliqzUtils.log('Continue further after search engines ', CliqzHumanWeb.LOG_KEY);
                }
            }
      }
    },
    checkSearchURL: function(url){
        var idx = null;
        var reref = /\.google\..*?\/(?:url|aclk)\?/;
        for(var i=0;i<CliqzHumanWeb.rArray.length;i++){
            if(CliqzHumanWeb.rArray[i].test(url)){
                
                if(CliqzHumanWeb.searchEngines.indexOf(''+i) != -1 ){;
                    idx = i;
                    return idx;
                }
                else{
                    if (CliqzHumanWeb.debug) {
                        CliqzUtils.log('Not search engine ' + i + CliqzHumanWeb.searchEngines, CliqzHumanWeb.LOG_KEY);
                    }
                    return -1;
                }
            }
        }
    },
    extractContent: function(ind, cd){
        var scrapeResults = {};
        var eventMsg = {};
        var rules = {};
        var key = "";
        var rule = "";

        rules = CliqzHumanWeb.extractRules[ind];
        if (CliqzHumanWeb.debug) {
            CliqzUtils.log('rules' + rules + ind, CliqzHumanWeb.LOG_KEY);
        }
        var urlArray = [];
        var titleArray = [];
        for(key in rules){
            var _keys = Object.keys(rules[key]);
            if (CliqzHumanWeb.debug) {
                CliqzUtils.log('keys' + _keys, CliqzHumanWeb.LOG_KEY);
            }
            var innerDict = {};
            _keys.forEach(function(each_key){
                    if(rules[key][each_key]['type'] == 'standard'){

                        
                        if(rules[key][each_key]['etype'] == 'url'){
                            var qurl = cd.location.href;
                            var functionsApplied = (rules[key][each_key]['functionsApplied'] || null);
                            
                            if(functionsApplied){
                                qurl = functionsApplied.reduce(function(attribVal, e){
                                    if(refineFuncMappings.hasOwnProperty(e[0])){
                                        return refineFuncMappings[e[0]](attribVal,e[1],e[2]);
                                    }
                                    else{
                                        return attribVal;
                                    }
                                },qurl)
                            }


                            innerDict[each_key] = [qurl];
                        }

                        if(rules[key][each_key]['etype'] == 'ctry'){
                            try {var location = CliqzUtils.getPref('config_location', null)} catch(ee){};
                            innerDict[each_key] = [location];
                        }


                    }
                    else if(rules[key][each_key]['type'] == 'searchQuery'){
                        urlArray = CliqzHumanWeb._getAttribute(cd,key,rules[key][each_key]['item'], rules[key][each_key]['etype'], rules[key][each_key]['keyName'],(rules[key][each_key]['functionsApplied'] || null))
                        
                        innerDict[each_key] = urlArray;
                        CliqzHumanWeb.searchCache[ind] = {'q' : urlArray[0], 't' : CliqzHumanWeb.idMappings[ind]};
                    }
                    else{
                        urlArray = CliqzHumanWeb._getAttribute(cd,key,rules[key][each_key]['item'], rules[key][each_key]['etype'], rules[key][each_key]['keyName'],(rules[key][each_key]['functionsApplied'] || null))
                        
                        innerDict[each_key] = urlArray;
                    }
            })

            if(CliqzHumanWeb.messageTemplate[ind]){
                CliqzHumanWeb.messageTemplate[ind][key] = innerDict;
            }
            else{
                CliqzHumanWeb.messageTemplate[ind] = {};
                CliqzHumanWeb.messageTemplate[ind][key] = innerDict;

            }

            
            var _mergeArr = CliqzHumanWeb.mergeArr(CliqzHumanWeb.messageTemplate[ind][key]);
            if(_mergeArr.length > 0){
                scrapeResults[key] = _mergeArr;
            }
        }

        for(rule in CliqzHumanWeb.payloads[ind]){
            CliqzHumanWeb.createPayload(scrapeResults, ind, rule)
        }
    },
    mergeArr: function(arrS){
        var messageList = [];
        var allKeys = [];
        allKeys =  Object.keys(arrS);
        arrS[allKeys[0]].forEach(function(e,idx){var innerDict ={};messageList.push(allKeys.map(function(e,_idx,arr){innerDict[e]=arrS[e][idx];return innerDict})[0])})
        return messageList;
    },
    _getAttribute: function(cd,parentItem,item,attrib,keyName,functionsApplied){
        var arr = [];
        var rootElement = Array.prototype.slice.call(cd.querySelectorAll(parentItem));
        for(var i=0;i<rootElement.length;i++){
            var val = rootElement[i].querySelector(item);
            if (val){
                
                var innerDict = {};
                var attribVal = val[attrib] || val.getAttribute(attrib);

                
                if(functionsApplied){
                    attribVal = functionsApplied.reduce(function(attribVal, e){
                        if(refineFuncMappings.hasOwnProperty(e[0])){
                            return refineFuncMappings[e[0]](attribVal,e[1],e[2]);
                        }
                        else{
                            return attribVal;
                        }
                    },attribVal)

                }
                arr.push(innerDict[keyName] = attribVal);
            }
            else{
                var innerDict = {}
                arr.push(innerDict[keyName] = val);
            }
        }
        return arr;
    },
    createPayload: function(scrapeResults, idx, key){
        try{
            var payloadRules = CliqzHumanWeb.payloads[idx][key];
            if (payloadRules['type'] == 'single' && payloadRules['results'] == 'single' ){
                scrapeResults[key].forEach(function(e){
                    try {var location = CliqzUtils.getPref('config_location', null)} catch(ee){};
                    e['ctry'] = location;
                    CliqzHumanWeb.sendMessage(payloadRules, e)
                })
            }
            else if (payloadRules['type'] == 'single' && payloadRules['results'] == 'custom' ){
                    var payload = {};
                    payloadRules['fields'].forEach(function(e){
                        try{payload[e[1]] = scrapeResults[e[0]][0][e[1]]}catch(ee){};
                        CliqzHumanWeb.sendMessage(payloadRules, payload)
                    })
            }
            else if (payloadRules['type'] == 'query' && payloadRules['results'] == 'clustered'){
                var payload = {};
                payloadRules['fields'].forEach(function(e){
                    if (e.length > 2){
                        var joinArr = {};
                        for(var i=0;i<scrapeResults[e[0]].length;i++){
                                joinArr['' + i] = scrapeResults[e[0]][i];
                        }
                        payload[e[1]] = joinArr;
                    }
                    else{
                        payload[e[1]] = scrapeResults[e[0]][0][e[1]];
                    }

                })
                CliqzHumanWeb.sendMessage(payloadRules, payload);
            }
            else if (payloadRules['type'] == 'query' && payloadRules['results'] == 'scattered'){
                var payload = {};
                payloadRules['fields'].forEach(function(e){
                    if (e.length > 2){
                        var joinArr = {};
                        var counter = 0;
                        e[0].forEach(function(eachPattern){
                            for(var i=0;i<scrapeResults[eachPattern].length;i++){
                                joinArr['' + counter] = scrapeResults[eachPattern][i];
                                counter += 1;
                            }
                        })
                        if(Object.keys(joinArr).length > 0){
                            payload[e[1]] = joinArr;
                        }
                    }
                    else{
                        payload[e[1]] = scrapeResults[e[0]][0][e[1]];
                    }

                })
                CliqzHumanWeb.sendMessage(payloadRules, payload)
            }
    }
    catch(ee){}
    },
    sendMessage: function(payloadRules, payload){
        if (CliqzHumanWeb.debug) {
            CliqzUtils.log("sendMessage" , CliqzHumanWeb.LOG_KEY);
        }
        var c = true;
        var e = "";
        var allKeys =  Object.keys(payload);
        for(e in payloadRules['fields']){
            if (allKeys.indexOf(payloadRules['fields'][e][1]) == -1){
                c = false;
            }
            else{
                allKeys.forEach(function(each_field){
                    if (!(payload[each_field])){
                        c = false;
                    }
                })
            }
        }
        if(c){
            CliqzHumanWeb.telemetry({'type': CliqzHumanWeb.msgType, 'action': payloadRules['action'], 'payload':payload})
        }
        CliqzHumanWeb.messageTemplate = {};
    },
    refineSplitFunc: function(splitString, splitON, arrPos){
        var result = splitString.split(splitON)[arrPos];
        if(result){
            return decodeURIComponent(result);
        }
        else{

            return decodeURIComponent(splitString);
        }
    },
    refineParseURIFunc: function(url, extractType, keyName){
        var result = CliqzHumanWeb.parseUri(url);
        if(extractType == 'key'){
            if(result[keyName]){
                return decodeURIComponent(result[keyName]);
            }
            else{
                return url;
            }
        }
        else if(extractType == 'qs'){
            if(result['queryKey'][keyName]){
                return decodeURIComponent(result['queryKey'][keyName]);
            }
            else{
                return url;
            }
        }

    },
    refineReplaceFunc: function(replaceString, replaceWhat, replaceWith ){
        var result = decodeURIComponent(replaceString.replace("",replaceWhat,replaceWith));
        return result;
    },
    refineMaskUrl: function(url){
        var result = CliqzHumanWeb.maskURL(url);
        return result;
    },
    getTabID: function(){
        try{
            for (var j = 0; j < CliqzHumanWeb.windowsRef.length; j++) {
                
                var gBrowser = CliqzHumanWeb.windowsRef[j].gBrowser;
                var uniqueID = CliqzUtils.getWindow().__SSi + ":" + gBrowser.mCurrentTab._tPos;
                return uniqueID;
            }
        }
        catch(e){
            return null;
        }
    },
    createTable: function(){
            var usafe = "create table if not exists usafe(\
                url VARCHAR(255) PRIMARY KEY NOT NULL,\
                ref VARCHAR(255),\
                last_visit INTEGER,\
                first_visit INTEGER,\
                reason VARCHAR(256), \
                private BOOLEAN DEFAULT 0,\
                checked BOOLEAN DEFAULT 0, \
                payload VARCHAR(4096), \
                ft BOOLEAN DEFAULT 1 \
            )";

            var hash_usafe = "create table if not exists hashusafe(\
                hash VARCHAR(32) PRIMARY KEY NOT NULL,\
                private BOOLEAN DEFAULT 0 \
            )";

            (CliqzHumanWeb.dbConn.executeSimpleSQLAsync || CliqzHumanWeb.dbConn.executeSimpleSQL)(usafe);
            (CliqzHumanWeb.dbConn.executeSimpleSQLAsync || CliqzHumanWeb.dbConn.executeSimpleSQL)(hash_usafe);

    },
    aggregateMetrics:function (metricsBefore, metricsAfter){
        var aggregates =    {"cp": 0,"mm": 0,"kp": 0,"sc": 0,"md": 0};
        if (CliqzHumanWeb.debug) {
            CliqzUtils.log("aggregates: " + JSON.stringify(metricsBefore) + JSON.stringify(metricsAfter), CliqzHumanWeb.LOG_KEY);
        }

        var _keys = Object.keys(aggregates);
        for(var i=0;i<_keys.length;i++){
             aggregates[_keys[i]] = metricsBefore[_keys[i]] + metricsAfter[_keys[i]];
        }
        if (CliqzHumanWeb.debug) {
            CliqzUtils.log("aggregates: " + JSON.stringify(aggregates), CliqzHumanWeb.LOG_KEY);
        }


        return aggregates;
    },
    escapeSQL: function(str) {
        return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function(char) {
        switch (char) {
            case "'":
            return "''";
            default:
            return char;
              
          }
        });
  },
  checkActiveUsage: function(){
    
    var oldUsage = 0;
    try {oldUsage = CliqzUtils.getPref('config_activeUsageCount', 0)} catch(ee){};
    var activeUsage = CliqzHumanWeb.activeUsage + oldUsage;
    if(activeUsage && activeUsage > CliqzHumanWeb.activeUsageThreshold){
        
        var payload = {};
        payload['status'] = true;
        payload['t'] = CliqzHumanWeb.getTime();
        try {var location = CliqzUtils.getPref('config_location', null)} catch(ee){};
        payload['ctry'] = location;
        CliqzHumanWeb.telemetry({'type': CliqzHumanWeb.msgType, 'action': 'alive', 'payload':payload})
        CliqzHumanWeb.activeUsage = 0;
        CliqzUtils.setPref('config_activeUsage', new Date().getTime().toString());
        CliqzUtils.setPref('config_activeUsageCount', 0);
    }
  },
  duplicateEvents: function(arr){
    var duplicate = {};
    var duplicates = {};

    
    arr.forEach(function(i, idx) {
        if (typeof(i) == 'object' && i.action == 'page'){ 
            var d = JSON.stringify(i);
            duplicate[d] = (duplicate[d]||0)+1; 
        }
    });

    Object.keys(duplicate).forEach(function(key){
        if(duplicate[key] > 1){
            duplicates[key] = duplicate[key];
            
        }

    })

    if (Object.keys(duplicates).length > 0) {
        if (CliqzHumanWeb.debug) CliqzUtils.log("duplicate: " + JSON.stringify(duplicates), CliqzHumanWeb.LOG_KEY);
        
        var notificationMsg = {};
        notificationMsg['reason'] = "duplicate elements in trk";
        notificationMsg['payload'] = duplicates;
        CliqzHumanWeb.notification(notificationMsg);
    }
    
  },
  notification: function(payload){
    try {var location = CliqzUtils.getPref('config_location', null)} catch(ee){};
    if(payload && typeof(payload) == 'object'){
        payload['ctry'] = location;
        CliqzHumanWeb.telemetry({'type': CliqzHumanWeb.msgType, 'action': 'telemetry', 'payload': payload});
  
    }
    else{
        if (CliqzHumanWeb.debug) CliqzUtils.log("Not a valid object, not sent to notification", CliqzHumanWeb.LOG_KEY);
    }
  }

};