'use strict';

Components.utils.import('resource://gre/modules/Services.jsm');

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzLanguage',
  'chrome://cliqzmodules/content/CliqzLanguage.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzResultProviders',
  'chrome://cliqzmodules/content/CliqzResultProviders.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzAutocomplete',
  'chrome://cliqzmodules/content/CliqzAutocomplete.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzABTests',
  'chrome://cliqzmodules/content/CliqzABTests.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'Result',
  'chrome://cliqzmodules/content/Result.jsm');

var EXPORTED_SYMBOLS = ['CliqzUtils'];

var VERTICAL_ENCODINGS = {
    'people':'p',
    'census':'c',
    'news':'n',
    'video':'v',
    'hq':'h',
    'shopping':'s',
    'science':'k',
    'gaming':'g',
    'dictionary':'l',
    'qaa':'q',
    'bm': 'm'
};

var COLOURS = ['#ffce6d','#ff6f69','#96e397','#5c7ba1','#bfbfbf','#3b5598','#fbb44c','#00b2e5','#b3b3b3','#99cccc','#ff0027','#999999'],
    LOGOS = ['wikipedia', 'google', 'facebook', 'youtube', 'duckduckgo', 'sternefresser', 'zalando', 'bild', 'web', 'ebay', 'gmx', 'amazon', 't-online', 'wiwo', 'wwe', 'weightwatchers', 'rp-online', 'wmagazine', 'chip', 'spiegel', 'yahoo', 'paypal', 'imdb', 'wikia', 'msn', 'autobild', 'dailymotion', 'hm', 'hotmail', 'zeit', 'bahn', 'softonic', 'handelsblatt', 'stern', 'cnn', 'mobile', 'aetv', 'postbank', 'dkb', 'bing', 'adobe', 'bbc', 'nike', 'starbucks', 'techcrunch', 'vevo', 'time', 'twitter', 'weatherunderground', 'xing', 'yelp', 'yandex', 'weather', 'flickr'],
    BRANDS_DATABASE = { domains: {}, palette: ["999"] }, brand_loaded = false,
    MINUTE = 60*1e3;

