'use strict';


var EXPORTED_SYMBOLS = ['Extension'];
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Components.utils.import("resource://gre/modules/AddonManager.jsm")

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzResultProviders',
    'chrome://cliqzmodules/content/CliqzResultProviders.jsm');

var BTN_ID = 'cliqz-button',
    SEARCH_BAR_ID = 'search-container',
    firstRunPref = 'extensions.cliqz.firstStartDone',
    dontHideSearchBar = 'extensions.cliqz.dontHideSearchBar',
    
    searchBarPosition = 'extensions.cliqz.defaultSearchBarPosition',
    
    searchBarPositionNext = 'extensions.cliqz.defaultSearchBarPositionNext';


function newMajorVersion(oldV, newV){
    var o = oldV.split('.'), n = newV.split('.');
    if(o.length == 3 && n.length == 3){ 
        try{
            if(parseInt(o[1]) < parseInt(n[1]))
                return true;
        } catch(e){}
    }
    return false;
}

var Extension = {
    BASE_URI: 'chrome://cliqz/content/',
    PREFS: {
        'session': ''
    },
    init: function(){
        Extension.unloadModules();

        Cu.import('chrome://cliqzmodules/content/ToolbarButtonManager.jsm');
        Cu.import('chrome://cliqzmodules/content/CliqzUtils.jsm');
        Cu.import('chrome://cliqzmodules/content/CliqzHumanWeb.jsm');
        Cu.import('chrome://cliqzmodules/content/CUcrawl.jsm');
        Cu.import('chrome://cliqzmodules/content/CliqzRedirect.jsm');
        Cu.import('chrome://cliqzmodules/content/CliqzClusterHistory.jsm');
        Cu.import('chrome://cliqzmodules/content/CliqzCategories.jsm');
        Cu.import('chrome://cliqzmodules/content/CliqzAntiPhishing.jsm');
        Cu.import('resource://gre/modules/Services.jsm');

        Extension.setDefaultPrefs();
        CliqzUtils.init();
        this.telemetry = CliqzUtils.telemetry;

        CliqzClusterHistory.init();
    },
    load: function(upgrade, oldVersion, newVersion){
        AddonManager.getAddonByID("cliqz@cliqz.com", function (addon) {
            CliqzUtils.extensionVersion = addon.version

            if (upgrade) CliqzUtils.setSupportInfo()
            else {
                Extension._SupportInfoTimeout = CliqzUtils.setTimeout(function(){
                    CliqzUtils.setSupportInfo()
                },1000)
            }
        })
        
        var enumerator = Services.wm.getEnumerator('navigator:browser');
        while (enumerator.hasMoreElements()) {
            var win = enumerator.getNext();

            
            
            
            

            Extension.loadIntoWindow(win);
        }
        
        Services.ww.registerNotification(Extension.windowWatcher);

        if(CliqzUtils.getPref("humanWeb", false)){
            CliqzHumanWeb.initAtBrowser();
        }

        if(CliqzUtils.getPref("safeBrowsingMozTest", false)){
           CUcrawl.initAtBrowser();
        }

        

        if(upgrade && newMajorVersion(oldVersion, newVersion)){
            CliqzUtils.setPref('changeLogState', 1);
        }
    },
    unload: function(version, uninstall){
        CliqzUtils.clearTimeout(Extension._SupportInfoTimeout)

        if(uninstall){
            CliqzUtils.setSupportInfo("disabled")

            var win  = Services.wm.getMostRecentWindow("navigator:browser");

            try{
                Extension.restoreSearchBar(win);
                CliqzUtils.resetOriginalPrefs();
                win.CLIQZ.Core.showUninstallMessage(version);
            } catch(e){}
        }

        if(CliqzUtils.getPref("humanWeb", false)){
            CliqzHumanWeb.unloadAtBrowser();
        }

        if(CliqzUtils.getPref("safeBrowsingMozTest", false)){
            CUcrawl.destroyAtBrowser();
        }
        
        var enumerator = Services.wm.getEnumerator('navigator:browser');
        while (enumerator.hasMoreElements()) {
            var win = enumerator.getNext();
            Extension.unloadFromWindow(win);
        }

        CliqzCategories.unload();
        Extension.unloadModules();

        Services.ww.unregisterNotification(Extension.windowWatcher);
    },
    restoreSearchBar: function(win){
        var toolbarId;
        win.Application.prefs.setValue(dontHideSearchBar, false);
        if(toolbarId = win.Application.prefs.getValue(searchBarPosition, '')){
            var toolbar = win.document.getElementById(toolbarId);
            if(toolbar){
                if(toolbar.currentSet.indexOf(SEARCH_BAR_ID) === -1){
                    var next = win.Application.prefs.getValue(searchBarPositionNext, '');
                    if(next){
                        var set = toolbar.currentSet.split(","),
                            idx = set.indexOf(next);

                        if (idx != -1)
                            set.splice(idx, 0, SEARCH_BAR_ID);
                        else set.push(SEARCH_BAR_ID);

                        toolbar.currentSet = set.join(",");
                    }
                    
                    else toolbar.currentSet += ',' + SEARCH_BAR_ID;
                } else {
                    
                    win.Application.prefs.setValue(dontHideSearchBar, true);
                }
            }
        }
    },
    unloadModules: function(){
        
        Cu.unload('chrome://cliqzmodules/content/extern/math.min.jsm');
        Cu.unload('chrome://cliqzmodules/content/ToolbarButtonManager.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzABTests.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzAutocomplete.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzHistoryManager.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzLanguage.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzSearchHistory.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzUtils.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzCalculator.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzClusterHistory.jsm');
        Cu.unload('chrome://cliqzmodules/content/Filter.jsm');
        Cu.unload('chrome://cliqzmodules/content/Mixer.jsm');
        Cu.unload('chrome://cliqzmodules/content/Result.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzResultProviders.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzSpellCheck.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzHistoryPattern.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzHumanWeb.jsm');
        Cu.unload('chrome://cliqzmodules/content/CUcrawl.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzRedirect.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzCategories.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzSmartCliqzCache.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzHandlebars.jsm');
        Cu.unload('chrome://cliqzmodules/content/extern/handlebars-v1.3.0.js');
        Cu.unload('chrome://cliqzmodules/content/CliqzAntiPhishing.jsm');

        
        
        
        try {
            var hs = Cc["@mozilla.org/browser/nav-history-service;1"].getService(Ci.nsINavHistoryService);
            CliqzHistory && hs.removeObserver(CliqzHistory.historyObserver);
        } catch(e) {}

        Cu.unload('chrome://cliqzmodules/content/CliqzHistory.jsm');
    },
    restart: function(){
        CliqzUtils.extensionRestart();
    },
    setDefaultPrefs: function() {
        var branch = CliqzUtils.cliqzPrefs;

        
        this.cleanPrefs(branch);

        for (let [key, val] in new Iterator(Extension.PREFS)) {
            if(!branch.prefHasUserValue(key)){
                switch (typeof val) {
                    case 'boolean':
                    branch.setBoolPref(key, val);
                    break;
                case 'number':
                    branch.setIntPref(key, val);
                    break;
                case 'string':
                    branch.setCharPref(key, val);
                    break;
                }
            }
        }
    },
    cleanPrefs: function(prefs){
        
        prefs.clearUserPref('analysis');
    },
    addScript: function(src, win) {
        Services.scriptloader.loadSubScript(Extension.BASE_URI + src + '.js', win);
    },
    cleanPossibleOldVersions: function(win){
        
    },
    loadIntoWindow: function(win) {
        if (!win) return;

        if(CliqzUtils.shouldLoad(win)){
            Extension.addScript('core', win);
            Extension.addScript('UI', win);

            Extension.addButtons(win);

            try {
                if (!CliqzUtils.getPref("cliqz_core_disabled", false)) {
                  win.CLIQZ.Core.init();
                  CliqzUtils.log('Initialized', 'CORE');
                }
                
                
                win.CLIQZ.Core.urlbar = win.document.getElementById('urlbar');
                win.CLIQZ.Core.whoAmI(true); 

            } catch(e) {Cu.reportError(e); }
        }
        else {
            CliqzUtils.log('private window -> halt', 'CORE');
        }
    },
    addButtons: function(win){
        var doc = win.document;
        if (!CliqzUtils.PREFERRED_LANGUAGE) {
          
          var nav = win.navigator;
          CliqzUtils.PREFERRED_LANGUAGE = nav.language || nav.userLanguage || nav.browserLanguage || nav.systemLanguage || 'en';
          CliqzUtils.loadLocale(CliqzUtils.PREFERRED_LANGUAGE);
        }
        if (!win.Application.prefs.getValue(firstRunPref, false)) {
            win.Application.prefs.setValue(firstRunPref, true);

            ToolbarButtonManager.setDefaultPosition(BTN_ID, 'nav-bar', 'downloads-button');
        }

        if (!win.Application.prefs.getValue(dontHideSearchBar, false)) {
            
            try{
                var [toolbarID, nextEl] = ToolbarButtonManager.hideToolbarElement(doc, SEARCH_BAR_ID);
                if(toolbarID){
                    win.Application.prefs.setValue(searchBarPosition, toolbarID);
                }
                if(nextEl){
                    win.Application.prefs.setValue(searchBarPositionNext, nextEl);
                }
                win.Application.prefs.setValue(dontHideSearchBar, true);
            } catch(e){}
        }

        
        let button = win.document.createElement('toolbarbutton');
        button.setAttribute('id', BTN_ID);
        button.setAttribute('type', 'menu-button');
        button.setAttribute('label', 'CLIQZ');
        button.setAttribute('tooltiptext', 'CLIQZ');
        button.setAttribute('class', 'toolbarbutton-1 chromeclass-toolbar-additional');
        button.style.listStyleImage = 'url(chrome://cliqzres/content/skin/cliqz_btn.svg)';

        var menupopup = doc.createElement('menupopup');
        menupopup.setAttribute('id', 'cliqz_menupopup');
        button.appendChild(menupopup);

        menupopup.addEventListener('popupshowing', function(){
            Extension.createMenuifEmpty(win, menupopup);
        });
        button.addEventListener('command', function(ev) {
            Extension.createMenuifEmpty(win, menupopup);
            button.children[0].openPopup(button,"after_start", 0, 0, false, true);
        }, false);

        ToolbarButtonManager.restorePosition(doc, button);
    },
    
    createMenuifEmpty: function(win, menupopup){
        if(menupopup.children.length > 0) return;
        
        
        if(Services.search.init != null){
            Services.search.init(function(){
                CliqzUtils.createQbutton(win, menupopup);
            });
        } else {
            CliqzUtils.createQbutton(win, menupopup);
        }
    },
    unloadFromWindow: function(win){
        try {
            if(win && win.document){
                var btn;
                if(btn = win.document.getElementById('cliqz-button')){
                    btn.parentNode.removeChild(btn);
                }
            }
            win.CLIQZ.Core.unload(false);
            delete win.CLIQZ.Core;
            delete win.CLIQZ.UI;
            try{ delete win.CLIQZ; } catch(e){} 
        }catch(e){ Cu.reportError(e); }
    },
    windowWatcher: function(win, topic) {
        if (topic == 'domwindowopened') {
            win.addEventListener('load', function loader() {
                win.removeEventListener('load', loader, false);
                if (win.location.href == 'chrome://browser/content/browser.xul')
                    Extension.loadIntoWindow(win, true);
            }, false);
        }
    }
};

Extension.init();