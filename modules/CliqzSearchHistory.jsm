'use strict';


Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzAutocomplete',
  'chrome://cliqzmodules/content/CliqzAutocomplete.jsm');

var EXPORTED_SYMBOLS = ['CliqzSearchHistory'];



var CliqzSearchHistory = {
    windows: {},
    
    insertBeforeElement: function (element) {
        var window = CliqzUtils.getWindow();
        var window_id = CliqzUtils.getWindowID();
        var document = window.document;
        var gBrowser = window.gBrowser;
        this.windows[window_id] = {};

        var targetPosition = window.CLIQZ.Core.urlbar.mInputField.parentElement;

        
        this.windows[window_id].urlbar = document.getElementById('urlbar');
        
        this.windows[window_id].lastQueryInTab = {};
        
        this.windows[window_id].searchHistoryContainer = document.createElement('hbox');
        this.windows[window_id].searchHistoryContainer.className = 'hidden'; 
        targetPosition.insertBefore(this.windows[window_id].searchHistoryContainer, targetPosition.firstChild);

        
        this.windows[window_id].lastSearchElement = document.createElement('hbox');
        this.windows[window_id].lastSearchElement.className = 'cliqz-urlbar-Last-search';
        this.windows[window_id].lastSearchElement.addEventListener('click',
                                                this.returnToLastSearch.bind(this));
        this.windows[window_id].searchHistoryContainer.appendChild(this.windows[window_id].lastSearchElement)

        return this.windows[window_id].searchHistoryContainer;
    },

    
    returnToLastSearch: function (ev) {
        var urlBar = this.windows[CliqzUtils.getWindowID()].urlbar;

        urlBar.mInputField.focus();
        urlBar.mInputField.setUserInput(ev.target.query);

        CliqzUtils.setTimeout(function(){
            if(urlBar.selectionStart == 0 && urlBar.selectionEnd == urlBar.value.length)
                urlBar.setSelectionRange(urlBar.value.length, urlBar.value.length);
        },0);

        var action = {
            type: 'activity',
            action: 'last_search'
        };

        CliqzUtils.telemetry(action);
    },

    
    lastQuery: function(){
        var gBrowser = CliqzUtils.getWindow().gBrowser,
            win = this.windows[CliqzUtils.getWindowID()];
        if(win && win.urlbar){
            var val = win.urlbar.value.trim(),
                lastQ = CliqzAutocomplete.lastSearch.trim();

            if(lastQ && val && !CliqzUtils.isUrl(lastQ) && (val == lastQ || !this.isAutocomplete(val, lastQ) )){
                this.showLastQuery(lastQ);
                win.lastQueryInTab[gBrowser.selectedTab.linkedPanel] = lastQ;
            } else {
                
                if(CliqzUtils.isUrl(lastQ))
                    delete win.lastQueryInTab[gBrowser.selectedTab.linkedPanel];
            }
        }
    },

    hideLastQuery: function(){
        var win = this.windows[CliqzUtils.getWindowID()];

        if(win && win.searchHistoryContainer)
            win.searchHistoryContainer.className = 'hidden';
    },

    showLastQuery: function(q){
        var window_id = CliqzUtils.getWindowID(),
            lq = this.windows[window_id].lastSearchElement;

        this.windows[window_id].searchHistoryContainer.className = 'cliqz-urlbar-Last-search-container';
        lq.textContent = q;
        lq.tooltipText = q;
        lq.query = q;
    },

    tabChanged: function(ev){
        var window = CliqzUtils.getWindow();
        var window_id = CliqzUtils.getWindowID();
        var document = window.document;
        var gBrowser = window.gBrowser;

        
        CliqzAutocomplete.lastSearch = '';

        if(this.windows[window_id].lastQueryInTab[ev.target.linkedPanel])
            this.showLastQuery(this.windows[window_id].lastQueryInTab[ev.target.linkedPanel]);
        else
            this.hideLastQuery();
    },

    tabRemoved: function(ev){
        var window = CliqzUtils.getWindow();
        var window_id = CliqzUtils.getWindowID();
        var document = window.document;
        var gBrowser = window.gBrowser;

        delete this.windows[window_id].lastQueryInTab[ev.target.linkedPanel];
    },

    isAutocomplete: function(base, candidate){
        var window = CliqzUtils.getWindow();
        var window_id = CliqzUtils.getWindowID();
        var document = window.document;
        var gBrowser = window.gBrowser;

        if(base.indexOf('://') !== -1){
           base = base.split('://')[1];
        }
        base = base.replace('www.', '');

        return base.indexOf(candidate) == 0;
    },
};