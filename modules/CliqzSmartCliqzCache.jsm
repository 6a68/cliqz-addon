'use strict';



const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CliqzSmartCliqzCache'];

Cu.import("resource://gre/modules/Services.jsm");
Cu.import('resource://gre/modules/XPCOMUtils.jsm');


try {
	Cu.import("resource://gre/modules/osfile.jsm");
} catch(e) { }

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistoryPattern',
  'chrome://cliqzmodules/content/CliqzHistoryPattern.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'Result',
  'chrome://cliqzmodules/content/Result.jsm');





var Cache = function (life) {
	this._cache = { };
	this._life = life ? life * 1000 : false;
};



Cache.prototype.store = function (key, value, time) {
	time = time || Date.now();

	if (this.isNew(key, value, time)) {
		this._cache[key] = {
			time: time,
			value: value
		};
	}
};


Cache.prototype.delete = function (key) {
	if (this.isCached(key)) {
		delete this._cache[key];
	}
}


Cache.prototype.retrieve = function (key) {
	if (!this.isCached(key)) {
		return false;
	}
	return this._cache[key].value;
};

Cache.prototype.isCached = function (key) {
	return this._cache.hasOwnProperty(key);
};


Cache.prototype.isNew = function (key, value, time) {
	return !this.isCached(key) || 
		(time > this._cache[key].time);
};





Cache.prototype.isStale = function (key) {
	return !this.isCached(key) ||
		(this._life && (Date.now() - this._cache[key].time) > this._life);
};


Cache.prototype.refresh = function (key, time) {
	time = time || Date.now();

	if (this.isCached(key)) {
		this._cache[key].time = time;
	}
}


Cache.prototype.save = function (filename) {
	try {
		var data = (new TextEncoder()).encode(
			JSON.stringify(this._cache));
		var path = OS.Path.join(
			OS.Constants.Path.profileDir, filename);
		var _this = this;

		OS.File.writeAtomic(path, data).then(
			function(value) {
    			_this._log("save: saved to " + path);
			}, function(e) {
				_this._log("save: failed saving to " + path + 
					": " + e);
			});
	} catch (e) {
		this._log("save: failed saving: " + e);
	}	
}


Cache.prototype.load = function (filename) {
	try {
		var _this = this;
		var path = OS.Path.join(
			OS.Constants.Path.profileDir, filename);

		OS.File.read(path).then(function(data) {
			_this._cache = JSON.parse((new TextDecoder()).decode(data));
			_this._log("load: loaded from: " + path);
		}).catch(function(e) {
			_this._log("load: failed loading: " + e);
		});
	} catch (e) {
		this._log("load: failed loading: " + e);
	}
}

Cache.prototype._log = function (msg) {
	CliqzUtils.log(msg, 'Cache');	
}

