'use strict';


var EXPORTED_SYMBOLS = ['CliqzABTests'];
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

var CliqzABTests = CliqzABTests || {
    PREF: 'ABTests',
    PREF_OVERRIDE: 'ABTestsOverride',
    URL: 'https://logging.cliqz.com/abtests/check?session=',

    
    getCurrent: function() {
        if(CliqzUtils.cliqzPrefs.prefHasUserValue(CliqzABTests.PREF))
            var ABtests = JSON.parse(CliqzUtils.getPref(CliqzABTests.PREF));
            return ABtests;
        return undefined;
    },
    setCurrent: function(tests) {
        CliqzUtils.setPref(CliqzABTests.PREF, JSON.stringify(tests))
    },

    
    getOverride: function() {
        if(CliqzUtils.cliqzPrefs.prefHasUserValue(CliqzABTests.PREF_OVERRIDE)) {
            var ABtests = JSON.parse(CliqzUtils.getPref(CliqzABTests.PREF_OVERRIDE));
            return ABtests;
        }
        return undefined;
    },
    setOverride: function(tests) {
        if(tests)
            CliqzUtils.setPref(CliqzABTests.PREF_OVERRIDE, JSON.stringify(tests));
        else
            CliqzUtils.cliqzPrefs.clearUserPref(CliqzABTests.PREF_OVERRIDE);
    },

    
    check: function() {
        CliqzABTests.retrieve(
            function(response){
                try{
                    var prevABtests = {};
                    if(CliqzUtils.cliqzPrefs.prefHasUserValue(CliqzABTests.PREF))
                        prevABtests = JSON.parse(CliqzUtils.getPref(CliqzABTests.PREF));

                    var respABtests = JSON.parse(response.responseText);

                    
                    var overrideABtests = CliqzABTests.getOverride();
                    if(overrideABtests)
                        respABtests = overrideABtests;

                    var newABtests = {};

                    var changes = false; 

                    
                    for(let o in prevABtests) {
                        if(!respABtests[o]) {
                            if(CliqzABTests.leave(o))
                                changes = true;
                        }
                        else {
                            
                            newABtests[o] = prevABtests[o]
                        }
                    }

                    
                    for(let n in respABtests) {
                        if(!(prevABtests[n])) {
                            if(CliqzABTests.enter(n, respABtests[n])) {
                                changes = true;
                                newABtests[n] = respABtests[n];
                            }
                        }
                    }

                    if(changes) {
                        CliqzUtils.setPref(CliqzABTests.PREF, JSON.stringify(newABtests))
                    }
                } catch(e){
                    
                }
            });
    },
    retrieve: function(callback) {
        var url = CliqzABTests.URL + encodeURIComponent(CliqzUtils.getPref('session',''));

        var onerror = function(){ CliqzUtils.log("failed to get AB test data",
                                                 "CliqzABTests.retrieve") }

        CliqzUtils.httpGet(url, callback, onerror, 15000);
    },
    enter: function(abtest, payload) {
        var logname = "CliqzABTests.enter"

        
        
        var rule_executed = true
        switch(abtest) {
            case "1016_A":
                CliqzUtils.setPref("localSpellCheck", true);
                break;
            case "1017_A":
                CliqzUtils.setPref("safeBrowsing", true);
                break;
            case "1019_A":
                CliqzUtils.setPref("newHistory", false);
                break;
            case "1019_B":
                CliqzUtils.setPref("newHistory", true);
                CliqzUtils.setPref("newHistoryType", "firefox_no_cluster");
                break;

            case "1020_A":
                CliqzUtils.setPref("newHistory", true);
                CliqzUtils.setPref("newHistoryType", "firefox_no_cluster");
                break;
            case "1020_B":
                CliqzUtils.setPref("newHistory", true);
                CliqzUtils.setPref("newHistoryType", "firefox_cluster");
                break;

            case "1021_A":
                CliqzUtils.setPref("newHistory", true);
                CliqzUtils.setPref("newHistoryType", "firefox_cluster");
                break;
            case "1021_B":
                CliqzUtils.setPref("newHistory", true);
                CliqzUtils.setPref("newHistoryType", "cliqz");

            case "1022_A":
                CliqzUtils.setPref("newAutocomplete", false);
                break;
            case "1022_B":
                CliqzUtils.setPref("newAutocomplete", true);
                break;

            case "1023_A":
                CliqzUtils.setPref("localSpellCheck", false);
                break;
            case "1023_B":
                CliqzUtils.setPref("localSpellCheck", true);
                break;
            case "1024_B":
                CliqzUtils.setPref("categoryAssessment", true);
                break;
            case "1025_B":
                
                break;
            case "1027_A":
                CliqzUtils.setPref("news-toggle", false);
                break;
            case "1027_B":
                CliqzUtils.setPref("news-toggle", true);
                break;
            case "1028_A":
                CliqzUtils.setPref("humanWeb", false);
                break;
            case "1028_B":
                CliqzUtils.setPref("humanWeb", true);
                break;
            case "1029_A":
                CliqzUtils.setPref("enableNewsCustomization", false);
                break;
            case "1029_B":
                CliqzUtils.setPref("enableNewsCustomization", true);
                break;
            case "1030_A":
                CliqzUtils.setPref("double-enter", false);
                break;
            case "1030_B":
                CliqzUtils.setPref("double-enter", true);
                break;
            case "1031_A":
                CliqzUtils.setPref("topSites", false);
                break;
            case "1031_B":
                CliqzUtils.setPref("topSites", true);
                break;
            case "1032_A":
                CliqzUtils.setPref("spellCorrMessage", false);
                break;
            case "1032_B":
                CliqzUtils.setPref("spellCorrMessage", true);
                break;
            case "1033_A":
                CliqzUtils.setPref("historyStats", false);
                break;
            case "1033_B":
                CliqzUtils.setPref("historyStats", true);
                break;
            case "1034_A":
                CliqzUtils.setPref("safeBrowsingMozTest", false);
                break;
            case "1034_B":
                CliqzUtils.setPref("safeBrowsingMozTest", true);
                break;
            case "1035_A":
                CliqzUtils.setPref("news-default-latest", true);
                break;
            case "1035_B":
                CliqzUtils.setPref("news-default-latest", false);
                break;
            default:
                rule_executed = false;
        }
        if(rule_executed) {
            var action = {
                type: 'abtest',
                action: 'enter',
                name: abtest
            };
            CliqzUtils.telemetry(action);

            return true;
       } else {
            return false;
       }
    },
    leave: function(abtest, disable) {
        var logname = "CliqzABTests.leave"

        
        
        
        
        var rule_executed = true;
        switch(abtest) {
            case "1000_A":
                CliqzUtils.cliqzPrefs.clearUserPref("logTimings");
                break;
            case "1001_A":
            case "1001_B":
            case "1001_C":
                CliqzUtils.cliqzPrefs.clearUserPref("changelogURL");
                CliqzUtils.cliqzPrefs.clearUserPref("showChangelog");
                break;
            case "1002_A":
            case "1003_A":
            case "1003_B":
            case "1004_A":
            case "1004_B":
                
                var urlbarPrefs = Components.classes['@mozilla.org/preferences-service;1']
                                  .getService(Components.interfaces.nsIPrefService).getBranch('browser.urlbar.');
                if(CliqzUtils.cliqzPrefs.prefHasUserValue("old_maxRichResults")){
                    urlbarPrefs.setIntPref("maxRichResults", CliqzUtils.getPref("old_maxRichResults"));
                    CliqzUtils.cliqzPrefs.clearUserPref("old_maxRichResults");
                }

                CliqzUtils.cliqzPrefs.clearUserPref("abCluster");
                break;
            case "1005_B":
                
                CliqzUtils.cliqzPrefs.clearUserPref('logCluster');
                break;
            case "1006_A":
                
                CliqzUtils.cliqzPrefs.clearUserPref("abortConnections");
                break;
            case "1007_A":
                
                CliqzUtils.cliqzPrefs.clearUserPref("historyExperiment");
                break;
            case "1008_A":
                
                
                break;
            case "1009_A":
                CliqzUtils.cliqzPrefs.clearUserPref('sessionExperiment');
                break;
            case "1010_A":
                CliqzUtils.cliqzPrefs.clearUserPref("showNoResults");
                break;
            case "1011_A":
                break;
            case "1012_A":
                break;
            case "1013_A":
                CliqzUtils.cliqzPrefs.clearUserPref("sessionLogging");
                break;
            case "1014_A":
                CliqzUtils.CUSTOM_RESULTS_PROVIDER = null;
                CliqzUtils.cliqzPrefs.clearUserPref("customResultsProvider");
                CliqzUtils.CUSTOM_RESULTS_PROVIDER_PING = null;
                CliqzUtils.cliqzPrefs.clearUserPref("customResultsProviderPing");
                CliqzUtils.CUSTOM_RESULTS_PROVIDER_LOG = null;
                CliqzUtils.cliqzPrefs.clearUserPref("customResultsProviderLog");
                break;
            case "1015_A":
                CliqzUtils.CUSTOM_RESULTS_PROVIDER = null;
                CliqzUtils.cliqzPrefs.clearUserPref("customResultsProvider");
                CliqzUtils.CUSTOM_RESULTS_PROVIDER_PING = null;
                CliqzUtils.cliqzPrefs.clearUserPref("customResultsProviderPing");
                CliqzUtils.CUSTOM_RESULTS_PROVIDER_LOG = null;
                CliqzUtils.cliqzPrefs.clearUserPref("customResultsProviderLog");
                break;
            case "1016_A":
                CliqzUtils.cliqzPrefs.clearUserPref("localSpellCheck");
                break;
            case "1017_A":
                CliqzUtils.cliqzPrefs.clearUserPref("safeBrowsing");
                
                break;
            case "1018_A":
            case "1018_B":
                CliqzUtils.cliqzPrefs.clearUserPref("disableSeriesCluster");
                break;
            case "1019_A":
            case "1019_B":
            case "1020_A":
            case "1020_B":
            case "1021_A":
            case "1021_B":
                CliqzUtils.cliqzPrefs.clearUserPref("newHistory");
                CliqzUtils.cliqzPrefs.clearUserPref("newHistoryType");
                break;
            case "1022_A":
            case "1022_B":
                CliqzUtils.cliqzPrefs.clearUserPref("newAutocomplete");
                break;
            case "1023_A":
            case "1023_B":
                CliqzUtils.cliqzPrefs.clearUserPref("localSpellCheck");
                break;
            case "1024_B":
                CliqzUtils.cliqzPrefs.clearUserPref("categoryAssessment");
                break;
            case "1025_B":
                CliqzUtils.cliqzPrefs.clearUserPref("safeBrowsingMoz");
                break;
            case "1027_A":
            case "1027_B":
                CliqzUtils.cliqzPrefs.clearUserPref("news-toggle");
                break;
            case "1028_A":
            case "1028_B":
                CliqzUtils.cliqzPrefs.clearUserPref("humanWeb");
                break;
            case "1029_A":
            case "1029_B":
                CliqzUtils.cliqzPrefs.clearUserPref("enableNewsCustomization");
                break;
            case "1030_A":
            case "1030_B":
                CliqzUtils.cliqzPrefs.clearUserPref("double-enter");
                break;
            case "1031_A":
            case "1031_B":
                CliqzUtils.cliqzPrefs.clearUserPref("topSites");
                break;
            case "1032_A":
            case "1032_B":
                CliqzUtils.cliqzPrefs.clearUserPref("spellCorrMessage");
                break;
            case "1033_A":
            case "1033_B":
                CliqzUtils.cliqzPrefs.clearUserPref("historyStats");
                break;
            case "1034_A":
            case "1034_B":
                CliqzUtils.cliqzPrefs.clearUserPref("safeBrowsingMozTest");
                break;
            case "1035_A":
            case "1035_B":
                CliqzUtils.cliqzPrefs.clearUserPref("news-default-latest");
                break;
            default:
                rule_executed = false;
        }
        if(rule_executed) {
            var action = {
                type: 'abtest',
                action: 'leave',
                name: abtest,
                disable: disable
            };
            CliqzUtils.telemetry(action);
            return true;
       } else {
            return false;
       }
    },
    disable: function(abtest) {
        
        
        
        if(CliqzUtils.cliqzPrefs.prefHasUserValue(CliqzABTests.PREF)) {
             var curABtests = JSON.parse(CliqzUtils.getPref(CliqzABTests.PREF));

            if(curABtests[abtest] && CliqzABTests.leave(abtest, true)) {
                
                curABtests[abtest].disabled = true;
                CliqzUtils.setPref(CliqzABTests.PREF, JSON.stringify(curABtests))
            }
        }
    },
}