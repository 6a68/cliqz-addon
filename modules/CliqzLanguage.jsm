'use strict';


const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CliqzLanguage'];

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzAutocomplete',
  'chrome://cliqzmodules/content/CliqzAutocomplete.jsm');


var CliqzLanguage = {
    DOMAIN_THRESHOLD: 3,
    READING_THRESHOLD: 10000,
    LOG_KEY: 'CliqzLanguage',
    currentState: {},
    
    
    cliqzLangPrefs: Components.classes['@mozilla.org/preferences-service;1']
        .getService(Components.interfaces.nsIPrefService).getBranch('extensions.cliqz-lang.'),

    useragentPrefs: Components.classes['@mozilla.org/preferences-service;1']
        .getService(Components.interfaces.nsIPrefService).getBranch('general.useragent.'),

    sendCompSignal: function(actionName, redirect, same_result, result_type, result_position) {
        var action = {
            type: 'performance',
            redirect: redirect,
            action: actionName,
            query_made: CliqzAutocomplete.afterQueryCount,
            popup: CliqzAutocomplete.lastPopupOpen,
            same_result: same_result,
            result_type: result_type,
            result_position: result_position,
            v: 1
        };
        CliqzUtils.telemetry(action)
    },

    listener: {
        currURL: undefined,
        QueryInterface: XPCOMUtils.generateQI(["nsIWebProgressListener", "nsISupportsWeakReference"]),

        onLocationChange: function(aProgress, aRequest, aURI) {
            if (aURI.spec == this.currentURL ||
                !CliqzAutocomplete.lastResult) return;

            this.currentURL = aURI.spec;

            
            var requery = /\.google\..*?[#?&;]q=[^$&]+/; 
            var reref = /\.google\..*?\/(?:url|aclk)\?/; 
            var rerefurl = /url=(.+?)&/; 

            var LR =  CliqzAutocomplete.lastResult['_results'];

            if (requery.test(this.currentURL) && !reref.test(this.currentURL)) {
                CliqzAutocomplete.afterQueryCount += 1;
            }

            if (reref.test(this.currentURL)) { 
                
                var m = this.currentURL.match(rerefurl);
                if (m) {
                    var dest_url = CliqzUtils.cleanUrlProtocol(decodeURIComponent(m[1]), true),
                        found = false;


                    for (var i=0; i < LR.length; i++) {
                        var comp_url = CliqzUtils.cleanUrlProtocol(LR[i]['val'], true);
                        if (dest_url == comp_url) {
                            
                            var resType = CliqzUtils.encodeResultType(LR[i].style || LR[i].type);
                            CliqzLanguage.sendCompSignal('result_compare', true, true, resType, i);
                            CliqzAutocomplete.afterQueryCount = 0;
                            found = true;
                        }
                    }
                    if (!found) {
                        
                        CliqzLanguage.sendCompSignal('result_compare', true, false, null, null);
                    }
                }
            } else if (CliqzAutocomplete.afterQueryCount == 1) {
                
                
                for (var i=0; i < LR.length; i++) {
                    var dest_url = CliqzUtils.cleanUrlProtocol(this.currentURL, true);
                    var comp_url = CliqzUtils.cleanUrlProtocol(LR[i]['val'], true);
                    if (dest_url == comp_url) {
                        var resType = CliqzUtils.encodeResultType(LR[i].style || LR[i].type);
                        CliqzLanguage.sendCompSignal('result_compare', false, true, resType, i);
                    }
                }
            }

            
            CliqzLanguage.window.setTimeout(function(currURLAtTime) {
                try {
                    if(CliqzLanguage){ 
                        var currURL = CliqzLanguage.window.gBrowser.selectedBrowser.contentDocument.location;
                        if (''+currURLAtTime == ''+currURL) {
                            
                            
                            
                            var locale = CliqzLanguage.window.gBrowser.selectedBrowser.contentDocument
                                .getElementsByTagName('html').item(0).getAttribute('lang');
                            if (locale) CliqzLanguage.addLocale(''+currURL,locale);
                        }
                    }
               }
               catch(ee) {
                
                
               }

            }, CliqzLanguage.READING_THRESHOLD, this.currentURL);
        },
        onStateChange: function(aWebProgress, aRequest, aFlag, aStatus) {
        }
    },

    
    init: function(window) {

        CliqzLanguage.window = window;

        if(CliqzLanguage.cliqzLangPrefs.prefHasUserValue('data')) {
            CliqzLanguage.currentState = JSON.parse(CliqzLanguage.cliqzLangPrefs.getCharPref('data'));

            
            var ll = CliqzLanguage.normalizeLocale(CliqzLanguage.useragentPrefs.getCharPref('locale'));
            if (ll) {
                if (CliqzLanguage.currentState[ll]!='locale') {
                    CliqzLanguage.currentState[ll] = 'locale';
                    CliqzLanguage.saveCurrentState();
                }
            }
        }
        else {
            

            var ll = CliqzLanguage.normalizeLocale(CliqzLanguage.useragentPrefs.getCharPref('locale'));
            if (ll) {
                CliqzLanguage.currentState = {};
                CliqzLanguage.currentState[ll] = 'locale';
                CliqzLanguage.saveCurrentState();
            }
        }

        CliqzLanguage.cleanCurrentState();
        CliqzUtils.log(CliqzLanguage.stateToQueryString(), CliqzLanguage.LOG_KEY);

    },
    
    
    addLocale: function(url, localeStr) {

        var locale = CliqzLanguage.normalizeLocale(localeStr);

        if (locale=='' || locale==undefined || locale==null || locale.length != 2) return;
        if (url=='' || url==undefined || url==null) return;

        if (CliqzLanguage.currentState[locale] != 'locale') {
            

            
            var url_hash = CliqzLanguage.hashCode(CliqzUtils.cleanUrlProtocol(url, true).split('/')[0]) % 256;

            CliqzUtils.log('Saving: ' + locale + ' ' + url_hash, CliqzLanguage.LOG_KEY);

            if (CliqzLanguage.currentState[locale]==null || CliqzLanguage.currentState[locale].indexOf(url_hash)==-1) {
                if (CliqzLanguage.currentState[locale]==null) CliqzLanguage.currentState[locale] = [];
                
                CliqzLanguage.currentState[locale].push(url_hash);
                CliqzLanguage.saveCurrentState();
            }
        }

    },
    hashCode: function(s) {
        return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);
    },
    
    normalizeLocale: function(str) {
        if (str) return str.split(/-|_/)[0].trim().toLowerCase();
        else return srt;
    },
    
    state: function() {

        var lang_vec = [];
        for (var lang in CliqzLanguage.currentState) {
            if (CliqzLanguage.currentState[lang]=='locale') {
                lang_vec.push([lang, 0.0]);
            }
            else {
                var val = Object.keys(CliqzLanguage.currentState[lang]).length;
                if (val > CliqzLanguage.DOMAIN_THRESHOLD) {
                    lang_vec.push([lang, 1.0/val]);
                }
            }
        }

        lang_vec = lang_vec.sort(function(a, b){
            return a[1]-b[1];
        });

        var lang_vec_clean = [];
        for (var index in lang_vec) {
            lang_vec_clean.push(lang_vec[index][0]);
        }

        return lang_vec_clean;
    },
    cleanCurrentState: function() {
        var keys = Object.keys(CliqzLanguage.currentState);
        var count = 0;
        for(let i=0;i<keys.length;i++) if (keys[i]!=CliqzLanguage.normalizeLocale(keys[i])) count+=1;

        if (count>0) {
            var cleanState = {};
            for(let i=0;i<keys.length;i++) {
                var nkey = CliqzLanguage.normalizeLocale(keys[i]);
                if (CliqzLanguage.currentState[keys[i]]!='locale') {
                    cleanState[nkey] = (cleanState[nkey] || []);

                    for(let j=0;j<CliqzLanguage.currentState[keys[i]].length;j++) {
                        var value = CliqzLanguage.currentState[keys[i]][j];
                        if (cleanState[nkey].indexOf(value)==-1) cleanState[nkey].push(value);
                    }
                }
            }

            CliqzLanguage.currentState = cleanState;
            var ll = CliqzLanguage.normalizeLocale(CliqzLanguage.getPref('locale',''));
            if (ll && CliqzLanguage.currentState[ll]!='locale') CliqzLanguage.currentState[ll] = 'locale';

            CliqzLanguage.saveCurrentState();
        }
    },
    stateToQueryString: function() {
        return '&lang=' + encodeURIComponent(CliqzLanguage.state().join(','));
    },
    
    saveCurrentState: function() {
        CliqzUtils.log("Going to save languages: " + JSON.stringify(CliqzLanguage.currentState), CliqzLanguage.LOG_KEY);
        CliqzLanguage.cliqzLangPrefs.setCharPref('data', JSON.stringify(CliqzLanguage.currentState || {}));
    },
};