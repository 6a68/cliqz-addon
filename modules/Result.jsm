'use strict';


var EXPORTED_SYMBOLS = ['Result'];
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');


function log(msg){
    
}


function getSuperType(result){
    if((CliqzUtils.RESULT_PROVIDER_ALWAYS_BM || result.source == 'bm') && result.snippet && result.snippet.rich_data){
        return result.snippet.rich_data.type
    }
    return null;
}

var Result = {
    CLIQZR: 'cliqz-results',
    CLIQZC: 'cliqz-custom',
    CLIQZE: 'cliqz-extra',
    CLIQZCLUSTER: 'cliqz-cluster',
    CLIQZSERIES: 'cliqz-series',
    CLIQZICON: 'http://cliqz.com/favicon.ico',
    RULES: {
        'video': [
            { 'domain': 'youtube.com', 'ogtypes': ['video', 'youtube'] },
            { 'domain': 'vimeo.com', 'ogtypes': ['video'] },
            { 'domain': 'myvideo.de', 'ogtypes': ['video.tv_show', 'video.episode', 'video.other'] },
            { 'domain': 'dailymotion.com', 'ogtypes': ['video'] },
            { 'vertical': 'video' }
        ],
        'poster': [
            { 'domain': 'imdb.com', 'ogtypes': ['video.tv_show', 'tv_show', 'movie', 'video.movie', 'game', 'video.episode', 'actor', 'public_figure'] }
        ],
        'person': [
            { 'domain': 'xing.com', 'ogtypes': [ 'profile'] },
            { 'vertical': 'people' }
        ],
        'hq': [
            { 'vertical': 'hq'}
        ],
        'news': [
            { 'vertical': 'news'}
        ],
        'shopping': [
            { 'vertical': 'shopping'}
        ]
    },
	generic: function(style, value, image, comment, label, query, data, subtype){
        
        if(style.indexOf(Result.CLIQZC) === -1       
           && (!comment || value == comment)   
           && CliqzUtils.isCompleteUrl(value)){       
            var host = CliqzUtils.getDetailsFromUrl(value).name;
            if(host && host.length>0){
                comment = host[0].toUpperCase() + host.slice(1);
            }
        }
        if(!comment){
            comment = value;
        }

        data = data || {};
        data.kind = [CliqzUtils.encodeResultType(style) + (subtype? '|' + subtype : '')];

        var item = {
            style: style,
            val: value,
            comment: comment,
            label: label || value,
            query: query,
            data: data
        };
        return item;
    },
    cliqz: function(result){
        var resStyle = Result.CLIQZR + ' sources-' + CliqzUtils.encodeSources(getSuperType(result) || result.source).join(''),
            debugInfo = result.source + ' ' + result.q + ' ' + result.confidence;

        if(result.snippet){
            return Result.generic(
                resStyle, 
                result.url, 
                null, 
                result.snippet.title,
                null, 
                debugInfo, 
                Result.getData(result),
                result.subType
            );
        } else {
            return Result.generic(resStyle, result.url, null, null, null, debugInfo, null, result.subType);
        }
    },
    cliqzExtra: function(result){
        result.data.subType = result.subType;
        result.data.trigger_urls = result.trigger_urls;
        result.data.ts = result.ts;

        return Result.generic(
            Result.CLIQZE, 
            result.url, 
            null, 
            result.data.title,
            null, 
            result.q, 
            result.data,
            result.subType
        );
    },
    
    combine: function(cliqz, generic) {
        var tempCliqzResult = Result.cliqz(cliqz);
        var ret = Result.clone(generic);
        ret.style = CliqzUtils.combineSources(ret.style, tempCliqzResult.style);
        ret.data.kind = (ret.data.kind || []).concat(tempCliqzResult.data.kind || []);
        ret.comment = ret.comment.slice(0,-2) + " and vertical: " + tempCliqzResult.query + ")!";
        return ret;
    },
    clone: function(entry) {
        var ret = Result.generic(entry.style, entry.val, null, entry.comment, entry.label, entry.query, null);
        ret.data = JSON.parse(JSON.stringify(entry.data)); 
        return ret;
    },
    
    isValid: function (url, urlparts) {
        
        if(urlparts.name.toLowerCase() == "google" &&
           urlparts.subdomains.length > 0 && urlparts.subdomains[0].toLowerCase() == "www" &&
           (urlparts.extra.indexOf("/search") != -1 || 
            urlparts.extra.indexOf("/url?") == 0 ||    
            urlparts.extra.indexOf("q=") != -1 )) {    
            log("Discarding result page from history: " + url)
            return false;
        }
        
        
        
        if(urlparts.name.toLowerCase() == "bing" &&
           urlparts.subdomains.length > 0 && urlparts.subdomains[0].toLowerCase() == "www" && urlparts.extra.indexOf("/search?") == 0) {
            log("Discarding result page from history: " + url)
            return false;
        }
        
        
        
        
        
        if(urlparts.name.toLowerCase() == "yahoo" &&
           ((urlparts.subdomains.length == 1 && urlparts.subdomains[0].toLowerCase() == "search" && urlparts.path.indexOf("/search") == 0) ||
            (urlparts.subdomains.length == 2 && urlparts.subdomains[1].toLowerCase() == "search" && urlparts.path.indexOf("/search") == 0) ||
            (urlparts.subdomains.length == 2 && urlparts.subdomains[0].toLowerCase() == "r" && urlparts.subdomains[1].toLowerCase() == "search"))) {
            log("Discarding result page from history: " + url)
            return false;
        }

        return true;
    },
    
    getData: function(result){
        
        if(!result.snippet)
            return;

        var urlparts = CliqzUtils.getDetailsFromUrl(result.url),
            resp = {
                richData: result.snippet.rich_data,
                adult: result.snippet.adult || false
            },
            source = getSuperType(result) || result.source;

        resp.type = "other";
        for(var type in Result.RULES){
            var rules = Result.RULES[type];

            for(var rule_i in rules) {
                var rule = rules[rule_i];
                if(rule.domain && urlparts.host.indexOf(rule.domain) != -1)
                    for(var ogtype in (rule.ogtypes || []))
                        if(result.snippet && result.snippet.og &&
                           result.snippet.og.type == rule.ogtypes[ogtype])
                                resp.type = type;

                var verticals = source.split(',');
                for(var v in verticals){
                    if(verticals[v].trim() == rule.vertical)
                        resp.type = type;
                }
            }


        var snip = result.snippet;
        resp.description = snip && (snip.desc || snip.snippet || (snip.og && snip.og.description));

        var ogT = snip && snip.og? snip.og.type: null,
            imgT = snip && snip.image? snip.image.type: null;

        if(resp.type != 'other' || ogT == 'cliqz' || imgT == 'cliqz')
            resp.image = Result.getVerticalImage(result.snippet.image, result.snippet.rich_data) ||
                         Result.getOgImage(result.snippet.og)
        }

        return resp;
    },
    getOgImage: function(og) {
        if(og && og.image){
            var image = { src: og.image };

            if(og.duration && parseInt(og.duration)){
                var parsedDuration = Result.tryGetImageDuration(og.duration)
                if(parsedDuration) image.duration = parsedDuration;
            }

            return image;
        }
    },
    getVerticalImage: function(imageData, richData){
        if(imageData == undefined || imageData.src == undefined) return;

        var image = {
            src: imageData.src
        };


        if(imageData.width) image.width = imageData.width;
        if(imageData.height) image.height = imageData.height;
        if(imageData.ratio) image.ratio = imageData.ratio;

        
        if(richData && richData.duration){
            var parsedDuration = Result.tryGetImageDuration(richData.duration)
            if(parsedDuration) image.duration = parsedDuration;
        }

        return image
    },
    tryGetImageDuration: function(duration){
        try {
            var totalSeconds = parseInt(duration),
                min = Math.floor(totalSeconds/60),
                seconds = totalSeconds%60;
            return min + ':' + (seconds < 10 ? '0' + seconds : seconds);
        }
        catch(e){}

        return undefined;
    }
}