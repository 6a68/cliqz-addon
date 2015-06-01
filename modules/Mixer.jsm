'use strict';


var EXPORTED_SYMBOLS = ['Mixer'];
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Components.utils.import('resource://gre/modules/Services.jsm');

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'Filter',
  'chrome://cliqzmodules/content/Filter.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'Result',
  'chrome://cliqzmodules/content/Result.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzClusterHistory',
  'chrome://cliqzmodules/content/CliqzClusterHistory.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistoryPattern',
  'chrome://cliqzmodules/content/CliqzHistoryPattern.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzResultProviders',
    'chrome://cliqzmodules/content/CliqzResultProviders.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzSmartCliqzCache',
    'chrome://cliqzmodules/content/CliqzSmartCliqzCache.jsm');

CliqzUtils.init();


function kindEnricher(data, newKindParams) {
    var parts = data.kind && data.kind[0] && data.kind[0].split('|');
    if(parts.length == 2){
        try{
            var kind = JSON.parse(parts[1]);
            for(var p in newKindParams)
                kind[p] = newKindParams[p];
            data.kind[0] = parts[0] + '|' + JSON.stringify(kind);
        } catch(e){}
    }
}

var Mixer = {
    ezURLs: {},
    EZ_COMBINE: ['entity-generic', 'entity-search-1', 'entity-portal', 'entity-banking-2'],
    EZ_QUERY_BLACKLIST: ['www', 'www.', 'http://www', 'https://www', 'http://www.', 'https://www.'],
    TRIGGER_URLS_CACHE_FILE: 'cliqz/smartcliqz-trigger-urls-cache.json',
    init: function() {
        CliqzSmartCliqzCache.triggerUrls.load(this.TRIGGER_URLS_CACHE_FILE);

    },
	mix: function(q, cliqz, cliqzExtra, instant, customResults, only_instant){
		var results = [];

        if(!instant)
            instant = [];
        if(!cliqz)
            cliqz = [];
        if(!cliqzExtra)
            cliqzExtra = [];

        
        
        
        CliqzUtils.log("only_instant:" + only_instant + " instant:" + instant.length + " cliqz:" + cliqz.length + " extra:" + cliqzExtra.length, "Mixer");

        
        for(var i=0; i < (cliqzExtra || []).length; i++) {
            kindEnricher(cliqzExtra[i].data, { 'trigger_method': 'rh_query' });
        }

        
        if(cliqz && cliqz.length > 0) {
            if(cliqz[0].extra) {
                
                
                if(q.length > 2 && (Mixer.EZ_QUERY_BLACKLIST.indexOf(q.toLowerCase().trim()) == -1)) {
                    var extra = Result.cliqzExtra(cliqz[0].extra);
                    kindEnricher(extra.data, { 'trigger_method': 'backend_url' });
                    cliqzExtra.push(extra);
                } else {
                    CliqzUtils.log("Suppressing EZ " + cliqz[0].extra.url + " because of ambiguious query " + q, "Mixer");
                }
            }
        }

        
        
        var cliqz_new = [];
        var instant_new = [];
        for(var i=0; i < cliqz.length; i++) {
            var cl_url = CliqzHistoryPattern.generalizeUrl(cliqz[i].url, true);
            var duplicate = false;

            if(instant.length > 0) {
                
                var instant_url = CliqzHistoryPattern.generalizeUrl(instant[0].label, true);
                if(cl_url == instant_url) {
                    var temp = Result.combine(cliqz[i], instant[0]);
                    
                    if(instant_new.length == 0)
                        instant_new.push(temp);
                    duplicate = true;
                }

                
                if(instant[0].style == 'cliqz-pattern') {
                    for(var u in instant[0].data.urls) {
                        var instant_url = CliqzHistoryPattern.generalizeUrl(instant[0].data.urls[u].href);
                        if (instant_url == cl_url) {
                            
                            duplicate = true;
                            break;
                        }
                    }
                }
            }
            if (!duplicate) {
                cliqz_new.push(cliqz[i]);
            }
        }

        
        
        
        if(instant_new.length == 0 && instant.length > 0)
            instant_new.push(Result.clone(instant[0]));
        instant = instant_new;

        cliqz = cliqz_new;

        var results = instant;

        for(let i = 0; i < cliqz.length; i++) {
            results.push(Result.cliqz(cliqz[i]));
        }

        
        
        for(var i=(cliqzExtra || []).length - 1; i >= 0; i--){
            var r = cliqzExtra[i];
            if(r.style == 'cliqz-extra'){
                if(r.val != "" && r.data.subType){
                    var eztype = JSON.parse(r.data.subType).ez;
                    var trigger_urls = r.data.trigger_urls || [];
                    if(eztype && trigger_urls.length > 0) {
                        var wasCacheUpdated = false;
                        for(var j=0; j < trigger_urls.length; j++) {
                            if(CliqzSmartCliqzCache.triggerUrls.retrieve(trigger_urls[j]) != eztype) {
                                CliqzSmartCliqzCache.triggerUrls.store(trigger_urls[j], eztype);
                                wasCacheUpdated = true;
                            }
                        }
                        if (wasCacheUpdated) {
                            CliqzSmartCliqzCache.triggerUrls.save(Mixer.TRIGGER_URLS_CACHE_FILE);
                        }
                        CliqzSmartCliqzCache.store(r);
                    }
                }
            }
        }

        
        
        if(results.length > 0 && results[0].data && results[0].data.template &&
           results[0].data.template.indexOf("pattern") == 0 && !(results[0].data.template == "pattern-h1")) {

            var url = results[0].val;
            
            if(url == "" && results[0].data && results[0].data.urls && results[0].data.urls.length > 0)
                url = results[0].data.urls[0].href;

            url = CliqzHistoryPattern.generalizeUrl(url, true);
            if (CliqzSmartCliqzCache.triggerUrls.isCached(url)) {                
                var ezId = CliqzSmartCliqzCache.triggerUrls.retrieve(url);
                var ez = CliqzSmartCliqzCache.retrieve(ezId);
                if(ez) {
                    ez = Result.clone(ez);
                    kindEnricher(ez.data, { 'trigger_method': 'history_url' });
                    cliqzExtra = [ez];
                } else {
                    
                    CliqzSmartCliqzCache.fetchAndStore(ezId);
                }
                if (CliqzSmartCliqzCache.triggerUrls.isStale(url)) {
                    CliqzSmartCliqzCache.triggerUrls.delete(url);
                }
            }
        }



        results = Filter.deduplicate(results, -1, 1, 1);

        
        cliqzExtra = cliqzExtra.slice(0, 1);

        
        if(cliqzExtra && cliqzExtra.length > 0) {

            
            if(results.length > 0 && results[0].data.template && results[0].data.template == "pattern-h2" &&
               CliqzHistoryPattern.generalizeUrl(results[0].val, true) != CliqzHistoryPattern.generalizeUrl(cliqzExtra[0].val, true)) {
                
                CliqzUtils.log("History cluster " + results[0].val + " does not match EZ " + cliqzExtra[0].val, "Mixer");
            } else {
                CliqzUtils.log("EZ (" + cliqzExtra[0].data.kind + ") for " + cliqzExtra[0].val, "Mixer");

                
                if(results.length > 0 && results[0].data.template && results[0].data.template.indexOf("pattern") == 0) {
                    var mainUrl = cliqzExtra[0].val;
                    var history = results[0].data.urls;
                    CliqzHistoryPattern.removeUrlFromResult(history, mainUrl);
                    
                    for(var k in cliqzExtra[0].data) {
                        for(var l in cliqzExtra[0].data[k]) {
                            if(cliqzExtra[0].data[k][l].url) {
                                CliqzHistoryPattern.removeUrlFromResult(history, cliqzExtra[0].data[k][l].url);
                            }
                        }
                    }
                    
                    if(history.length == 0) {
                        CliqzUtils.log("No history left after deduplicating with EZ links.")
                        results.splice(0,1);
                    }
                    else if(history.length == 2) results[0].data.template = "pattern-h3";
                }

                
                var results_new = [];
                for(let i=0; i < results.length; i++) {
                    if(results[i].style.indexOf("cliqz-pattern") == 0)
                        results_new.push(results[i]);
                    else {
                        var matchedEZ = false;

                        
                        if(CliqzHistoryPattern.generalizeUrl(results[i].val) ==
                           CliqzHistoryPattern.generalizeUrl(cliqzExtra[0].val))
                            matchedEZ = true;

                        
                        for(k in cliqzExtra[0].data) {
                            for(l in cliqzExtra[0].data[k]) {
                                if(CliqzHistoryPattern.generalizeUrl(results[i].val) ==
                                   CliqzHistoryPattern.generalizeUrl(cliqzExtra[0].data[k][l].url))
                                    matchedEZ = true;
                            }
                        }
                        if(!matchedEZ)
                            results_new.push(results[i]);
                    }
                }
                results = results_new;

                
                
                if(results.length > 0 && results[0].data && results[0].data.template == "pattern-h2" &&
                   Mixer.EZ_COMBINE.indexOf(cliqzExtra[0].data.template) != -1 &&
                   CliqzHistoryPattern.generalizeUrl(results[0].val, true) == CliqzHistoryPattern.generalizeUrl(cliqzExtra[0].val, true) ) {

                    var temp_history = results[0];
                    var old_kind = temp_history.data.kind;
                    results[0] = cliqzExtra[0];
                    results[0].data.kind = (results[0].data.kind || []).concat(old_kind || []);
                    results[0].data.urls = (temp_history.data.urls || []).slice(0,3);
                }
                
                else if(results.length > 0 &&
                        results[0].data && results[0].data.template == "pattern-h2" &&
                        CliqzUtils.TEMPLATES[cliqzExtra[0].data.template] == 2) {
                    results[0].data.template = "pattern-h3";
                    
                    results[0].data.urls = (results[0].data.urls || []).slice(0,3);
                    results = cliqzExtra.concat(results);
                } else {
                    results = cliqzExtra.concat(results);
                }
            }
        }

        
        

        
        if(customResults && customResults.length > 0) {
            results = customResults.concat(results);
        }

        
        var cliqzRes = 0;
        results = results.filter(function(r){
            if(r.style.indexOf('cliqz-results ') == 0) cliqzRes++;
            return cliqzRes <= 3;
        })

        
        if(results.length == 0 && !only_instant){
            results.push(CliqzUtils.getNoResults());
        }

        return results;
    }
}

Mixer.init();