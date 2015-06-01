'use strict';


const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CliqzAutocomplete'];

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('chrome://cliqzmodules/content/Mixer.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'Result',
  'chrome://cliqzmodules/content/Result.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzResultProviders',
  'chrome://cliqzmodules/content/CliqzResultProviders.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzClusterHistory',
  'chrome://cliqzmodules/content/CliqzClusterHistory.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzCalculator',
  'chrome://cliqzmodules/content/CliqzCalculator.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistoryPattern',
  'chrome://cliqzmodules/content/CliqzHistoryPattern.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzSpellCheck',
  'chrome://cliqzmodules/content/CliqzSpellCheck.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'NewTabUtils',
  'resource://gre/modules/NewTabUtils.jsm');

var prefs = Components.classes['@mozilla.org/preferences-service;1']
                    .getService(Components.interfaces.nsIPrefService)
                    .getBranch('browser.urlbar.');

var CliqzAutocomplete = CliqzAutocomplete || {
    LOG_KEY: 'CliqzAutocomplete',
    TIMEOUT: 1000,
    HISTORY_TIMEOUT: 200,
    SCROLL_SIGNAL_MIN_TIME: 500,
    lastPattern: null,
    lastSearch: '',
    lastResult: null,
    lastSuggestions: null,
    hasUserScrolledCurrentResults: false, 
    lastResultsUpdateTime: null, 
    resultsOverflowHeight: 0, 
    afterQueryCount: 0,
    discardedResults: 0,
    isPopupOpen: false,
    lastPopupOpen: null,
    lastQueryTime: null,
    lastDisplayTime: null,
    lastFocusTime: null,
    highlightFirstElement: false,
    spellCorrectionDict: {},
    spellCorr: {
        'on': false,
        'correctBack': {},
        'override': false,
        'pushed': null
    },
    init: function(){
        CliqzUtils.init();
        CliqzAutocomplete.initProvider();
        CliqzAutocomplete.initResults();

        XPCOMUtils.defineLazyServiceGetter(CliqzAutocomplete.CliqzResults.prototype, 'historyAutoCompleteProvider',
                  '@mozilla.org/autocomplete/search;1?name=history', 'nsIAutoCompleteSearch');

        var reg = Components.manager.QueryInterface(Components.interfaces.nsIComponentRegistrar);
        var CONTRACT_ID = CliqzAutocomplete.CliqzResults.prototype.contractID;
        try{
            reg.unregisterFactory(
                reg.contractIDToCID(CONTRACT_ID),
                reg.getClassObjectByContractID(CONTRACT_ID, Ci.nsISupports)
            )
        }catch(e){}
        var cp = CliqzAutocomplete.CliqzResults.prototype;
        var factory = XPCOMUtils.generateNSGetFactory([CliqzAutocomplete.CliqzResults])(cp.classID);
        reg.registerFactory(cp.classID, cp.classDescription, cp.contractID, factory);

        CliqzUtils.log('initialized', CliqzAutocomplete.LOG_KEY);
    },
    unload: function() {
        var reg = Components.manager.QueryInterface(Components.interfaces.nsIComponentRegistrar);
        var CONTRACT_ID = CliqzAutocomplete.CliqzResults.prototype.contractID;
        try{
          reg.unregisterFactory(
            reg.contractIDToCID(CONTRACT_ID),
            reg.getClassObjectByContractID(CONTRACT_ID, Ci.nsISupports)
          );
        }catch(e){}
    },
    getResultsOrder: function(results){
        return results.map(function(r){
            return r.data.kind;
        });
    },
    
    ProviderAutoCompleteResultCliqz: function(searchString, searchResult,
        defaultIndex, errorDescription) {
        this._searchString = searchString;
        this._searchResult = searchResult;
        this._defaultIndex = defaultIndex;
    },
    
    CliqzResults: function(){},
    resetSpellCorr: function() {
        CliqzAutocomplete.spellCorr = {
            'on': false,
            'correctBack': {},
            'override': false,
            'pushed': null
        }
    },
    initProvider: function(){
        CliqzAutocomplete.ProviderAutoCompleteResultCliqz.prototype = {
            _searchString: '',
            _searchResult: 0,
            _defaultIndex: 0,
            _errorDescription: '',
            _results: [],

            get searchString() { return this._searchString; },
            get searchResult() { return this._searchResult; },
            get defaultIndex() { return this._defaultIndex; },
            get errorDescription() { return this._errorDescription; },
            get matchCount() { return this._results.length; },
            getValueAt: function(index) { return (this._results[index] || {}).val; },
            getFinalCompleteValueAt: function(index) { return null; }, 
            getCommentAt: function(index) { return (this._results[index] || {}).comment; },
            getStyleAt: function(index) { return (this._results[index] || {}).style; },
            getImageAt: function (index) { return ''; },
            getLabelAt: function(index) { return (this._results[index] || {}).label; },
            getDataAt: function(index) { return (this._results[index] || {}).data; },
            QueryInterface: XPCOMUtils.generateQI([  ]),
            setResults: function(results){

                this._results = this.filterUnexpected(results);

                CliqzAutocomplete.lastResult = this;
                var order = CliqzAutocomplete.getResultsOrder(this._results);
                CliqzUtils.setResultOrder(order);
            },

            filterUnexpected: function(results){
                
                var ret=[];
                for(var i=0; i < results.length; i++){
                    var r = results[i];
                    if(r.style == 'cliqz-extra'){
                        if(r.data){
                            if(r.data.template && CliqzUtils.TEMPLATES.hasOwnProperty(r.data.template)===false){
                                
                                continue;
                            }
                        }
                    }

                    
                    
                    
                    

                    ret.push(r);
                }
                return ret;
            }
        }
    },
    
    markResultsDone: function(newResultsUpdateTime) {
        
        if (CliqzAutocomplete.lastResultsUpdateTime) {
            var resultsDisplayTime = Date.now() - CliqzAutocomplete.lastResultsUpdateTime;
            this.sendResultsDoneSignal(resultsDisplayTime);
        }
        
        CliqzAutocomplete.lastResultsUpdateTime = newResultsUpdateTime;
        CliqzAutocomplete.hasUserScrolledCurrentResults = false;
    },
    sendResultsDoneSignal: function(resultsDisplayTime) {
        
        if (resultsDisplayTime > CliqzAutocomplete.SCROLL_SIGNAL_MIN_TIME) {
            var action = {
                type: 'activity',
                action: 'results_done',
                has_user_scrolled: CliqzAutocomplete.hasUserScrolledCurrentResults,
                results_display_time: resultsDisplayTime,
                results_overflow_height: CliqzAutocomplete.resultsOverflowHeight,
                can_user_scroll: CliqzAutocomplete.resultsOverflowHeight > 0
            };
            CliqzUtils.telemetry(action);
        }
    },
    initResults: function(){
        CliqzAutocomplete.CliqzResults.prototype = {
            classID: Components.ID('{59a99d57-b4ad-fa7e-aead-da9d4f4e77c8}'),
            classDescription : 'Cliqz',
            contractID : '@mozilla.org/autocomplete/search;1?name=cliqz-results',
            QueryInterface: XPCOMUtils.generateQI([ Ci.nsIAutoCompleteSearch ]),
            resultsTimer: null,
            historyTimer: null,
            historyTimeout: false,
            instant: [],

            historyTimeoutCallback: function(params) {
                CliqzUtils.log('history timeout', CliqzAutocomplete.LOG_KEY);
                this.historyTimeout = true;
                this.onSearchResult({}, this.historyResults);
            },
            fetchTopSites: function(){
                var results = NewTabUtils.links.getLinks().slice(0, 5);
                if(results.length>0){
                    var top = Result.generic('cliqz-extra', '', null, '', null, '', null, JSON.stringify({topsites:true}));
                    top.data.title = CliqzUtils.getLocalizedString('topSitesTitle');
                    top.data.message = CliqzUtils.getLocalizedString('topSitesMessage');
                    top.data.message1 = CliqzUtils.getLocalizedString('topSitesMessage1');
                    top.data.cliqz_logo = 'chrome://cliqzres/content/skin/img/cliqz.svg';
                    top.data.lastQ = CliqzUtils.getWindow().gBrowser.selectedTab.cliqz;
                    top.data.url = results[0].url;
                    top.data.template = 'topsites';
                    top.data.urls = results.map(function(r, i){
                        var urlDetails = CliqzUtils.getDetailsFromUrl(r.url),
                            logoDetails = CliqzUtils.getLogoDetails(urlDetails);

                        return {
                          url: r.url,
                          href: r.url.replace(urlDetails.path, ''),
                          link: r.url.replace(urlDetails.path, ''),
                          name: urlDetails.name,
                          text: logoDetails.text,
                          style: logoDetails.style,
                          extra: "top-sites-" + i
                        }
                    });
                    this.cliqzResultsExtra = [top];
                }
                this.historyTimeout = true;
                this.pushResults(this.searchString);
            },
            
            onSearchResult: function(search, result) {
                if(!this.startTime) {
                    return; 
                }

                var now = Date.now();

                this.historyResults = result;
                this.latency.history = now - this.startTime;

                
                

                
                
                if(result && (this.isHistoryReady() || this.historyTimeout) && this.mixedResults.matchCount == 0) {
                    CliqzUtils.clearTimeout(this.historyTimer);
                    CliqzHistoryPattern.addFirefoxHistory(result);
                }
            },
            
            
            instantResult: function(search, result) {
                var _res = CliqzClusterHistory.cluster(this.historyResults);
                history_left = _res[0];
                cluster_data = _res[1];

                
                if(cluster_data) {
                    var instant_cluster = Result.generic('cliqz-pattern', cluster_data.url || '', null, '', '', '', cluster_data);
                    instant_cluster.comment += " (instant history cluster)!";

                    this.instant = [instant_cluster];
                    this.pushResults(result.searchString);
                } else {
                    
                    
                    var candidate_idx = -1;
                    var candidate_url = '';

                    var searchString = this.searchString.replace('http://','').replace('https://','');

                    for(var i = 0; this.historyResults && i < this.historyResults.matchCount; i++) {

                        var url = this.historyResults.getLabelAt(i);
                        var url_noprotocol = url.replace('http://','').replace('https://','');

                        var urlparts = CliqzUtils.getDetailsFromUrl(url);

                        
                        if(Result.isValid(url, urlparts) &&
                           url_noprotocol.toLowerCase().indexOf(searchString) != -1) {

                            if(candidate_idx == -1) {
                                
                                CliqzUtils.log("first instant candidate: " + url, CliqzAutocomplete.LOG_KEY)
                                candidate_idx = i;
                                candidate_url = url;
                            } else if(candidate_url.indexOf(url_noprotocol) != -1 &&
                                      candidate_url != url) {
                                
                                CliqzUtils.log("found shorter instant candidate: " + url, CliqzAutocomplete.LOG_KEY)
                                candidate_idx = i;
                                candidate_url = url;
                            }
                        }
                    }

                    if(candidate_idx != -1) {
                        var style = this.historyResults.getStyleAt(candidate_idx),
                            value = this.historyResults.getValueAt(candidate_idx),
                            image = this.historyResults.getImageAt(candidate_idx),
                            comment = this.historyResults.getCommentAt(candidate_idx),
                            label = this.historyResults.getLabelAt(candidate_idx);

                        var instant = Result.generic(style, value, image, comment, label, this.searchString);
                        instant.comment += " (instant history)!";

                        this.historyResults.removeValueAt(candidate_idx, false);
                        this.instant = [instant];
                    } else {
                        this.instant = [];
                    }
                    this.pushResults(result.searchString);
                }
            },
            isHistoryReady: function() {
                if(this.historyResults &&
                   this.historyResults.searchResult != this.historyResults.RESULT_NOMATCH_ONGOING &&
                   this.historyResults.searchResult != this.historyResults.RESULT_SUCCESS_ONGOING)
                    return true;
                else
                    return false;
            },
            historyPatternCallback: function(res) {
                
                if(this.mixedResults.matchCount > 0) return;

                if (res.query == this.searchString && CliqzHistoryPattern.PATTERN_DETECTION_ENABLED) {
                    CliqzAutocomplete.lastPattern = res;

                    
                    var instant = CliqzHistoryPattern.createInstantResult(res, this.searchString);
                    if(instant)
                        this.instant = [instant];
                    else
                        this.instant = [];

                    var latency = 0;
                    if (CliqzHistoryPattern.latencies[res.query]) {
                        latency = (new Date()).getTime() - CliqzHistoryPattern.latencies[res.query];
                    }
                    this.latency.patterns = latency;

                    this.pushResults(this.searchString);
                }
            },
            pushTimeoutCallback: function(params) {
                CliqzUtils.log("pushResults timeout", CliqzAutocomplete.LOG_KEY);
                this.pushResults(params);
            },
            
            pushResults: function(q) {
                
                

                if(q.length != 0 && CliqzUtils.isUrlBarEmpty())
                    return;

                if(q == this.searchString && this.startTime != null){ 
                    var now = Date.now();

                    if((now > this.startTime + CliqzAutocomplete.TIMEOUT) || 
                       (this.isHistoryReady() || this.historyTimeout) && 
                       this.cliqzResults) { 
                        

                        CliqzUtils.clearTimeout(this.resultsTimer);
                        CliqzUtils.clearTimeout(this.historyTimer);

                        this.mixResults(false);

                        this.latency.mixed = Date.now() - this.startTime;

                        this.listener.onSearchResult(this, this.mixedResults);

                        this.latency.all = Date.now() - this.startTime;
                        if(this.cliqzResults)
                            var country = this.cliqzCountry;

                        this.sendResultsSignal(this.mixedResults._results, false, CliqzAutocomplete.isPopupOpen, country);

                        this.startTime = null;
                        this.resultsTimer = null;
                        this.historyTimer = null;
                        this.cliqzResults = null;
                        this.cliqzResultsExtra = null;
                        this.cliqzCache = null;
                        this.historyResults = null;
                        this.instant = [];
                        return;
                    } else if(this.isHistoryReady()) {
                        

                        this.latency.mixed = Date.now() - this.startTime;

                        this.mixResults(true);

                        
                        
                        this.mixedResults.matchCount && this.listener.onSearchResult(this, this.mixedResults);

                        this.latency.all = Date.now() - this.startTime;
                        
                        this.sendResultsSignal(this.mixedResults._results, true, CliqzAutocomplete.isPopupOpen);
                    } else {
                        
                    }
                }
            },
            
            cliqzResultFetcher: function(req, q) {
                
                if(q != this.searchString) {
                    this.discardedResults += 1; 
                } else {
                    this.latency.backend = Date.now() - this.startTime;
                    var results = [];
                    var country = "";

                    var json = JSON.parse(req.response);
                    results = json.result || [];
                    country = json.country;
                    this.cliqzResultsExtra = []

                    if(json.images && json.images.results && json.images.results.length >0){
                        var imgs = json.images.results.filter(function(r){
                            
                            return Object.keys(r).length != 0;
                        });

                        this.cliqzResultsExtra =imgs.map(Result.cliqzExtra);
                    }

                    var hasExtra = function(el){
                        if(!el || !el.results || el.results.length == 0) return false;
                        el.results = el.results.filter(function(r){
                            
                            return r.hasOwnProperty('url');
                        })

                        return el.results.length != 0;
                    }

                    if(hasExtra(json.extra)) {
                        this.cliqzResultsExtra = json.extra.results.map(Result.cliqzExtra);
                    }
                    this.latency.cliqz = json.duration;

                    this.cliqzResults = results.filter(function(r){
                        
                        return r.url != undefined && r.url != '';
                    });

                    this.cliqzCountry = country;
                }
                this.pushResults(q);
            },
            createFavicoUrl: function(url){
                return 'http://cdnfavicons.cliqz.com/' +
                        url.replace('http://','').replace('https://','').split('/')[0];
            },
            
            mixResults: function(only_instant) {
                var results = Mixer.mix(
                            this.searchString,
                            this.cliqzResults,
                            this.cliqzResultsExtra,
                            this.instant,
                            this.customResults,
                            only_instant
                    );
                CliqzAutocomplete.lastResultIsInstant = only_instant;
                CliqzAutocomplete.afterQueryCount = 0;

                this.mixedResults.setResults(results);
            },
            analyzeQuery: function(q){
                var parts = CliqzResultProviders.getCustomResults(q);
                this.customResults = parts[1];
                return parts[0];
            },
            startSearch: function(searchString, searchParam, previousResult, listener) {
                CliqzAutocomplete.lastQueryTime = Date.now();
                CliqzAutocomplete.lastDisplayTime = null;
                CliqzAutocomplete.lastResult = null;
                CliqzAutocomplete.lastSuggestions = null;
                this.oldPushLength = 0;
                this.customResults = null;
                this.latency = {
                    cliqz: null,
                    history: null,
                    backend: null,
                    mixed: null,
                    all: null
                };

                CliqzUtils.log('search: ' + searchString, CliqzAutocomplete.LOG_KEY);

                var action = {
                    type: 'activity',
                    action: 'key_stroke',
                    current_length: searchString.length
                };
                CliqzUtils.telemetry(action);

                
                CliqzAutocomplete.lastSearch = searchString;
                searchString = this.analyzeQuery(searchString);

                
                var urlbar = CliqzUtils.getWindow().document.getElementById('urlbar');
                if (!CliqzAutocomplete.spellCorr.override &&
                    urlbar.selectionEnd == urlbar.selectionStart &&
                    urlbar.selectionEnd == urlbar.value.length) {
                    var parts = CliqzSpellCheck.check(searchString);
                    var newSearchString = parts[0];
                    var correctBack = parts[1];
                    for (var c in correctBack) {
                        CliqzAutocomplete.spellCorr.correctBack[c] = correctBack[c];
                    }
                } else {
                    
                    var newSearchString = searchString;
                }
                this.wrongSearchString = searchString;
                if (newSearchString != searchString) {
                    
                    var action = {
                        type: 'activity',
                        action: 'spell_correction',
                        current_length: searchString.length
                    }
                    CliqzUtils.telemetry(action);
                    CliqzAutocomplete.spellCorr.on = true;
                    searchString = newSearchString;
                }
                this.cliqzResults = null;
                this.cliqzResultsExtra = null;
                this.cliqzCountry = null;
                this.cliqzCache = null;
                this.historyResults = null;
                this.instant = [];

                this.listener = listener;
                this.searchString = searchString;
                this.searchStringSuggest = null;

                this.mixedResults = new CliqzAutocomplete.ProviderAutoCompleteResultCliqz(
                        this.searchString,
                        Ci.nsIAutoCompleteResult.RESULT_SUCCESS,
                        -2, 
                        '');

                this.startTime = Date.now();
                this.mixedResults.suggestionsRecieved = false;
                
                this.cliqzResultFetcher = this.cliqzResultFetcher.bind(this);
                this.pushResults = this.pushResults.bind(this);
                this.historyTimeoutCallback = this.historyTimeoutCallback.bind(this);
                this.pushTimeoutCallback = this.pushTimeoutCallback.bind(this);
                this.historyPatternCallback = this.historyPatternCallback.bind(this);

                CliqzHistoryPattern.historyCallback = this.historyPatternCallback;

                CliqzUtils.log("called once " + urlbar.value + ' ' + searchString , "spell corr")
                if(searchString.trim().length){
                    
                    CliqzUtils.getCliqzResults(searchString, this.cliqzResultFetcher);

                    
                    if (CliqzAutocomplete.spellCorr.on && !CliqzAutocomplete.spellCorr.override) {
                        this.suggestionsRecieved = true;
                        
                        for (var p in CliqzAutocomplete.spellCorr.correctBack) {
                            if (this.wrongSearchString.indexOf(CliqzAutocomplete.spellCorr.correctBack[p]) == -1) {
                                this.wrongSearchString = this.wrongSearchString.replace(p, CliqzAutocomplete.spellCorr.correctBack[p]);
                            }
                        }
                        this.cliqzSuggestions = [searchString, this.wrongSearchString];
                        CliqzAutocomplete.lastSuggestions = this.cliqzSuggestions;
                        CliqzUtils.log(CliqzAutocomplete.lastSuggestions, 'spellcorr');
                        urlbar.mInputField.value = searchString;
                    } else {
                        
                    }
                    
                    CliqzHistoryPattern.detectPattern(searchString);

                    CliqzUtils.clearTimeout(this.resultsTimer);
                    this.resultsTimer = CliqzUtils.setTimeout(this.pushTimeoutCallback, CliqzAutocomplete.TIMEOUT, this.searchString);
                } else {
                    this.cliqzResults = [];
                    this.cliqzResultsExtra = [];
                    this.cliqzCountry = "";
                    this.customResults = [];
                    CliqzAutocomplete.resetSpellCorr();
                }

                
                if(searchString.trim().length == 0 && CliqzAutocomplete.sessionStart ){
                    CliqzAutocomplete.sessionStart = false;
                    this.fetchTopSites = this.fetchTopSites.bind(this);
                    NewTabUtils.links.populateCache(this.fetchTopSites)
                } else {
                    this.historyAutoCompleteProvider.startSearch(searchString, searchParam, null, this);
                    CliqzUtils.clearTimeout(this.historyTimer);
                    this.historyTimer = CliqzUtils.setTimeout(this.historyTimeoutCallback, CliqzAutocomplete.HISTORY_TIMEOUT, this.searchString);
                    this.historyTimeout = false;
                }
            },
            
            stopSearch: function() {
                CliqzUtils.clearTimeout(this.resultsTimer);
                CliqzUtils.clearTimeout(this.historyTimer);
            },

            sendResultsSignal: function(results, instant, popup, country) {
                var action = {
                    type: 'activity',
                    action: 'results',
                    query_length: CliqzAutocomplete.lastSearch.length,
                    result_order: results.map(function(r){ return r.data.kind; }),
                    instant: instant,
                    popup: CliqzAutocomplete.isPopupOpen ? true : false,
                    latency_cliqz: this.latency.cliqz,
                    latency_history: this.latency.history,
                    latency_patterns: this.latency.patterns,
                    latency_backend: this.latency.backend,
                    latency_mixed: this.latency.mixed,
                    latency_all: this.startTime? Date.now() - this.startTime : null,
                    discarded: this.discardedResults,
                    v: 1
                };

                
                this.discardedResults = 0;

                if (CliqzAutocomplete.lastAutocompleteType) {
                  action.autocompleted = CliqzAutocomplete.lastAutocompleteType;
                }
                if(country)
                    action.country = country;

                if (action.result_order.indexOf('C') > -1 && CliqzUtils.getPref('logCluster', false)) {
                    action.Ctype = CliqzUtils.getClusteringDomain(results[0].val);
                }

                if (CliqzAutocomplete.isPopupOpen) {
                    
                    CliqzAutocomplete.markResultsDone(Date.now());
                }

                
                CliqzAutocomplete.lastPopupOpen = CliqzAutocomplete.isPopupOpen;
                if (results.length > 0) {
                    CliqzAutocomplete.lastDisplayTime = Date.now();
                }
                CliqzUtils.telemetry(action);
            }
        }
    }
}