var CliqzUtils = {
  LANGS:                          {'de':'de', 'en':'en', 'fr':'fr'},
  IFRAME_SHOW:                    false,
  HOST:                           'https://cliqz.com',
  RESULTS_PROVIDER:               'https://newbeta.cliqz.com/api/v1/results?q=',
  RESULT_PROVIDER_ALWAYS_BM:      false,
  RESULTS_PROVIDER_LOG:           'https://newbeta.cliqz.com/api/v1/logging?q=',
  RESULTS_PROVIDER_PING:          'https://newbeta.cliqz.com/ping',
  CONFIG_PROVIDER:                'https://newbeta.cliqz.com/api/v1/config',
  SAFE_BROWSING:                  'https://safe-browsing.cliqz.com',
  LOG:                            'https://logging.cliqz.com',
  CLIQZ_URL:                      'https://cliqz.com/',
  UPDATE_URL:                     'chrome://cliqz/content/update.html',
  TUTORIAL_URL:                   'https://cliqz.com/home/onboarding',
  NEW_TUTORIAL_URL:               'chrome://cliqz/content/onboarding/onboarding.html',
  INSTAL_URL:                     'https://cliqz.com/code-verified',
  CHANGELOG:                      'https://cliqz.com/home/changelog',
  UNINSTALL:                      'https://cliqz.com/home/offboarding',
  PREF_STRING:                    32,
  PREF_INT:                       64,
  PREF_BOOL:                      128,
  PREFERRED_LANGUAGE:             null,
  BRANDS_DATABASE_VERSION:        1427124611539,
  TEMPLATES: {'bitcoin': 1, 'calculator': 1, 'clustering': 1, 'currency': 1, 'custom': 1, 'emphasis': 1, 'empty': 1,
      'generic': 1,  'main': 1, 'results': 1, 'text': 1, 'series': 1,
      'spellcheck': 1,
      'pattern-h1': 3, 'pattern-h2': 2, 'pattern-h3': 1, 'pattern-h3-cluster': 1,
      'airlinesEZ': 2, 'entity-portal': 3, 'topsites': 3,
      'celebrities': 2, 'Cliqz': 2, 'entity-generic': 2, 'noResult': 3, 'stocks': 2, 'weatherAlert': 3, 'entity-news-1': 3,'entity-video-1': 3,
      'entity-search-1': 2, 'entity-banking-2': 2, 'flightStatusEZ-2': 2,  'weatherEZ': 2, 'weatherEZ-promise': 2, 'commicEZ': 3,
      'news' : 1, 'people' : 1, 'video' : 1, 'hq' : 1,
      'ligaEZ1Game': 2, 'ligaEZUpcomingGames': 3, 'ligaEZTable': 3,
      'recipe': 3, 'rd-h3-w-rating': 1
  },
  cliqzPrefs: Components.classes['@mozilla.org/preferences-service;1']
                .getService(Components.interfaces.nsIPrefService).getBranch('extensions.cliqz.'),
  genericPrefs: Components.classes['@mozilla.org/preferences-service;1']
                .getService(Components.interfaces.nsIPrefBranch),
  _log: Components.classes['@mozilla.org/consoleservice;1']
      .getService(Components.interfaces.nsIConsoleService),
  init: function(win){
    if (win && win.navigator) {
        
        var nav = win.navigator;
        CliqzUtils.PREFERRED_LANGUAGE = nav.language || nav.userLanguage || nav.browserLanguage || nav.systemLanguage || 'en',
        CliqzUtils.loadLocale(CliqzUtils.PREFERRED_LANGUAGE);
    }

    if(!brand_loaded){
      brand_loaded = true;

      var config = this.getPref("config_logoVersion"), dev = this.getPref("brands-database-version");

      if (dev) this.BRANDS_DATABASE_VERSION = dev
      else if (config) this.BRANDS_DATABASE_VERSION = config

      var brandsDataUrl = "https://cdn.cliqz.com/brands-database/database/" + this.BRANDS_DATABASE_VERSION + "/data/database.json",
          retryPattern = [60*MINUTE, 10*MINUTE, 5*MINUTE, 2*MINUTE, MINUTE];

      (function getLogoDB(){
          CliqzUtils && CliqzUtils.httpGet(brandsDataUrl,
          function(req){ BRANDS_DATABASE = JSON.parse(req.response); },
          function(){
            var retry;
            if(retry = retryPattern.pop()){
              CliqzUtils.setTimeout(getLogoDB, retry);
            }
          }
          , MINUTE/2);
      })();
    }

    

    
    CliqzUtils.CUSTOM_RESULTS_PROVIDER = CliqzUtils.getPref("customResultsProvider", null);
    CliqzUtils.CUSTOM_RESULTS_PROVIDER_PING = CliqzUtils.getPref("customResultsProviderPing", null);
    CliqzUtils.CUSTOM_RESULTS_PROVIDER_LOG = CliqzUtils.getPref("customResultsProviderLog", null);

    
    CliqzUtils.setOurOwnPrefs();

    CliqzUtils.log('Initialized', 'CliqzUtils');
  },
  getLocalStorage: function(url) {
    return false;
  },
  setSupportInfo: function(status){
    var info = JSON.stringify({
          version: CliqzUtils.extensionVersion,
          status: status != undefined?status:"active"
        }),
        sites = ["http://cliqz.com","https://cliqz.com"]

    sites.forEach(function(url){
        var ls = CliqzUtils.getLocalStorage(url)

        if (ls) ls.setItem("extension-info",info)
    })
  },
  getLogoDetails: function(urlDetails){
    var base = urlDetails.name,
        baseCore = base.replace(/[^0-9a-z]/gi,""),
        check = function(host,rule){
          var address = host.lastIndexOf(base), parseddomain = host.substr(0,address) + "$" + host.substr(address + base.length)

          return parseddomain.indexOf(rule) != -1
        },
        result = {},
        domains = BRANDS_DATABASE.domains;



    if(base.length == 0)
      return result;

    if (base == "IP") result = { text: "IP", backgroundColor: "#ff0" }

    else if (domains[base]) {
      for (var i=0,imax=domains[base].length;i<imax;i++) {
        var rule = domains[base][i] 

        if (i == imax - 1 || check(urlDetails.host,rule.r)) {
          result = {
            backgroundColor: rule.b?rule.b:null,
            backgroundImage: rule.l?"url(https://cdn.cliqz.com/brands-database/database/" + this.BRANDS_DATABASE_VERSION + "/logos/" + base + "/" + rule.r + ".svg)":"",
            text: rule.t,
            color: rule.c?"":"#fff"
          }

          break
        }
      }
    }

    result.text = result.text || (baseCore.length > 1 ? ((baseCore[0].toUpperCase() + baseCore[1].toLowerCase())) : "")
    result.backgroundColor = result.backgroundColor || BRANDS_DATABASE.palette[base.split("").reduce(function(a,b){ return a + b.charCodeAt(0) },0) % BRANDS_DATABASE.palette.length]

    var colorID = BRANDS_DATABASE.palette.indexOf(result.backgroundColor),
        buttonClass = BRANDS_DATABASE.buttons && colorID != -1 && BRANDS_DATABASE.buttons[colorID]?BRANDS_DATABASE.buttons[colorID]:10

    result.buttonsClass = "cliqz-brands-button-" + buttonClass
    result.style = "background-color: #" + result.backgroundColor + ";color:" + (result.color || '#fff') + ";"


    if (result.backgroundImage) result.style += "background-image:" + result.backgroundImage + "; text-indent: -10em;"

    return result
  },
  httpHandler: function(method, url, callback, onerror, timeout, data){
    var req = Components.classes['@mozilla.org/xmlextras/xmlhttprequest;1'].createInstance();
    req.open(method, url, true);
    req.overrideMimeType('application/json');
    req.onload = function(){
      if(!parseInt) return; 

      var statusClass = parseInt(req.status / 100);
      if(statusClass == 2 || statusClass == 3 || statusClass == 0 ){
        callback && callback(req);
      } else {
        CliqzUtils.log( "loaded with non-200 " + url + " (status=" + req.status + " " + req.statusText + ")", "CliqzUtils.httpHandler");
        onerror && onerror();
      }
    }
    req.onerror = function(){
      if(CliqzUtils){
        CliqzUtils.log( "error loading " + url + " (status=" + req.status + " " + req.statusText + ")", "CliqzUtils.httpHandler");
        onerror && onerror();
      }
    }
    req.ontimeout = function(){
      if(CliqzUtils){ 
        CliqzUtils.log( "timeout for " + url, "CliqzUtils.httpHandler");
        onerror && onerror();
      }
    }

    if(callback){
      if(timeout){
        req.timeout = parseInt(timeout)
      } else {
        req.timeout = (method == 'POST'? 10000 : 1000);
      }
    }

    req.send(data);
    return req;
  },
  httpGet: function(url, callback, onerror, timeout){
    return CliqzUtils.httpHandler('GET', url, callback, onerror, timeout);
  },
  httpPost: function(url, callback, data, onerror, timeout) {
    return CliqzUtils.httpHandler('POST', url, callback, onerror, timeout, data);
  },
  
  loadResource: function(url, callback, onerror) {
    try {
        return CliqzUtils.httpGet(url, callback, onerror, 3000);
    } catch (e) {
      CliqzUtils.log("Could not load resource " + url + " from the xpi",
                     "CliqzUtils.httpHandler");
      onerror && onerror();
    }
  },
  getPrefs: function(){
    var prefs = {},
        cqz = CliqzUtils.cliqzPrefs.getChildList('');
    for(var i=0; i<cqz.length; i++){
      var pref = cqz[i];
      prefs[pref] = CliqzUtils.getPref(pref);
    }
    return prefs;
  },
  getPref: function(pref, notFound){
    try{
      var prefs = CliqzUtils.cliqzPrefs;
      switch(prefs.getPrefType(pref)) {
        case CliqzUtils.PREF_BOOL: return prefs.getBoolPref(pref);
        case CliqzUtils.PREF_STRING: return prefs.getCharPref(pref);
        case CliqzUtils.PREF_INT: return prefs.getIntPref(pref);
        default: return notFound;
      }
    } catch(e){
      return notFound;
    }
  },
  setPref: function(pref, val){
    switch (typeof val) {
      case 'boolean':
        CliqzUtils.cliqzPrefs.setBoolPref(pref, val);
        break;
      case 'number':
        CliqzUtils.cliqzPrefs.setIntPref(pref, val);
        break;
      case 'string':
        CliqzUtils.cliqzPrefs.setCharPref(pref, val);
        break;
      }
  },
  log: function(msg, key){
    if(CliqzUtils && CliqzUtils.getPref('showConsoleLogs', false)){
      var ignore = JSON.parse(CliqzUtils.getPref('showConsoleLogsIgnore', '[]'))
      if(ignore.indexOf(key) == -1) 
        CliqzUtils._log.logStringMessage(
          'CLIQZ ' + (new Date()).toISOString() + (key? ' ' + key : '') + ': ' +
          (typeof msg == 'object'? JSON.stringify(msg): msg)
        );
    }
  },
  getDay: function() {
    return Math.floor(new Date().getTime() / 86400000);
  },
  
  rand: function(len, _space){
      var ret = '', i,
          space = _space || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
          sLen = space.length;

      for(i=0; i < len; i++ )
          ret += space.charAt(Math.floor(Math.random() * sLen));

      return ret;
  },
  hash: function(s){
    return s.split('').reduce(function(a,b){ return (((a<<4)-a)+b.charCodeAt(0)) & 0xEFFFFFF}, 0)
  },
  cleanMozillaActions: function(url){
    if(url.indexOf("moz-action:") == 0) {
        var [, action, param] = url.match(/^moz-action:([^,]+),(.*)$/);
        url = param;
    }
    return url;
  },
  cleanUrlProtocol: function(url, cleanWWW){
    if(!url) return '';

    var protocolPos = url.indexOf('://');

    
    if(protocolPos != -1 && protocolPos <= 6)
      url = url.split('://')[1];

    
    if(cleanWWW && url.toLowerCase().indexOf('www.') == 0)
      url = url.slice(4);

    return url;
  },
  getDetailsFromUrl: function(originalUrl){
    originalUrl = CliqzUtils.cleanMozillaActions(originalUrl);
    
    var url = originalUrl,
        name = '',
        tld = '',
        subdomains = [],
        path = '',
        query ='',
        fragment = '',
        ssl = originalUrl.indexOf('https') == 0;

    
    url = CliqzUtils.cleanUrlProtocol(url, false);
    var scheme = originalUrl.replace(url, '').replace('//', '');

    
    var host = url.split(/[\/\#\?]/)[0].toLowerCase();
    var path = url.replace(host,'');

    
    var userpass_host = host.split('@');
    if(userpass_host.length > 1)
      host = userpass_host[1];

    
    var port = "";
    var isIPv4 = CliqzUtils.isIPv4(host);
    var isIPv6 = CliqzUtils.isIPv6(host);

    var indexOfColon = host.indexOf(":");
    if ((!isIPv6 || isIPv4) && indexOfColon >= 0) {
      port = host.substr(indexOfColon+1);
      host = host.substr(0,indexOfColon);
    }
    else if (isIPv6) {
      
      var endOfIP = host.indexOf(']:');
      if (endOfIP >= 0) {
        port = host.split(']:')[1];
        host = host.split(']:')[0].replace('[','').replace(']','');
      }
    }

    
    var query = '';
    var query_idx = path.indexOf('?');
    if(query_idx != -1) {
      query = path.substr(query_idx+1);
    }

    var fragment = '';
    var fragment_idx = path.indexOf('#');
    if(fragment_idx != -1) {
      fragment = path.substr(fragment_idx+1);
    }

    
    path = path.replace('?' + query, '');
    path = path.replace('#' + fragment, '');
    query = query.replace('#' + fragment, '');

    
    var extra = path;
    if(query)
      extra += "?" + query;
    if(fragment)
      extra += "#" + fragment;

    
    if (!CliqzUtils.isIPv4(host) && !CliqzUtils.isIPv6(host) && !CliqzUtils.isLocalhost(host) ) {
      try {
        var eTLDService = Components.classes["@mozilla.org/network/effective-tld-service;1"]
                                    .getService(Components.interfaces.nsIEffectiveTLDService);

        tld = eTLDService.getPublicSuffixFromHost(host);

        
        name = host.slice(0, -(tld.length+1)).split('.').pop(); 

        
        var name_tld = name + "." + tld;
        subdomains = host.slice(0, -name_tld.length).split(".").slice(0, -1);

        
        
        
        
      } catch(e){
        name = "";
        host = "";
        
      }
    }
    else {
      name = CliqzUtils.isLocalhost(host) ? "localhost" : "IP";
    }

    var urlDetails = {
              scheme: scheme,
              name: name,
              domain: tld ? name + '.' + tld : '',
              tld: tld,
              subdomains: subdomains,
              path: path,
              query: query,
              fragment: fragment,
              extra: extra,
              host: host,
              ssl: ssl,
              port: port
        };

    return urlDetails;
  },
  _isUrlRegExp: /^(([a-z\d]([a-z\d-]*[a-z\d]))\.)+[a-z]{2,}(\:\d+)?$/i,
  isUrl: function(input){
    
    var protocolPos = input.indexOf('://');
    if(protocolPos != -1 && protocolPos <= 6){
      input = input.slice(protocolPos+3)
    }
    
    input = input.split('/')[0];
    
    return CliqzUtils._isUrlRegExp.test(input);
  },


  
  isIPv4: function(input) {
    var ipv4_part = "0*([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])"; 
    var ipv4_regex = new RegExp("^" + ipv4_part + "\\."+ ipv4_part + "\\."+ ipv4_part + "\\."+ ipv4_part
    + "([:]([0-9])+)?$"); 
    return ipv4_regex.test(input);
  },

  isIPv6: function(input) {

    
    var ipv6_regex = new RegExp("^\\[?(([0-9]|[a-f]|[A-F])*[:.]+([0-9]|[a-f]|[A-F])+[:.]*)+[\\]]?([:][0-9]+)?$")
    return ipv6_regex.test(input);

    
  },

  isLocalhost: function(host) {
    if (host == "localhost") return true;
    if (CliqzUtils.isIPv4(host) && host.substr(0,3) == "127") return true;
    if (CliqzUtils.isIPv6(host) && host == "::1") return true;

    return false;

  },

  
  isSearch: function(value){
    if(CliqzUtils.isUrl(value)){
       return CliqzUtils.getDetailsFromUrl(value).host.indexOf('google') === 0 ? true: false;
    }
    return false;
  },
  
  isCompleteUrl: function(input){
    var pattern = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
    if(!pattern.test(input)) {
      return false;
    } else {
      return true;
    }
  },
  _resultsReq: null,
  
  pingCliqzResults: function(){
    if(CliqzUtils.CUSTOM_RESULTS_PROVIDER_PING){
      
      CliqzUtils.httpHandler('HEAD', CliqzUtils.CUSTOM_RESULTS_PROVIDER_PING, null, function(){
        CliqzABTests.disable('1015_A');
      });
    }
    else {
      CliqzUtils.httpHandler('HEAD', CliqzUtils.RESULTS_PROVIDER_PING);
    }
  },
  getCliqzResults: function(q, callback){
    CliqzUtils._querySeq++;
    var url = (CliqzUtils.CUSTOM_RESULTS_PROVIDER || CliqzUtils.RESULTS_PROVIDER) +
              encodeURIComponent(q) +
              CliqzUtils.encodeQuerySession() +
              CliqzUtils.encodeQuerySeq() +
              CliqzLanguage.stateToQueryString() +
              CliqzUtils.encodeResultOrder() +
              CliqzUtils.encodeCountry();

    CliqzUtils._resultsReq = CliqzUtils.httpGet(url,
      function(res){
        callback && callback(res, q);
      }
    );
  },
  
  fetchAndStoreConfig: function(callback){
    CliqzUtils.httpGet(CliqzUtils.CONFIG_PROVIDER,
      function(res){
        if(res && res.response){
          try {
            var config = JSON.parse(res.response);
            for(var k in config){
              CliqzUtils.setPref('config_' + k, config[k]);
            }
          } catch(e){}
        }

        callback();
      },
      callback, 
      2000
    );
  },
  getWorldCup: function(q, callback){
    var WORLD_CUP_API= 'http://worldcup.sfg.io/matches/today/?by_date=asc&rand=' + Math.random();
    CliqzUtils.httpGet(WORLD_CUP_API, function(res){
      callback && callback(res, q);
    });
  },
  encodeCountry: function() {
    
    return '&force_country=true';

    
    
  },
  encodeResultType: function(type){
    if(type.indexOf('action') !== -1) return ['T'];
    else if(type.indexOf('cliqz-results') == 0) return CliqzUtils.encodeCliqzResultType(type);
    else if(type.indexOf('cliqz-pattern') == 0) return ['C'];
    else if(type === 'cliqz-extra') return ['X'];
    else if(type === 'cliqz-series') return ['S'];

    else if(type.indexOf('bookmark') == 0 ||
            type.indexOf('tag') == 0) return ['B'].concat(CliqzUtils.encodeCliqzResultType(type));

    else if(type.indexOf('favicon') == 0 ||
            type.indexOf('history') == 0) return ['H'].concat(CliqzUtils.encodeCliqzResultType(type));

    
    else if(type.indexOf('cliqz-custom') == 0) return type.substr(21);

    return type; 
  },
  
  isPrivateResultType: function(type) {
    var onlyType = type[0].split('|')[0];
    return 'HBTCS'.indexOf(onlyType) != -1 && type.length == 1;
  },
  
  encodeCliqzResultType: function(type){
    var pos = type.indexOf('sources-')
    if(pos != -1)
      return CliqzUtils.encodeSources(type.substr(pos+8));
    else
      return [];
  },
  _querySession: '',
  _querySeq: 0,
  setQuerySession: function(querySession){
    CliqzUtils._querySession = querySession;
    CliqzUtils._querySeq = 0;
  },
  encodeQuerySession: function(){
    return CliqzUtils._querySession.length ? '&s=' + encodeURIComponent(CliqzUtils._querySession) : '';
  },
  encodeQuerySeq: function(){
    return CliqzUtils._querySession.length ? '&n=' + CliqzUtils._querySeq : '';
  },
  encodeSources: function(sources){
    return sources.toLowerCase().split(', ').map(
      function(s){
        if(s.indexOf('cache') == 0) 
          return 'd'
        else
          return VERTICAL_ENCODINGS[s] || s;
      });
  },
  combineSources: function(internal, cliqz){
    var cliqz_sources = cliqz.substr(cliqz.indexOf('sources-'))

    return internal + " " + cliqz_sources
  },
  shouldLoad: function(window){
    
    return true;
  },
  isPrivate: function(window) {
    if(window.cliqzIsPrivate === undefined){
      try {
        
        Components.utils.import('resource://gre/modules/PrivateBrowsingUtils.jsm');
        window.cliqzIsPrivate = PrivateBrowsingUtils.isWindowPrivate(window);
      } catch(e) {
        
        try {
          window.cliqzIsPrivate = Components.classes['@mozilla.org/privatebrowsing;1'].
                                  getService(Components.interfaces.nsIPrivateBrowsingService).
                                  privateBrowsingEnabled;
        } catch(ex) {
          Components.utils.reportError(ex);
          window.cliqzIsPrivate = 5;
        }
      }
    }

    return window.cliqzIsPrivate
  },
  addStylesheetToDoc: function(doc, path) {
    var stylesheet = doc.createElementNS('http://www.w3.org/1999/xhtml', 'h:link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = path;
    stylesheet.type = 'text/css';
    stylesheet.style.display = 'none';
    doc.documentElement.appendChild(stylesheet);

    return stylesheet;
  },
  trk: [],
  trkTimer: null,
  telemetry: function(msg, instantPush) {
    if(!CliqzUtils) return; 
    var current_window = CliqzUtils.getWindow();
    if(msg.type != 'environment' &&
       current_window && CliqzUtils.isPrivate(current_window)) return; 
    CliqzUtils.log(msg, 'Utils.telemetry');
    if(!CliqzUtils.getPref('telemetry', true))return;
    msg.session = CliqzUtils.cliqzPrefs.getCharPref('session');
    msg.ts = Date.now();

    CliqzUtils.trk.push(msg);
    CliqzUtils.clearTimeout(CliqzUtils.trkTimer);
    if(instantPush || CliqzUtils.trk.length % 100 == 0){
      CliqzUtils.pushTelemetry();
    } else {
      CliqzUtils.trkTimer = CliqzUtils.setTimeout(CliqzUtils.pushTelemetry, 60000);
    }
  },
  resultTelemetry: function(query, queryAutocompleted, resultIndex, resultUrl, resultOrder, extra) {
    var current_window = CliqzUtils.getWindow();
    if(current_window && CliqzUtils.isPrivate(current_window)) return; 

    CliqzUtils.setResultOrder(resultOrder);
    var params = encodeURIComponent(query) +
      (queryAutocompleted ? '&a=' + encodeURIComponent(queryAutocompleted) : '') +
      '&i=' + resultIndex +
      (resultUrl ? '&u=' + encodeURIComponent(resultUrl) : '') +
      CliqzUtils.encodeQuerySession() +
      CliqzUtils.encodeQuerySeq() +
      CliqzUtils.encodeResultOrder() +
      (extra ? '&e=' + extra : '')
    CliqzUtils.httpGet(
      (CliqzUtils.CUSTOM_RESULTS_PROVIDER_LOG || CliqzUtils.RESULTS_PROVIDER_LOG) + params);
    CliqzUtils.setResultOrder('');
    CliqzUtils.log(params, 'Utils.resultTelemetry');
  },

  _resultOrder: '',
  setResultOrder: function(resultOrder) {
    CliqzUtils._resultOrder = resultOrder;
  },
  encodeResultOrder: function() {
    return CliqzUtils._resultOrder && CliqzUtils._resultOrder.length ? '&o=' + encodeURIComponent(JSON.stringify(CliqzUtils._resultOrder)) : '';
  },

  _telemetry_req: null,
  _telemetry_sending: [],
  _telemetry_start: undefined,
  TELEMETRY_MAX_SIZE: 500,
  pushTelemetry: function() {
    if(CliqzUtils._telemetry_req) return;

    
    CliqzUtils._telemetry_sending = CliqzUtils.trk.slice(0);
    CliqzUtils.trk = [];

    CliqzUtils._telemetry_start = Date.now();

    CliqzUtils.log('push telemetry data: ' + CliqzUtils._telemetry_sending.length + ' elements', "CliqzUtils.pushTelemetry");
    CliqzUtils._telemetry_req = CliqzUtils.httpPost(CliqzUtils.LOG, CliqzUtils.pushTelemetryCallback, JSON.stringify(CliqzUtils._telemetry_sending), CliqzUtils.pushTelemetryError);
  },
  pushTelemetryCallback: function(req){
    try {
      var response = JSON.parse(req.response);

      if(response.new_session){
        CliqzUtils.setPref('session', response.new_session);
      }
      CliqzUtils._telemetry_sending = [];
      CliqzUtils._telemetry_req = null;
    } catch(e){}
  },
  pushTelemetryError: function(req){
    
    CliqzUtils.log('push telemetry failed: ' + CliqzUtils._telemetry_sending.length + ' elements', "CliqzUtils.pushTelemetry");
    CliqzUtils.trk = CliqzUtils._telemetry_sending.concat(CliqzUtils.trk);

    
    var slice_pos = CliqzUtils.trk.length - CliqzUtils.TELEMETRY_MAX_SIZE + 100;
    if(slice_pos > 0){
      CliqzUtils.log('discarding ' + slice_pos + ' old telemetry data', "CliqzUtils.pushTelemetry");
      CliqzUtils.trk = CliqzUtils.trk.slice(slice_pos);
    }

    CliqzUtils._telemetry_sending = [];
    CliqzUtils._telemetry_req = null;
  },
  
  
  _timers: [],
  _setTimer: function(func, timeout, type, args) {
    var timer = Components.classes['@mozilla.org/timer;1'].createInstance(Components.interfaces.nsITimer);
    CliqzUtils._timers.push(timer);
    var event = {
      notify: function (timer) {
        func.apply(null, args);
        if(CliqzUtils) CliqzUtils._removeTimerRef(timer);
      }
    };
    timer.initWithCallback(event, timeout, type);
    return timer;
  },
  _removeTimerRef: function(timer){
    var i = CliqzUtils._timers.indexOf(timer);
    if (i >= 0) {
      CliqzUtils._timers.splice(CliqzUtils._timers.indexOf(timer), 1);
    }
  },
  setInterval: function(func, timeout) {
    return CliqzUtils._setTimer(func, timeout, Components.interfaces.nsITimer.TYPE_REPEATING_PRECISE, [].slice.call(arguments, 2));
  },
  setTimeout: function(func, timeout) {
    return CliqzUtils._setTimer(func, timeout, Components.interfaces.nsITimer.TYPE_ONE_SHOT, [].slice.call(arguments, 2));
  },
  clearTimeout: function(timer) {
    if (!timer) {
      return;
    }
    timer.cancel();
    CliqzUtils._removeTimerRef(timer);
  },
  clearInterval: this.clearTimeout,
  loadFile: function (fileName, callback) {
    var self = this;
    $.ajax({
        url: fileName,
        dataType: 'text',
        success: callback,
        error: function(data){ callback(data.responseText); }
    });
  },
  locale: {},
  currLocale: null,
  loadLocale : function(lang_locale){
    
    
    
    if (!CliqzUtils.locale.hasOwnProperty('default')) {
        CliqzUtils.loadResource('chrome://cliqzres/content/locale/de/cliqz.json',
            function(req){
                if(CliqzUtils) CliqzUtils.locale['default'] = JSON.parse(req.response);
            });
    }
    if (!CliqzUtils.locale.hasOwnProperty(lang_locale)) {
        CliqzUtils.loadResource('chrome://cliqzres/content/locale/'
                + encodeURIComponent(lang_locale) + '/cliqz.json',
            function(req) {
                if(CliqzUtils){
                  CliqzUtils.locale[lang_locale] = JSON.parse(req.response);
                  CliqzUtils.currLocale = lang_locale;
                }
            },
            function() {
                
                
                var loc = CliqzUtils.getLanguageFromLocale(lang_locale);
                if(CliqzUtils){
                  CliqzUtils.loadResource(
                      'chrome://cliqzres/content/locale/' + loc + '/cliqz.json',
                      function(req) {
                        if(CliqzUtils){
                          CliqzUtils.locale[lang_locale] = JSON.parse(req.response);
                          CliqzUtils.currLocale = lang_locale;
                        }
                      }
                  );
                }
            }
        );
    }
  },
  getLanguageFromLocale: function(locale){
    return locale.match(/([a-z]+)(?:[-_]([A-Z]+))?/)[1];
  },
  getLanguage: function(win){
    return CliqzUtils.LANGS[CliqzUtils.getLanguageFromLocale(win.navigator.language)] || 'en';
  },
  
  
  
  getLocalizedString: function(key){
    var ret = key;

    if (CliqzUtils.currLocale != null && CliqzUtils.locale[CliqzUtils.currLocale]
            && CliqzUtils.locale[CliqzUtils.currLocale][key]) {
        ret = CliqzUtils.locale[CliqzUtils.currLocale][key].message;
    } else if (CliqzUtils.locale['default'] && CliqzUtils.locale['default'][key]) {
        ret = CliqzUtils.locale['default'][key].message;
    }

    if(arguments.length>1){
      var i = 1, args = arguments;
      ret = ret.replace(/{}/g, function(k){ return args[i++] || k; })
    }

    return ret;
  },
  
  
  localizeDoc: function(doc){
    var locale = doc.getElementsByClassName('cliqz-locale');
    for(var i = 0; i < locale.length; i++){
        var el = locale[i];
        el.textContent = CliqzUtils.getLocalizedString(el.getAttribute('key'));
    }
  },
  openOrReuseAnyTab: function(newUrl, oldUrl, onlyReuse) {
    var wm = Components.classes['@mozilla.org/appshell/window-mediator;1']
                     .getService(Components.interfaces.nsIWindowMediator),
        browserEnumerator = wm.getEnumerator('navigator:browser'),
        found = false;

    while (!found && browserEnumerator.hasMoreElements()) {
        var browserWin = browserEnumerator.getNext();
        var tabbrowser = browserWin.gBrowser;

        
        var numTabs = tabbrowser.browsers.length;
        for (var index = 0; index < numTabs; index++) {
            var currentBrowser = tabbrowser.getBrowserAtIndex(index);
            if (currentBrowser.currentURI.spec.indexOf(oldUrl) === 0) {
                var tab = tabbrowser.tabContainer.childNodes[index];
                
                tabbrowser.selectedTab = tab;

                
                tab.linkedBrowser.contentWindow.location.href = newUrl;

                
                browserWin.focus();

                found = true;
                break;
            }
        }
    }
    
    if (!found && !onlyReuse) {
        var recentWindow = wm.getMostRecentWindow("navigator:browser");
        if (recentWindow) {
          
          recentWindow.delayedOpenTab(newUrl, null, null, null, null);
        }
        else {
          
          try {
            window.open(newUrl);
          } catch(e){
            
          }
        }
    }
  },
  version: function(callback){
    var wm = Components.classes['@mozilla.org/appshell/window-mediator;1']
                     .getService(Components.interfaces.nsIWindowMediator),
        win = wm.getMostRecentWindow("navigator:browser");
      win.Application.getExtensions(function(extensions) {
            callback(extensions.get('cliqz@cliqz.com').version);
      });
  },
  extensionRestart: function(){
    var enumerator = Services.wm.getEnumerator('navigator:browser');
    while (enumerator.hasMoreElements()) {
        var win = enumerator.getNext();
        
        if(win.CLIQZ && win.CLIQZ.Core){
          win.CLIQZ.Core.unload(true);
          win.CLIQZ.Core.init();
        }
    }
  },
  isWindows: function(win){
    return win.navigator.userAgent.indexOf('Win') != -1;
  },
  isMac: function(win){
    return win.navigator.userAgent.indexOf('Macintosh') != -1;
  },
  getWindow: function(){
    var wm = Components.classes['@mozilla.org/appshell/window-mediator;1']
                        .getService(Components.interfaces.nsIWindowMediator);
    return wm.getMostRecentWindow("navigator:browser");
  },
  getWindowID: function(){
    var win = CliqzUtils.getWindow();
    var util = win.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIDOMWindowUtils);
    return util.outerWindowID;
  },
  hasClass: function(element, className) {
    return (' ' + element.className + ' ').indexOf(' ' + className + ' ') > -1;
  },
  clone: function(obj) {
    if (null == obj || "object" != typeof obj) return obj;
    var copy = obj.constructor();
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
    }
    return copy;
  },
  performance: {
    backend: function(delay){
        var INPUT='facebook,twitter,maria,randomlong,munich airport,lady gaga iphone case'.split(','),
            reqtimes = {}, statistics = [];

        function send_test(){
          var start = 1000;
          for(var word in INPUT){
            var t = ''
            for(var key in INPUT[word]){
              t+=INPUT[word][key];
              CliqzUtils.log(t, 'PERFORMANCE');
              CliqzUtils.setTimeout(function(t){
                reqtimes[t] = new Date();
                CliqzUtils.getCliqzResults(t, receive_test)
              }, start, t);

              start += delay || (600 + (Math.random() * 100));
            }
          }
          CliqzUtils.setTimeout(function(){
            var stats =[0, 0, 0, 0];
            for(var i=0; i < statistics.length; i++){
                for(var j=0; j<4; j++) stats[j] += statistics[i][j];
            }
            for(var j=0; j<4; j++) stats[j] = (stats[j] / statistics.length).toFixed(2);
            CliqzUtils.log(' ', 'PERFORMANCE');
            CliqzUtils.log('RESULT', 'PERFORMANCE');
            CliqzUtils.log(['total', 'mix', 'sug', 'snip', 'q'].join(' \t \t '), 'PERFORMANCE');
            CliqzUtils.log(stats.join(' \t \t '), 'PERFORMANCE');
          }, start);
          CliqzUtils.log(['total', 'mix', 'sug', 'snip', 'q'].join(' \t \t '), 'PERFORMANCE');
        }

        function receive_test(ev){
          var end = new Date(),
            r = JSON.parse(ev.response),
            q = r['q'],
            end1 = new Date();

          var elapsed = Math.round(end - reqtimes[q]);

          var point = [
              elapsed,
              Math.round(r.duration),
              Math.round(r._suggestions),
              Math.round(r._bulk_snippet_duration),
              q
            ]
          statistics.push(point);

          CliqzUtils.log(point.join(' \t\t '), 'PERFORMANCE');
        }

        send_test()
    }
  },
  getClusteringDomain: function(url) {
    var domains = ['ebay.de',
                   'amazon.de',
                   'github.com',
                   'facebook.com',
                   'klout.com',
                   'chefkoch.de',
                   'bild.de',
                   'basecamp.com',
                   'youtube.com',
                   'twitter.com',
                   'wikipedia.com',]
    for (var index = 0; index < domains.length; index++) {
      if (url.indexOf(domains[index]) > -1) return index;
    }
  },
  getAdultFilterState: function(){
    var data = {
      'conservative': {
              name: CliqzUtils.getLocalizedString('adultConservative'),
              selected: false
      },
      'moderate': {
              name: CliqzUtils.getLocalizedString('adultModerate'),
              selected: false
      },
      'liberal': {
          name: CliqzUtils.getLocalizedString('adultLiberal'),
          selected: false
      }
    };

    data[CliqzUtils.getPref('adultContentFilter', 'moderate')].selected = true;

    return data;
  },
  isUrlBarEmpty: function() {
    var urlbar = CliqzUtils.getWindow().CLIQZ.Core.urlbar;
    return urlbar.value.length == 0;
  },
  
  setOurOwnPrefs: function() {
    var cliqzBackup = CliqzUtils.cliqzPrefs.getPrefType("maxRichResultsBackup");
    if (!cliqzBackup || CliqzUtils.cliqzPrefs.getIntPref("maxRichResultsBackup") == 0) {
      CliqzUtils.cliqzPrefs.setIntPref("maxRichResultsBackup",
          CliqzUtils.genericPrefs.getIntPref("browser.urlbar.maxRichResults"));
      CliqzUtils.genericPrefs.setIntPref("browser.urlbar.maxRichResults", 30);
    }
  },
  
  resetOriginalPrefs: function() {
    var cliqzBackup = CliqzUtils.cliqzPrefs.getPrefType("maxRichResultsBackup");
    if (cliqzBackup) {
      CliqzUtils.log("Loading maxRichResults backup...", "CliqzUtils.setOurOwnPrefs");
      CliqzUtils.genericPrefs.setIntPref("browser.urlbar.maxRichResults",
          CliqzUtils.cliqzPrefs.getIntPref("maxRichResultsBackup"));
      
      CliqzUtils.cliqzPrefs.setIntPref("maxRichResultsBackup", 0);
      CliqzUtils.cliqzPrefs.clearUserPref("maxRichResultsBackup");
    } else {
      CliqzUtils.log("maxRichResults backup does not exist; doing nothing.", "CliqzUtils.setOurOwnPrefs")
    }
  },
  openTabInWindow: function(win, url){
      var tBrowser = win.document.getElementById('content');
      var tab = tBrowser.addTab(url);
      tBrowser.selectedTab = tab;
  },
  
  refreshButtons: function(){
        var enumerator = Services.wm.getEnumerator('navigator:browser');
        while (enumerator.hasMoreElements()) {
            var win = enumerator.getNext()

            try{
                var btn = win.document.getElementById('cliqz-button')
                CliqzUtils.createQbutton(win, btn.children.cliqz_menupopup);
            } catch(e){}
        }
    },
    createQbutton: function(win, menupopup){
        var doc = win.document,
            lang = CliqzUtils.getLanguage(win);

        
        while(menupopup.lastChild)
          menupopup.removeChild(menupopup.lastChild);

        function feedback_FAQ(){
            win.Application.getExtensions(function(extensions) {
                var beVersion = extensions.get('cliqz@cliqz.com').version;
                CliqzUtils.httpGet('chrome://cliqz/content/source.json',
                    function success(req){
                        var source = JSON.parse(req.response).shortName;
                        CliqzUtils.openTabInWindow(win, 'https://cliqz.com/' + lang + '/feedback/' + beVersion + '-' + source);
                    },
                    function error(){
                        CliqzUtils.openTabInWindow(win, 'https://cliqz.com/' + lang + '/feedback/' + beVersion);
                    }
                );
            });
        }

        
        menupopup.appendChild(CliqzUtils.createSimpleBtn(doc, 'Feedback & FAQ', feedback_FAQ));
        menupopup.appendChild(doc.createElement('menuseparator'));

        
      if (!CliqzUtils.getPref("cliqz_core_disabled", false)) {
        menupopup.appendChild(CliqzUtils.createSearchOptions(doc));
        menupopup.appendChild(CliqzUtils.createAdultFilterOptions(doc));
      }
      else {
        menupopup.appendChild(CliqzUtils.createActivateButton(doc));
      }
      menupopup.appendChild(CliqzUtils.createHumanMenu(win));
      
      
    },
    createSearchOptions: function(doc){
        var menu = doc.createElement('menu'),
            menupopup = doc.createElement('menupopup'),
            engines = CliqzResultProviders.getSearchEngines(),
            def = Services.search.currentEngine.name;

        menu.setAttribute('label', CliqzUtils.getLocalizedString('btnDefaultSearchEngine'));

        for(var i in engines){

            var engine = engines[i],
                item = doc.createElement('menuitem');
            item.setAttribute('label', '[' + engine.prefix + '] ' + engine.name);
            item.setAttribute('class', 'menuitem-iconic');
            item.engineName = engine.name;
            if(engine.name == def){
                item.style.listStyleImage = 'url(chrome://cliqzres/content/skin/checkmark.png)';
            }
            item.addEventListener('command', function(event) {
                CliqzResultProviders.setCurrentSearchEngine(event.currentTarget.engineName);
                CliqzUtils.setTimeout(CliqzUtils.refreshButtons, 0);
            }, false);

            menupopup.appendChild(item);
        }

        menu.appendChild(menupopup);

        return menu;
    },
    createAdultFilterOptions: function(doc) {
        var menu = doc.createElement('menu'),
            menupopup = doc.createElement('menupopup');

        menu.setAttribute('label', CliqzUtils.getLocalizedString('result_filter'));

        var filter_levels = CliqzUtils.getAdultFilterState();

        for(var level in filter_levels) {
          var item = doc.createElement('menuitem');
          item.setAttribute('label', filter_levels[level].name);
          item.setAttribute('class', 'menuitem-iconic');

          if(filter_levels[level].selected){
            item.style.listStyleImage = 'url(chrome://cliqzres/content/skin/checkmark.png)';
          }

          item.filter_level = new String(level);
          item.addEventListener('command', function(event) {
            CliqzUtils.setPref('adultContentFilter', this.filter_level.toString());
            CliqzUtils.setTimeout(CliqzUtils.refreshButtons, 0);
          }, false);

          menupopup.appendChild(item);
        };
        menu.appendChild(menupopup);
        return menu;
    },
    createSimpleBtn: function(doc, txt, func){
        var item = doc.createElement('menuitem');
        item.setAttribute('label', txt);
        if(func)
            item.addEventListener('command', func, false);
        else
            item.setAttribute('disabled', 'true');

        return item
    },
    createCheckBoxItem: function(doc, key, label, activeState){
      function optInOut(){
          return CliqzUtils.getPref(key, false) == (activeState == 'undefined' ? true : activeState)?
                           'url(chrome://cliqzres/content/skin/opt-in.svg)':
                           'url(chrome://cliqzres/content/skin/opt-out.svg)';
      }

      var btn = doc.createElement('menuitem');
      btn.setAttribute('label', label || key);
      btn.setAttribute('class', 'menuitem-iconic');
      btn.style.listStyleImage = optInOut();
      btn.addEventListener('command', function(event) {
          CliqzUtils.setPref(key, !CliqzUtils.getPref(key, false));
          btn.style.listStyleImage = optInOut();
      }, false);

      return btn;
    },
    createHumanMenu: function(win){
        var doc = win.document,
            menu = doc.createElement('menu'),
            menuPopup = doc.createElement('menupopup');

        menu.setAttribute('label', 'Human Web');

        var safeSearchBtn = CliqzUtils.createCheckBoxItem(doc, 'dnt', CliqzUtils.getLocalizedString('btnSafeSearch'), false);
        menuPopup.appendChild(safeSearchBtn);

        menuPopup.appendChild(
            CliqzUtils.createSimpleBtn(
                doc,
                CliqzUtils.getLocalizedString('btnSafeSearchDesc'),
                function(){
                        CliqzUtils.openTabInWindow(win, 'https://cliqz.com/privacy#humanweb');
                    }
            )
        );

        menu.appendChild(menuPopup)
        return menu
    },
    createActivateButton: function(doc) {
      var button = doc.createElement('menuitem');
      button.setAttribute('label', CliqzUtils.getLocalizedString('btnActivateCliqz'));
      button.addEventListener('command', function(event) {
        var enumerator = Services.wm.getEnumerator('navigator:browser');
        while (enumerator.hasMoreElements()) {
            var win = enumerator.getNext();
            win.CLIQZ.Core.init();
        }
        CliqzUtils.setPref("cliqz_core_disabled", false);
        CliqzUtils.refreshButtons();

        CliqzUtils.telemetry({
          type: 'setting',
          setting: 'international',
          value: 'activate'
        });
      });
      return button;
    },
    getNoResults: function() {
      var se = [
              {"name": "DuckDuckGo", "base_url": "https://duckduckgo.com"},
              {"name": "Bing", "base_url": "https://www.bing.com/search?q=&pc=MOZI"},
              {"name": "Google", "base_url": "https://www.google.de"},
              {"name": "Google Images", "base_url": "https://images.google.de/"},
              {"name": "Google Maps", "base_url": "https://maps.google.de/"}
          ],
          chosen = new Array();

      for (var i = 0; i< se.length; i++){
          var alt_s_e = CliqzResultProviders.getSearchEngines()[se[i].name];
          if (typeof alt_s_e != 'undefined'){
              se[i].code = alt_s_e.code;
              var url = se[i].base_url || alt_s_e.base_url;
              se[i].style = CliqzUtils.getLogoDetails(CliqzUtils.getDetailsFromUrl(url)).style;
              se[i].text = alt_s_e.prefix.slice(1);

              chosen.push(se[i])
          }
      }


      return Result.cliqzExtra(
              {
                  data:
                  {
                      template:'noResult',
                      text_line1: CliqzUtils.getLocalizedString('noResultTitle'),
                      text_line2: CliqzUtils.getLocalizedString('noResultMessage', Services.search.currentEngine.name),
                      "search_engines": chosen,
                      
                      "cliqz_logo": "chrome://cliqzres/content/skin/img/cliqz.svg"
                  },
                  subType: JSON.stringify({empty:true})
              }
          )
    }
    
};