var CliqzSmartCliqzCache = CliqzSmartCliqzCache || {
	SMART_CLIQZ_ENDPOINT: 'http://newbeta.cliqz.com/api/v1/rich-header?path=/id_to_snippet&q=',
	
	URL_PREPARSING_RULES: {
		"amazon.de":    /(node=\d+)/,							
		"otto.de":      /otto.de\/([\w|-]{3,})/,				
		"zalando.de":   /zalando.de\/([\w|-]{3,})/,				
		"skygo.sky.de": /sky.de\/([\w|-]{3,})/,					
		"strato.de":    /strato.de\/([\w|-]{3,})/,			 	
		"bonprix.de":   /bonprix.de\/kategorie\/([\w|-]{3,})/	
	},
	CUSTOM_DATA_CACHE_FILE: 'cliqz/smartcliqz-custom-data-cache.json',
	
	MAX_ITEMS: 5,

	_smartCliqzCache: new Cache(),
	_customDataCache: new Cache(3600), 
	_isCustomizationEnabledByDefault: true,
	_isInitialized: false,

	
	_fetchLock: { },

	
	triggerUrls: new Cache(), 

	
	init: function () {
		
		this._customDataCache.load(this.CUSTOM_DATA_CACHE_FILE);

		this._isInitialized = true;
		this._log('init: initialized');
	},

	
	store: function (smartCliqz) {
		var id = this.getId(smartCliqz);

		this._smartCliqzCache.store(id, smartCliqz, 
			this.getTimestamp(smartCliqz));

		try {
			if (this.isCustomizationEnabled() && 
				(this.isNews(smartCliqz) || this.isDomainSupported(smartCliqz)) && 
				this._customDataCache.isStale(id)) {				

				this._log('store: found stale data for id ' + id);
				this._prepareCustomData(id);
			}
		} catch (e) {
			this._log('store: error while customizing data: ' + e);
		}
	},

	fetchAndStore: function (id) {
		if (this._fetchLock.hasOwnProperty(id)) {
			this._log('fetchAndStore: fetching already in progress for id ' + id);
			return;
		}

		this._log('fetchAndStore: for id ' + id);		
		this._fetchLock[id] = true;
		var _this = this;
		this._fetchSmartCliqz(id).then(function (smartCliqz) {			
			
			if (smartCliqz.hasOwnProperty('data')) {
				if (smartCliqz.data.hasOwnProperty('links')) {
					smartCliqz.data.links = smartCliqz.data.links.slice(0, _this.MAX_ITEMS);
				}
				if (smartCliqz.data.hasOwnProperty('categories')) {
					smartCliqz.data.categories = smartCliqz.data.categories.slice(0, _this.MAX_ITEMS);
				}
			}
			_this.store(smartCliqz);
			delete _this._fetchLock[id];
		}, function (reason) {
			_this._log('fetchAndStore: error while fetching data: ' + reason);
			delete _this._fetchLock[id];
		});
	},

	
	
	retrieve: function (id) {
		var smartCliqz = this._smartCliqzCache.retrieve(id);

		if (this.isCustomizationEnabled() && smartCliqz && 
			(this.isNews(smartCliqz) || this.isDomainSupported(smartCliqz))) {
			try {	
				this._customizeSmartCliqz(smartCliqz);
			} catch (e) {
				this._log('retrieveCustomized: error while customizing data: ' + e);
			}
		}
		return smartCliqz;
	},

	
	getDomain: function (smartCliqz) {
		
		if (smartCliqz.data.domain) {
			return smartCliqz.data.domain;
		} else if (smartCliqz.data.trigger_urls && smartCliqz.data.trigger_urls.length > 0) {
			return CliqzHistoryPattern.generalizeUrl(smartCliqz.data.trigger_urls[0]);
		} else {
			return false;
		}
	},

	
	getId: function (smartCliqz) {
		return JSON.parse(smartCliqz.data.subType).ez;
	},

	
	getTimestamp: function (smartCliqz) {
		return smartCliqz.data.ts;
	},

	
	isNews: function (smartCliqz) {
		return (typeof smartCliqz.data.news != 'undefined');
	},

	
	isDomainSupported: function (smartCliqz) {
		return this.URL_PREPARSING_RULES.hasOwnProperty(this.getDomain(smartCliqz));
	},

	
	isCustomizationEnabled: function() {
		try {
            var isEnabled =
            	CliqzUtils.getPref("enableSmartCliqzCustomization", undefined);
            
            return isEnabled === undefined ? 
            	this._isCustomizationEnabledByDefault : isEnabled;
        } catch(e) {        	
            return this._isCustomizationEnabledByDefault;
        }
	},

	
	_customizeSmartCliqz: function (smartCliqz) {		
		var id = this.getId(smartCliqz);
		
		if (this._customDataCache.isCached(id)) {
			this._injectCustomData(smartCliqz, 
				this._customDataCache.retrieve(id));

			if (this._customDataCache.isStale(id)) {
				this._log(
					'_customizeSmartCliqz: found stale data for ' + id);
				this._prepareCustomData(id);
			}
		} else {
			this._log(
				'_customizeSmartCliqz: custom data not yet ready for ' + id);
		}
	},
	
	_injectCustomData: function (smartCliqz, customData) {
		var id = this.getId(smartCliqz);
		this._log('_injectCustomData: injecting for id ' + id);
		for (var key in customData) {
			if (customData.hasOwnProperty(key)) {				
				smartCliqz.data[key] = customData[key];
				this._log('_injectCustomData: injecting key ' + key);
			}
		}
		this._log('_injectCustomData: done injecting for id ' + id);
	},
	
	
	_prepareCustomData: function (id) {
		if (this._customDataCache.isStale(id)) {
			
			
			this._customDataCache.refresh(id);
			this._log('_prepareCustomData: preparing for id ' + id);
		} else {
			this._log('_prepareCustomData: already updated or in update progress ' + id);
			return;
		}

		
		
		

		
		var oldCustomData = this._customDataCache.retrieve(id);	

		
		var _this = this;
		this._fetchSmartCliqz(id).then(function (smartCliqz) {
			var id = _this.getId(smartCliqz);
			var domain = _this.getDomain(smartCliqz);

			
			_this._fetchVisitedUrls(domain, function callback(urls) {

				
				
				
				if (!_this.isNews(smartCliqz)) {
					smartCliqz.data.categories = smartCliqz.data.links;
				}

				var categories = smartCliqz.data.categories.slice();

				
				for (var j = 0; j < categories.length; j++) {
					categories[j].genUrl =
						_this._preparseUrl(categories[j].url, domain);
					categories[j].matchCount = 0;
					categories[j].originalOrder = j;
				}

				
				for (var i = 0; i < urls.length; i++) {
					var url = 
						_this._preparseUrl(urls[i], domain);
					for (var j = 0; j < categories.length; j++) {
						if (_this._isMatch(url, categories[j].genUrl)) {
		                    categories[j].matchCount++;
		                }
					}
				}

				
				categories.sort(function compare(a, b) {
                    if (a.matchCount != b.matchCount) {                        
                        return b.matchCount - a.matchCount; 
                    } else {                        
                        return a.originalOrder - b.originalOrder; 
                    }
                });

                categories = categories.slice(0, _this.MAX_ITEMS);

                var oldCategories = oldCustomData ?
                	
                	(_this.isNews(smartCliqz) ? oldCustomData.categories : oldCustomData.links) : 
                	
                	smartCliqz.data.categories;

                
                _this._sendStats(id, oldCategories,
                	categories, oldCustomData ? true : false, urls);

                
                if (_this.isNews(smartCliqz)) {
                	_this._customDataCache.store(id, { categories: categories });
                } else {
                	_this._customDataCache.store(id, { links: categories });
                }

                _this._log('_prepareCustomData: done preparing for id ' + id);
                _this._customDataCache.save(_this.CUSTOM_DATA_CACHE_FILE);
			})
		});
	},
	
	_preparseUrl: function (url, domain) {
		url = CliqzHistoryPattern.generalizeUrl(url);

		
		if (domain) {
			var rule = this.URL_PREPARSING_RULES[domain];
			if (rule) {
				var match = rule.exec(url);
				if (match) {
					
					url = match[1];
				} else {
					
					
				}
			} else {
				
				
			}			
		}

		return url;
	},
	
	_isMatch: function (historyUrl, categoryUrl) {
		
		
		
		
		return historyUrl.indexOf(categoryUrl) > -1;
	},
	
	_fetchSmartCliqz: function (id, callback) {
		this._log('_fetchSmartCliqz: start fetching for id ' + id);
		var _this = this;
		
		var promise = new Promise(function (resolve, reject) {
			var endpointUrl = _this.SMART_CLIQZ_ENDPOINT + id;
			
			CliqzUtils.httpGet(endpointUrl, function success(req) {
        		try {
	        		var smartCliqz = 
	        			JSON.parse(req.response).extra.results[0];
	        		smartCliqz = Result.cliqzExtra(smartCliqz);	        		
	        		_this._log('_fetchSmartCliqz: done fetching for id ' + id);
        			resolve(smartCliqz);
        		} catch (e) {
        			_this._log('_fetchSmartCliqz: error fetching for id ' + id + ': ' + e);
        			reject(e);
        		}
        	}, function onerror() {
        		reject('http request failed for id ' + id);
        	});
		});
		return promise;
	},
	
	_fetchVisitedUrls: function (domain, callback) {
		this._log('_fetchVisitedUrls: start fetching for domain ' + domain);

		var historyService = Components
            .classes["@mozilla.org/browser/nav-history-service;1"]
            .getService(Components.interfaces.nsINavHistoryService);

        if (!historyService) {
        	this._log('_fetchVisitedUrls: history service not available');
        	return;
        }

        var options = historyService.getNewQueryOptions();

        var query = historyService.getNewQuery();
        query.domain = domain;
        
        query.beginTimeReference = query.TIME_RELATIVE_NOW;
        query.beginTime = -1 * 30 * 24 * 60 * 60 * 1000000;
        query.endTimeReference = query.TIME_RELATIVE_NOW;
        query.endTime = 0;

        var _this = this;
        CliqzUtils.setTimeout(function fetch() {
        	var result = 
        		historyService.executeQuery(query, options);

	        var container = result.root;
	        container.containerOpen = true;

	        var urls = [];
	        for (var i = 0; i < container.childCount; i ++) {
	             urls[i] = container.getChild(i).uri;
	        }

	        _this._log(
	        		'_fetchVisitedUrls: done fetching ' +  urls.length + 
	        		' URLs for domain ' + domain);
	        callback(urls);
        }, 0);
	},
	_sendStats: function (id, oldCategories, newCategories, isRepeatedCustomization, urls) {
		var stats = {
			type: 'activity',
			action: 'smart_cliqz_customization',
			
			id: id,
			
			urlCandidateCount: urls.length,
			
			urlMatchCount: 0,
			
			urlMatchCountAvg: 0,
			
			urlMatchCountSd: 0,
			
			categoriesPosChangeCount: 0,
			
			categoriesKeptCount: 0,
			
			categoriesKeptPosChangeAvg: 0,
			
			isRepeatedCustomization: isRepeatedCustomization
		};

		var oldPositions = { };
		var length = Math.min(oldCategories.length, newCategories.length);

    	for (var i = 0; i < length; i++) {
    		stats.urlMatchCount += newCategories[i].matchCount;
    		oldPositions[oldCategories[i].title] = i;

    		if (newCategories[i].title != oldCategories[i].title) {
    			stats.categoriesPosChangeCount++;
    		}
    	}
    	stats.urlMatchCountAvg = stats.urlMatchCount / length;

    	for (var i = 0; i < length; i++) {
    		stats.urlMatchCountSd += 
    			Math.pow(stats.urlMatchCountAvg - newCategories[i].matchCount, 2);
    	}
    	stats.urlMatchCountSd /= length;
    	stats.urlMatchCountSd = Math.sqrt(stats.urlMatchCountSd);

    	for (var i = 0; i < length; i++) { 
    		if (oldPositions.hasOwnProperty(newCategories[i].title)) {
    			stats.categoriesKeptCount++;
    			stats.categoriesKeptPosChangeAvg += 
    				Math.abs(i - oldPositions[newCategories[i].title]);
    			
    		}
    	}
    	stats.categoriesKeptPosChangeAvg /= stats.categoriesKeptCount;

    	CliqzUtils.telemetry(stats);
	},
	
	_log: function (msg) {
		CliqzUtils.log(msg, 'SmartCliqzCache');
	}
}

CliqzSmartCliqzCache.init();