'use strict';


XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistory',
  'chrome://cliqzmodules/content/CliqzHistory.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistoryPattern',
  'chrome://cliqzmodules/content/CliqzHistoryPattern.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistoryManager',
  'chrome://cliqzmodules/content/CliqzHistoryManager.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHandlebars',
  'chrome://cliqzmodules/content/CliqzHandlebars.jsm');




(function(ctx) {


var TEMPLATES = CliqzUtils.TEMPLATES,
    VERTICALS = {
        
        
        'n': 'news'    ,
        'p': 'people'  ,
        'v': 'video'   ,
        'h': 'hq'      ,
        
        
        
    },
    IC = 'cqz-result-box', 
    gCliqzBox = null,
    TAB = 9,
    ENTER = 13,
    LEFT = 37,
    UP = 38,
    RIGHT = 39,
    DOWN = 40,
    KEYS = [TAB, ENTER, UP, DOWN],
    IMAGE_HEIGHT = 64,
    IMAGE_WIDTH = 114,
    DEL = 46,
    BACKSPACE = 8,
    currentResults,
    adultMessage = 0, 

    
    smartCliqzMaxAttempts = 10,
    
    smartCliqzWaitTime = 100
    ;

function lg(msg){
    CliqzUtils.log(msg, 'CLIQZ.UI');
}



var UI = {
    showDebug: false,
    preventAutocompleteHighlight: false,
    autocompleteEl: 0,
    lastInputTime: 0,
    lastInput: "",
    lastSelectedUrl: null,
    mouseOver: false,
    init: function(){
        
        CLIQZ.Core.popup._appendCurrentResult = function(){
            if(CLIQZ.Core.popup._matchCount > 0 && CLIQZ.Core.popup.mInput){
              CLIQZ.UI.handleResults();
            }
        }

        UI.showDebug = CliqzUtils.getPref('showQueryDebug', false);
    },
    main: function(box){
        gCliqzBox = box;

        
        if(!CliqzHandlebars.tplCache.main)return;

        box.innerHTML = CliqzHandlebars.tplCache.main();

        var resultsBox = document.getElementById('cliqz-results',box);
        var messageContainer = document.getElementById('cliqz-message-container');


        resultsBox.addEventListener('mouseup', resultClick);
        resultsBox.addEventListener('mouseout', function(){
            XULBrowserWindow.updateStatusField();
        });
        messageContainer.addEventListener('mouseup', messageClick);
        gCliqzBox.messageContainer = messageContainer;
        resultsBox.addEventListener('scroll', resultScroll);

        box.addEventListener('mousemove', resultMove);
        gCliqzBox.resultsBox = resultsBox;


        handlePopupHeight(box);
    },
    handleResults: function(){
      var popup = CLIQZ.Core.urlbar.popup,
        data = [],
        ctrl = popup.mInput.controller,
        q = ctrl.searchString.replace(/^\s+/, '').replace(/\s+$/, ''),
        lastRes = CliqzAutocomplete.lastResult;

      

      for(var i=0; i<popup._matchCount; i++) {
          data.push({
            title: ctrl.getCommentAt(i),
            url: unEscapeUrl(ctrl.getValueAt(i)),
            type: ctrl.getStyleAt(i),
            text: q,
            data: lastRes && lastRes.getDataAt(i),
          });
      }

      var currentResults = CLIQZ.UI.results({
        q: q,
        results: data,
        isInstant: lastRes && lastRes.isInstant
      });

      var curResAll = currentResults.results
      if(curResAll && curResAll.length > 0 && !curResAll[0].url && curResAll[0].data && curResAll[0].type == "cliqz-pattern")
        curResAll[0].url = curResAll[0].data.urls[0].href;

      if(curResAll && curResAll.length > 0 && curResAll[0].url)
        CLIQZ.Core.autocompleteQuery(CliqzUtils.cleanMozillaActions(curResAll[0].url), curResAll[0].title, curResAll[0].data);

      XULBrowserWindow.updateStatusField();
    },
    results: function(res){
        if (!gCliqzBox)
            return;

        
        if(!gCliqzBox.resultsBox){
            var cliqzBox = CLIQZ.Core.popup.cliqzBox;
            if(cliqzBox){
                UI.main(cliqzBox);
            }
        }
        currentResults = enhanceResults(res);
        

        
        var asyncResults = currentResults.results.filter(function(r) { return r.type == "cliqz-extra" && "__callback_url__" in r.data; } );
        var query = currentResults.q;
        if (!query)
          query = "";
        currentResults.results = currentResults.results.filter(function(r) { return !(r.type == "cliqz-extra" && "__callback_url__" in r.data); } );
        
        
        
        
        
        

        
        if(gCliqzBox.resultsBox) {
            var now = Date.now();
            UI.lastDispatch = now;

            if(CliqzUtils.getPref("animations", false))
              UI.dispatchRedraw(CliqzHandlebars.tplCache.results(currentResults), now);
            else
              gCliqzBox.resultsBox.innerHTML = CliqzHandlebars.tplCache.results(currentResults);
            UI.loadAsyncResult(asyncResults);
        }


        
        CLIQZ.Core.popup.mPopupOpen = true;

        var width = Math.max(CLIQZ.Core.urlbar.clientWidth,500)

        
        gCliqzBox.style.width = width + 1 + "px"
        gCliqzBox.resultsBox.style.width = width + (CliqzUtils.isWindows(CliqzUtils.getWindow())?-1:1) + "px"

        
        setTimeout(function(){ hideMisalignedElements(gCliqzBox.resultsBox); }, 0);

        
        CliqzAutocomplete.resultsOverflowHeight =
            gCliqzBox.resultsBox.scrollHeight - gCliqzBox.resultsBox.clientHeight;

        return currentResults;
    },
    nextRedraw: 0,
    lastDispatch: 0,


    loadAsyncResult: function(res) {

      if (res && res.length > 0) {
        for (var i in res) {
          var r = res[i];
          var query = r.text;
          
          
          
          var loop_count = 0;
          var async_callback = function(req) {
              
              var resp = undefined;
              try {
                resp = JSON.parse(req.response).results[0];
                
              }
              catch(err) {
                res.splice(i,1);
              }
              
              
              if (resp &&  CLIQZ.Core.urlbar.value == query) {

                var kind = r.data.kind;
                if ("__callback_url__" in resp.data) {
                    
                    if (loop_count < smartCliqzMaxAttempts) {
                      setTimeout(function() {
                        loop_count += 1;
                        
                        
                        CliqzUtils.httpGet(resp.data.__callback_url__, async_callback, async_callback);
                      }, smartCliqzWaitTime);
                    }
                    else if (currentResults.results.length == 0) {
                      UI.setDropdownContents(CliqzHandlebars.tplCache.noResult(CliqzUtils.getNoResults()) );
                    }
                }
                else {
                  r.data = resp.data;
                  r.url = resp.url;
                  r.data.kind = kind;
                  r.data.subType = resp.subType;
                  r.data.trigger_urls = resp.trigger_urls;
                  r.vertical = r.data.template;
                  r.urlDetails = CliqzUtils.getDetailsFromUrl(r.url);
                  r.logo = CliqzUtils.getLogoDetails(r.urlDetails);

                  if(gCliqzBox.resultsBox && CLIQZ.Core.urlbar.value == query) {
                      
                      currentResults.results = currentResults.results.filter(function(r) { return r.type != "cliqz-extra"; } );
                      
                      currentResults.results.unshift(r);
                      var now = Date.now();
                      UI.lastDispatch = now;
                      if (currentResults.results.length > 0) {
                        UI.setDropdownContents(CliqzHandlebars.tplCache.results(currentResults), now);
                      }
                      else {
                        UI.setDropdownContents(CliqzHandlebars.tplCache.noResult(CliqzUtils.getNoResults()) );
                      }
                  }
                }
              }
              else {
                res.splice(i,1);
                if (currentResults.results.length == 0)
                  UI.setDropdownContents(CliqzHandlebars.tplCache.noResult(CliqzUtils.getNoResults()) );
              }

          };
          CliqzUtils.httpGet(r.data.__callback_url__, async_callback, async_callback);
        }


      }

    },


    setDropdownContents: function(html, now) {
      if(CliqzUtils.getPref("animations", false)) {
        UI.dispatchRedraw(html, now);
      }
      else
        gCliqzBox.resultsBox.innerHTML = html;
    },

    dispatchRedraw: function(html, id, q) {
      var now = Date.now();
      if(id < UI.lastDispatch) return;
      if(now < UI.nextRedraw) {
        setTimeout(function(){ UI.dispatchRedraw(html, id, q); }, 100);
      } else {
        UI.redrawResultHTML(html, q);
      }
    },
    lastInstantLength: 0,
    lastQuery: "",
    redrawResultHTML: function(newHTML, query) {
      var box = gCliqzBox.resultsBox;

      if(query && query.indexOf(UI.lastQuery) == -1) box.innerHTML = "";
      if(query) UI.lastQuery = query;

      var oldBox = box.cloneNode(true);
      var newBox = box.cloneNode(true);
      newBox.innerHTML = newHTML;

      
      var oldResults = oldBox.getElementsByClassName("cqz-result-box");
      var newResults = newBox.getElementsByClassName("cqz-result-box");

      if (CliqzAutocomplete.lastResultIsInstant) UI.lastInstantLength = newResults.length;
      
      if (CliqzAutocomplete.lastResultIsInstant && newResults.length <= oldResults.length) {
        for(var i=0; i<newResults.length; i++) {
          var oldChild = oldResults[i];
          var curUrls = UI.extractResultUrls(oldChild.innerHTML);
          var newUrls = newResults[i] ? UI.extractResultUrls(newResults[i].innerHTML) : null;
          if(!UI.urlListsEqual(curUrls, newUrls)) {
            box.replaceChild(newResults[i], box.children[i]);
          }
        }
        
        var historyShown = false;
        for(var i=0; i<box.children.length; i++) {
          var res = box.children[i], type = res.getAttribute("type");
          if(type && type.indexOf("cliqz-pattern") != -1) {
            if(historyShown)
              box.removeChild(res);
            historyShown = true;
          }
        }

        if(CliqzAutocomplete.selectAutocomplete) UI.selectAutocomplete();
        return;
      }


      var max = oldResults.length > newResults.length ? oldResults.length : newResults.length;
      box.innerHTML = newHTML;
      newResults = box.getElementsByClassName("cqz-result-box");

      
      var delay = 0;
      
      var t = Date.now() + delay + (delay>0?100:0);
      if(t > UI.nextRedraw) UI.nextRedraw = t;
      if(CliqzAutocomplete.selectAutocomplete) UI.selectAutocomplete();
    },
    
    extractResultUrls: function(str) {
      return str.match(/((?:(http|https|Http|Https|rtsp|Rtsp):\/\/(?:(?:[a-zA-Z0-9\$\-\_\.\+\!\*\'\(\)\,\;\?\&\=]|(?:\%[a-fA-F0-9]{2})){1,64}(?:\:(?:[a-zA-Z0-9\$\-\_\.\+\!\*\'\(\)\,\;\?\&\=]|(?:\%[a-fA-F0-9]{2})){1,25})?\@)?)?((?:(?:[a-zA-Z0-9][a-zA-Z0-9\-]{0,64}\.)+(?:(?:aero|arpa|asia|a[cdefgilmnoqrstuwxz])|(?:biz|b[abdefghijmnorstvwyz])|(?:cat|com|coop|c[acdfghiklmnoruvxyz])|d[ejkmoz]|(?:edu|e[cegrstu])|f[ijkmor]|(?:gov|g[abdefghilmnpqrstuwy])|h[kmnrtu]|(?:info|int|i[delmnoqrst])|(?:jobs|j[emop])|k[eghimnrwyz]|l[abcikrstuvy]|(?:mil|mobi|museum|m[acdghklmnopqrstuvwxyz])|(?:name|net|n[acefgilopruz])|(?:org|om)|(?:pro|p[aefghklmnrstwy])|qa|r[eouw]|s[abcdeghijklmnortuvyz]|(?:tel|travel|t[cdfghjklmnoprtvwz])|u[agkmsyz]|v[aceginu]|w[fs]|y[etu]|z[amw]))|(?:(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[1-9])\.(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[1-9]|0)\.(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[1-9]|0)\.(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[0-9])))(?:\:\d{1,5})?)(\/(?:(?:[a-zA-Z0-9\;\/\?\:\@\&\=\#\~\-\.\+\!\*\'\(\)\,\_])|(?:\%[a-fA-F0-9]{2}))*)?(?:\b|$)/gi);
    },
    urlListsEqual: function(a, b) {
      var s, l, m;
      if(a.length > b.length) {
        s = b;
        l = a;
      } else {
        s = a;
        l = b;
      }
      for(var i=0; i<s.length; i++) {
        if (l.indexOf(s[i]) == -1) return false;
      }
      return true;
    },
    
    
    redrawResult: function(filter, template, data){
        var result;
        if(result =$('.' + IC + filter, gCliqzBox))
            result.innerHTML = CliqzHandlebars.tplCache[template](data);
    },
    keyDown: function(ev){
        var sel = getResultSelection(),
            
            allArrowable = Array.prototype.slice.call($$('[arrow]', gCliqzBox));

        allArrowable = allArrowable.filter(function(el){
            
            if(el.offsetParent == null) return false;

            if(!el.getAttribute('arrow-if-visible')) return true;

            
            
            
            
            if(el.offsetLeft + el.offsetWidth > el.parentElement.offsetWidth)
                return false
            return true;
        });

        var pos = allArrowable.indexOf(sel);

        UI.lastInputTime = (new Date()).getTime()
        if(UI.popupClosed) {
          gCliqzBox.resultsBox.innerHTML = "";
          UI.popupClosed = false;
        }
        switch(ev.keyCode) {
            case TAB:
                if (!CLIQZ.Core.popup.mPopupOpen) return false;
                
                if (ev.shiftKey) {
                    selectPrevResult(pos, allArrowable);
                } else {
                    selectNextResult(pos, allArrowable);
                }
                return true;
            case UP:
                selectPrevResult(pos, allArrowable);
                return true;
            break;
            case DOWN:
                selectNextResult(pos, allArrowable);
                return true;
            break;
            case ENTER:
                UI.lastInput = "";
                return onEnter(ev, sel);
            break;
            case RIGHT:
            case LEFT:
                var urlbar = CLIQZ.Core.urlbar;
                var selection = UI.getSelectionRange(ev.keyCode, urlbar.selectionStart, urlbar.selectionEnd, ev.shiftKey, ev.altKey, ev.ctrlKey | ev.metaKey);
                urlbar.setSelectionRange(selection.selectionStart, selection.selectionEnd);

                if (CliqzAutocomplete.spellCorr.on) {
                    CliqzAutocomplete.spellCorr.override = true;
                }

                return true;
            case KeyEvent.DOM_VK_HOME:
                
                ev.originalTarget.setSelectionRange(0, 0);
                
                
                return true;
            case BACKSPACE:
            case DEL:
                UI.lastInput = "";
                if (CliqzAutocomplete.spellCorr.on && CliqzAutocomplete.lastSuggestions) {
                    CliqzAutocomplete.spellCorr.override = true
                    
                    var words = CLIQZ.Core.urlbar.mInputField.value.split(' ');
                    var wrongWords = CliqzAutocomplete.lastSuggestions[1].split(' ');
                    CliqzUtils.log(JSON.stringify(words), 'spellcorr');
                    CliqzUtils.log(JSON.stringify(wrongWords), 'spellcorr');
                    CliqzUtils.log(words[words.length-1].length, 'spellcorr');
                    if (words[words.length-1].length == 0 && words[words.length-2] != wrongWords[wrongWords.length-2]) {
                        CliqzUtils.log('hi', 'spellcorr');
                        words[words.length-2] = wrongWords[wrongWords.length-2];
                        CLIQZ.Core.urlbar.mInputField.value = words.join(' ');
                        var signal = {
                            type: 'activity',
                            action: 'del_correct_back'
                        };
                        CliqzUtils.telemetry(signal);
                    }
                } else {
                    var signal = {
                        type: 'activity',
                        action: 'keystroke_del'
                    };
                    CliqzUtils.telemetry(signal);
                }
                UI.preventAutocompleteHighlight = true;
                UI.lastSelectedUrl = "";
                clearResultSelection();
                return false;
            default:
                UI.lastInput = "";
                UI.nextRedraw = (Date.now() + 150 > UI.nextRedraw) ? (Date.now() + 150) : UI.nextRedraw;
                UI.preventAutocompleteHighlight = false;
                UI.cursor = CLIQZ.Core.urlbar.selectionStart;
                return false;
        }
    },
    entitySearchKeyDown: function(event, element) {
      if(event.keyCode==13) {
        event.preventDefault();
        navigateToEZinput(element);
      }
    },
    animationEnd: 0,
    selectAutocomplete: function() {
      var target = function() {
        var index = 0;
        var target = $$('[arrow]', gCliqzBox)[0];
        while(target &&
          CliqzHistoryPattern.generalizeUrl(target.getAttribute("url")) !=
          CliqzHistoryPattern.generalizeUrl(CliqzAutocomplete.lastAutocomplete))
          target = $$('[arrow]', gCliqzBox)[++index];
        
        var offset = target ? target.offsetTop : 0;
        if(target && target.className.indexOf("cliqz-pattern") != -1) {
          var context;
          if(context = $('.cqz-result-pattern', gCliqzBox))
            offset += context.parentElement.offsetTop;
        }
        if(offset > 300) {
          
          var urlbar = CLIQZ.Core.urlbar;
          urlbar.mInputField.value = urlbar.mInputField.value.substr(0, urlbar.selectionStart);
          CliqzAutocomplete.lastAutocomplete = null;
          CliqzAutocomplete.lastAutocompleteType = null;
          CliqzAutocomplete.selectAutocomplete = false;
          return null;
        }
        return target;
      };
      
      if (target() && UI.lastSelectedUrl == target().getAttribute("url")) {
        setResultSelection(target(), true, false);
        return;
      }
      
      
      setTimeout(function() {
        var time = (new Date()).getTime();
        if(time - UI.lastInputTime > 300) {
          if (!UI.preventAutocompleteHighlight && time > UI.animationEnd
            && gCliqzBox && CliqzAutocomplete.selectAutocomplete) {
            UI.animationEnd = (new Date()).getTime() + 330;
            setResultSelection(target(), true, false);
          }
        }
      },300);

    },
    clearAutocomplete: function() {
      clearResultSelection();
    },
    
    simulateSelectFirstElement: function () {
      setResultSelection($('[arrow]', gCliqzBox), true, false, false, true);
    },
    cursor: 0,
    getSelectionRange: function(key, curStart, curEnd, shift, alt, meta) {
      var start = curStart, end = curEnd;
      if (key == LEFT) {
        if (shift && meta) {
            start = 0;
            UI.cursor = start;
        } else if (meta) {
            start = 0;
            end = start;
            UI.cursor = start;
        } else if(alt && shift) {
            if (start != end && UI.cursor == end) {
                end = selectWord(CLIQZ.Core.urlbar.mInputField.value, LEFT);
                start = curStart;
                UI.cursor = end;
            } else {
                start = selectWord(CLIQZ.Core.urlbar.mInputField.value, LEFT);
                end = curEnd;
                UI.cursor = start;
            }
        } else if(alt) {
            start = selectWord(CLIQZ.Core.urlbar.mInputField.value, LEFT);
            end = start;
            UI.cursor = start;
        } else if (shift) {
            if (start != end && UI.cursor == end) {
                end -= 1;
                UI.cursor = end;
            } else {
                if(start >= 1) start -= 1;
                UI.cursor = start;
            }
          
        } else {
            if (start != end) {
                end = start;
            } else {
                start -= 1;
                end = start;
            }
            UI.cursor = start;
        }
      } else if (key == RIGHT) {
        if (shift && meta) {
            end = CLIQZ.Core.urlbar.mInputField.value.length;
            UI.cursor = end;
        }
        else if (meta) {
            start = CLIQZ.Core.urlbar.mInputField.value.length;
            end = start;
            UI.cursor = start;
        } else if(alt && shift) {
            if (start != end && UI.cursor == start) {
                start = selectWord(CLIQZ.Core.urlbar.mInputField.value, RIGHT);
                end = curEnd;
                UI.cursor = start;
            } else {
                end = selectWord(CLIQZ.Core.urlbar.mInputField.value, RIGHT);
                start = curStart;
                UI.cursor = end;
            }
        } else if(alt) {
            start = selectWord(CLIQZ.Core.urlbar.mInputField.value, RIGHT);
            end = start;
            UI.cursor = start;
        } else if (shift) {
            if (start != end && UI.cursor == start) {
                start += 1;
                UI.cursor = start;
            } else {
                if(end < CLIQZ.Core.urlbar.mInputField.value.length) end += 1;
                UI.cursor = end;
            }
        
        } else {
          if (start != end) {
              start = end;
          } else {
              start += 1;
              end = start;
          }
          UI.cursor = end;
        }
      }

      return {
        selectionStart: start,
        selectionEnd: end
      };
    },
    closeResults: closeResults,
    sessionEnd: sessionEnd
};


function navigateToEZinput(element){
    var provider_name = element.getAttribute("search-provider"),
        search_url = element.getAttribute("search-url"),
        value = element.value,
        search_engine = Services.search.getEngineByName(provider_name),
        dest_url = search_url + value;

    if (search_engine) {
        dest_url = search_engine.getSubmission(value).uri.spec
    }
    openUILink(dest_url);
    CLIQZ.Core.allowDDtoClose = true;
    CLIQZ.Core.popup.hidePopup();

    var action_type = element.getAttribute("logg-action-type");
    var signal = {
      type: 'activity',
      action: action_type
    };
    CliqzUtils.telemetry(signal);
}

function selectWord(input, direction) {
  var start = 0, end = 0;
  var cursor = UI.cursor;
  input = input.replace(/\W/g, ' ');

  if(direction == LEFT) {
    if(cursor > 0) cursor -= 1;
    for(;input[cursor] == ' ' && cursor >= 0;cursor--);
    for(; cursor>=0 && input[cursor] != " "; cursor--);
    return cursor+1;
  } else {
    for(;input[cursor] == ' ' && cursor < input.length;cursor++);
    for(; cursor<input.length && input[cursor] != " "; cursor++);
    return cursor;
  }
}


function sessionEnd(){
    adultMessage = 0; 
}

var allowDDtoClose = false;
function closeResults(event) {
    var urlbar = CLIQZ.Core.urlbar;

    if($("[dont-close=true]", gCliqzBox) == null) return;

    if (allowDDtoClose) {
        allowDDtoClose = false;
        return;
    }

    event.preventDefault();
    setTimeout(function(){
      var newActive = document.activeElement;
      if (newActive.getAttribute("dont-close") != "true") {
        allowDDtoClose = true;
        CLIQZ.Core.popup.hidePopup();
        gBrowser.selectedTab.linkedBrowser.focus();
      }
    }, 0);
}





function hideMisalignedElements(ctx){
    var elems = $$('[hide-check]', ctx);
    for(var i = 0; elems && i < elems.length; i++){
        var el = elems[i], childrenW = 40 ;
        for(var c=0; c<el.children.length; c++)
            childrenW += el.children[c].clientWidth;

        if(childrenW > el.clientWidth){
            var children = [].slice.call($$('[hide-priority]', el)),
                sorted = children.sort(function(a, b){
                    return +a.getAttribute('hide-priority') < +b.getAttribute('hide-priority')
                });

            while(sorted.length && childrenW > el.clientWidth){
                var excluded = sorted.pop();
                childrenW -= excluded.clientWidth;
                excluded.style.display = 'none';
            }
        }
    }
}

function handlePopupHeight(box){
}


function $(selector, ctx){return (ctx || document).querySelector(selector); }


function $$(selector, ctx){return (ctx || document).querySelectorAll(selector); }


function $_(selector, ctx){
    if(matches(ctx || document, selector)){
        return ctx || document;
    } else return $(selector, ctx);
}



function matches(elem, selector) {
    var f = elem.matches || elem.webkitMatchesSelector || elem.mozMatchesSelector || elem.msMatchesSelector;
    if(f){
        return f.bind(elem)(selector);
    }
    else {
        
        return elem.parentNode && Array.prototype.indexOf.call(elem.parentNode.querySelectorAll(selector), elem) != -1;
    }
}


function closest(elem, selector) {
    while (elem) {
        if (matches(elem, selector)) {
            return elem;
        } else {
            elem = elem.parentElement;
        }
    }
    return false;
}

function generateLogoClass(urlDetails){
    var cls = '';
    
    cls += ' logo-' + urlDetails.name;
    
    cls += ' logo-' + urlDetails.name + '-' + urlDetails.tld.replace('.', '-');
    if (urlDetails.subdomains.length > 0) {
        
        cls += ' logo-' + urlDetails.subdomains[urlDetails.subdomains.length - 1] + '-' + urlDetails.name;
        
        cls += ' logo-' + urlDetails.subdomains[urlDetails.subdomains.length - 1] + '-' + urlDetails.name + '-' + urlDetails.tld.replace('.', '-');
    }

    return cls;
}

function constructImage(data){
    if (data && data.image) {
        var height = IMAGE_HEIGHT,
            img = data.image;
        var ratio = 0;

        switch((data.richData && data.richData.type) || data.type){
            case 'news': 
            case 'shopping':
              height = 64;
              ratio = 1;
              break;
            case 'hq':
                try {
                    if(img.ratio){
                        ratio = parseInt(img.ratio);
                    } else if(img.width && img.height) {
                        ratio = parseInt(img.width) / parseInt(img.height);
                    }
                } catch(e){}
                break;
            case 'video':
                ratio = 16/9;
                break;
            case 'poster':
                height = 67;
                ratio = 214/317;
                break;
            case 'people': 
            case 'person':
                ratio = 1;
                break;
            default:
                ratio = 0;
                break;
        }
        
        if(ratio == 0 || ratio > 0.4 && ratio < 2.5){
            var image = { src: img.src };
            if(ratio > 0) {
                image.backgroundSize = height * ratio;
                image.width = height * ratio ;
                image.height = height;
            }
            if (img && img.duration) {
                image.text = img.duration;
            }

            image.width = image.width || IMAGE_WIDTH;

            return image
        }
    }
    return null;
}


function getFirstVertical(type){
    while(type && !VERTICALS[type[0]])type = type.substr(1);
    return VERTICALS[type[0]] || 'generic';
}

function getPartial(type){
    if(type === 'cliqz-images') return 'images';
    if(type === 'cliqz-cluster') return 'clustering';
    if(type.indexOf('cliqz-pattern') === 0) return 'pattern';
    if(type === 'cliqz-series') return 'series';
    if(type.indexOf('cliqz-custom sources-') === 0) return 'custom';
    if(type.indexOf('cliqz-results sources-') == 0){
        
        
        return getFirstVertical(type.substr(22));
    }
    
    var combined = type.split(' ');
    if(combined.length == 2 && combined[0].length > 0 && combined[1].length > 8){
        return getFirstVertical(combined[1].substr(8));
    }

    return 'generic';
}


function getDebugMsg(fullTitle){
    
    
    
    
    var r = fullTitle.match(/^([\s\S]+) \((.*)\)!$/)
    if(r && r.length >= 3)
        return [r[1], r[2]]
    else
        return [fullTitle, null]
}


function getTags(fullTitle){
    
    var res = fullTitle.match(/^(.+) \u2013 (.+)$/);

    
    return [res[1], res[2].split(",").sort()]
}

function unEscapeUrl(url){
  return Components.classes['@mozilla.org/intl/texttosuburi;1'].
            getService(Components.interfaces.nsITextToSubURI).
            unEscapeURIForUI('UTF-8', url)
}

var TYPE_LOGO_WIDTH = 100; 
function enhanceResults(res){
    var adult = false;

    for(var i=0; i<res.results.length; i++){
        var r = res.results[i];

        if(r.data && r.data.adult) adult = true;


        if(r.type == 'cliqz-extra' || r.type.indexOf('cliqz-pattern') == 0){
            var d = r.data;
            if(d){
                if(d.template && TEMPLATES.hasOwnProperty(d.template)){
                    r.vertical = d.template;
                    r.urlDetails = CliqzUtils.getDetailsFromUrl(r.url);
                    r.logo = CliqzUtils.getLogoDetails(r.urlDetails);
                    if(r.vertical == 'text')r.dontCountAsResult = true;
                } else {
                    
                    r.invalid = true;
                    r.dontCountAsResult = true;
                }

            }
        } else {
            r.urlDetails = CliqzUtils.getDetailsFromUrl(r.url);
            r.logo = CliqzUtils.getLogoDetails(r.urlDetails);

             if (getPartial(r.type) != 'images'){
                 r.image = constructImage(r.data);
                 
                }
            r.vertical = getPartial(r.type);

            
            var _tmp = getDebugMsg(r.title)
            r.title = _tmp[0];
            r.debug = _tmp[1];
            if(!UI.showDebug)
                r.debug = null;

            
            if(r.type.split(' ').indexOf('tag') != -1) {
                _tmp = getTags(r.title);
                r.title = _tmp[0];
                r.tags = _tmp[1];
            }
        }

        r.width = res.width > 500 ? res.width : 500;

        if(r.data && r.data.generic) {
            r.logo.logo_url = "https://cliqz.com"; 
            r.logo.style = CliqzUtils.getLogoDetails(CliqzUtils.getDetailsFromUrl(r.logo.logo_url)).style;
            if(r.logo.style.indexOf('background-image') == -1){
                
                r.logo.style += ";background-image:url(chrome://cliqzres/content/skin/img/cliqzLogo.svg)"
            }
            r.logo.add_logo_url = true;
        }

    }

    var spelC = CliqzAutocomplete.spellCorr;
    
    if(adult) {
        var level = CliqzUtils.getPref('adultContentFilter', 'moderate');
        if(level != 'liberal' && adultMessage != 1)
            res.results = res.results.filter(function(r){ return !(r.data && r.data.adult); });

        if(level == 'moderate' && adultMessage == 0){
            updateMessageState("show", {
                "adult": {
                  "adultConfig": CliqzUtils.getAdultFilterState()
                }
             });
        }
    }
    else if (notSupported()) {
      updateMessageState("show", {
          "footer-message": getNotSupported()
       });
    }
    else if(CliqzUtils.getPref('changeLogState', 0) == 1){
      updateMessageState("show", {
        "footer-message": {
          message: CliqzUtils.getLocalizedString('updateMessage'),
          telemetry: 'changelog',
          searchTerm: '',
          options: [{
              text: CliqzUtils.getLocalizedString('updatePage'),
              action: 'update-show',
              state: 'default'
            }, {
              text: CliqzUtils.getLocalizedString('updateDismiss'),
              action: 'update-dismiss',
              state: 'gray'
            }
          ]
        }
      });
    } else if (spelC.on && !spelC.override && CliqzUtils.getPref('spellCorrMessage', true)) {
        var s = CLIQZ.Core.urlbar.mInputField.value;
        for(var c in spelC.correctBack){
            s = s.split(c).join(spelC.correctBack[c]);
        }
        updateMessageState("show", {
            "footer-message": {
              message: CliqzUtils.getLocalizedString('spell_correction') + ' ' + s + '?',
              searchTerm: s,
              telemetry: 'spellcorrect',
              options: [{
                  text: CliqzUtils.getLocalizedString('yes'),
                  action: 'spellcorrect-revert',
                  state: 'default'
                },
                {
                  text: CliqzUtils.getLocalizedString('no'),
                  action: 'spellcorrect-keep',
                  state: 'default'
                }
              ]
            }
        });
    } else {
      updateMessageState("hide");
    }

    return res;
}

function notSupported(r){
    
    
    if(CliqzUtils.getPref("ignored_location_warning", false) ||
        CliqzUtils.getPref("config_location", "de") == 'de') return false

    
    var lang = navigator.language.toLowerCase();
    return lang != 'de' && lang.split('-')[0] != 'de';
}

function getNotSupported(){
  return {
    message: CliqzUtils.getLocalizedString('OutOfCoverageWarning'),
    telemetry: 'international',
    type: 'cqz-message-alert',
    searchTerm: '',
    options: [{
        text: CliqzUtils.getLocalizedString('keep-cliqz'),
        action: 'keep-cliqz',
        state: 'success'
      }, {
        text: CliqzUtils.getLocalizedString('disable-cliqz'),
        action: 'disable-cliqz',
        state: 'error'
      }
    ]
  }
}

 

function updateMessageState(state, messages) {
  switch (state) {
    case "show":
      gCliqzBox.messageContainer.innerHTML = "";
      Object.keys(messages).forEach(function(tpl_name){
          gCliqzBox.messageContainer.innerHTML += CliqzHandlebars.tplCache[tpl_name](messages[tpl_name]);
      });
      break;
    case "hide":
    default:
      gCliqzBox.messageContainer.innerHTML = "";
      break;
  }
}

function getResultPosition(el){
    return getResultOrChildAttr(el, 'idx');
}

function getResultKind(el){
    return getResultOrChildAttr(el, 'kind').split(';');
}

function getResultOrChildAttr(el, attr){
    var ret;
    while (el){
        if(ret = el.getAttribute(attr)) return ret;
        if(el.className == IC) return ''; 
        el = el.parentElement;
    }
    return '';
}

function urlIndexInHistory(url, urlList) {
    var index = 0;
    for(var key in urlList) {
      if (urlList[key].href == url) {
        index = urlList.indexOf(urlList[key]);
        if (currentResults.results[0].data.cluster === true) {
          index += 1;
        }
        break;
      }
    }
    return index;
}

function messageClick(ev) {
  var el = ev.target;
  

  while (el && (ev.button == 0 || ev.button == 1) && !CliqzUtils.hasClass(el, "cliqz-message-container") ) {
      var action = el.getAttribute('cliqz-action');
      
      

      switch (action) {
        case 'adult':
          handleAdultClick(ev);
          break;
        case 'footer-message-action':
          
          var state = ev.originalTarget.getAttribute('state');
          switch(state) {
              
              case 'disable-cliqz':
                  CliqzUtils.setPref("cliqz_core_disabled", true);
                  updateMessageState("hide");
                  var enumerator = Services.wm.getEnumerator('navigator:browser');

                  
                  while (enumerator.hasMoreElements()) {
                      var win = enumerator.getNext();
                      win.CLIQZ.Core.unload(true);
                  }
                  CliqzUtils.refreshButtons();
                  break;
              case 'keep-cliqz':
                  updateMessageState("hide");
                  
                  CliqzUtils.setPref('ignored_location_warning', true);
                  break;

              case 'spellcorrect-revert':
                var s = CLIQZ.Core.urlbar.value;
                for(var c in CliqzAutocomplete.spellCorr.correctBack){
                    s = s.replace(c, CliqzAutocomplete.spellCorr.correctBack[c]);
                }
                CLIQZ.Core.urlbar.mInputField.setUserInput(s);
                CliqzAutocomplete.spellCorr.override = true;
                updateMessageState("hide");
                break;
              case 'spellcorrect-keep':
                updateMessageState("hide");
                break;

              
              case 'update-show':
                  CLIQZ.Core.openLink(CliqzUtils.CHANGELOG, true);
              case 'update-dismiss':
                  updateMessageState("hide");
                  CliqzUtils.setPref('changeLogState', 2);
                  break;
              default:
                  break;
            break;
          }
          CliqzUtils.telemetry({
            type: 'setting',
            setting: el.getAttribute('cliqz-telemetry'),
            value: state
          });
          setTimeout(function(){ CliqzUtils.refreshButtons(); }, 0);
            break;
        default:
            break;
      }
      
      el = el.parentElement;
    }

    
    

}



function logUIEvent(el, historyLogType, extraData, query) {
  if(!query) var query = CLIQZ.Core.urlbar.value;
  var queryAutocompleted = null;
  if (CLIQZ.Core.urlbar.selectionEnd !== CLIQZ.Core.urlbar.selectionStart) {
      var first = gCliqzBox.resultsBox && gCliqzBox.resultsBox.children[0];
      if (first && !CliqzUtils.isPrivateResultType(getResultKind(first)))
          queryAutocompleted = query;
      if(extraData.action != "result_click")
        var autocompleteUrl = CLIQZ.Core.urlbar.mInputField.value;
      query = query.substr(0, CLIQZ.Core.urlbar.selectionStart);
  }
  if(el && !el.getAttribute) el.getAttribute = function(k) { return this[k]; }

  if(el && el.getAttribute('url')){
      var url = CliqzUtils.cleanMozillaActions(el.getAttribute('url')),
          lr = CliqzAutocomplete.lastResult,
          extra = el.getAttribute('extra'), 
          result_order = currentResults && currentResults.results.map(function(r){ return r.data.kind; }),
          action = {
              type: 'activity',
              current_position: getResultPosition(el),
              query_length: CliqzAutocomplete.lastSearch.length,
              inner_link: el.className ? el.className != IC : false, 
              position_type: getResultKind(el),
              extra: extra,
              search: CliqzUtils.isSearch(url),
              has_image: el.getAttribute('hasimage') || false,
              clustering_override: lr && lr._results[0] && lr._results[0].override ? true : false,
              reaction_time: (new Date()).getTime() - CliqzAutocomplete.lastQueryTime,
              display_time: CliqzAutocomplete.lastDisplayTime ? (new Date()).getTime() - CliqzAutocomplete.lastDisplayTime : null,
              result_order: result_order,
              v: 1
          };
      for(var key in extraData) {
        action[key] = extraData[key];
      }
      CliqzUtils.telemetry(action);
      CliqzUtils.resultTelemetry(query, queryAutocompleted, getResultPosition(el),
          CliqzUtils.isPrivateResultType(action.position_type) ? '' : url, result_order, extra);

      if(!CliqzUtils.isPrivateResultType(action.position_type)){
          if (CliqzHumanWeb && CliqzHumanWeb.queryCache) {
              CliqzHumanWeb.queryCache[decodeURIComponent(url)] = {'d': 1, 'q': CliqzAutocomplete.lastSearch , 't': 'cl', 'pt' : action.position_type};
          }
      }
      else{
          if (CliqzHumanWeb && CliqzHumanWeb.queryCache) {
              CliqzHumanWeb.queryCache[decodeURIComponent(url)] = {'d': 1, 'q': CliqzAutocomplete.lastSearch , 't': 'othr', 'pt' : action.position_type};
          }
      }
    }
    CliqzHistory.updateQuery(query, autocompleteUrl);
    CliqzHistory.setTabData(window.gBrowser.selectedTab.linkedPanel, "type", historyLogType);
}


function resultScroll(ev) {
    CliqzAutocomplete.hasUserScrolledCurrentResults = true;
}

function resultClick(ev){

    var el = ev.target,
        newTab = ev.metaKey || ev.button == 1 ||
                 ev.ctrlKey ||
                 (ev.target.getAttribute('newtab') || false);

    while (el && (ev.button == 0 || ev.button == 1)) {
        if(el.getAttribute('url')){
            logUIEvent(el, "result", {
              action: "result_click",
              new_tab: newTab
            }, CliqzAutocomplete.lastSearch);
            var url = CliqzUtils.cleanMozillaActions(el.getAttribute('url'));
            CLIQZ.Core.openLink(url, newTab);
            CliqzHistoryManager.updateInputHistory(CliqzAutocomplete.lastSearch, url);
            if(!newTab) CLIQZ.Core.popup.hidePopup();
            break;
        } else if (el.getAttribute('cliqz-action')) {
            switch(el.getAttribute('cliqz-action')) {
                case 'stop-click-event-propagation':
                    return;
                case 'copy-calc-answer':
                    var gClipboardHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"]
                                               .getService(Components.interfaces.nsIClipboardHelper);
                    gClipboardHelper.copyString(document.getElementById('calc-answer').innerHTML);
                    document.getElementById('calc-copied-msg').style.display = "";
                    document.getElementById('calc-copy-msg').style.display = "none";
                    break;
                case 'toggle':
                    var toggleId = el.getAttribute('toggle-id');
                    var context = el.getAttribute('toggle-context');
                    if (toggleId && context) {
                        var toggleAttr = el.getAttribute('toggle-attr') || 'cliqz-toggle';
                        var ancestor = closest(el, '.' + context);
                        var toggleElements = $$("[" + toggleAttr + "]", ancestor);
                        for (var i = 0; i < toggleElements.length; i++) {
                            if (toggleElements[i].getAttribute(toggleAttr) == toggleId) {
                                toggleElements[i].style.display = "";
                            } else {
                                toggleElements[i].style.display = "none";
                            }
                        }
                        return;
                    }
                case 'searchEZbutton':
                    ev.preventDefault();
                    navigateToEZinput($('input',el));
                    return;
                case 'alternative-search-engine':
                    enginesClick(ev);
                    break;
                case 'news-toggle':
                    setTimeout(function(){
                      var newTrending = !document.getElementById('actual', el.parentElement).checked,
                          trending = JSON.parse(CliqzUtils.getPref('news-toggle-trending', '{}')),
                          ezID = JSON.parse(el.getAttribute('data-subType')).ez,
                          oldTrending = trending[ezID];

                      trending[ezID] = newTrending;

                      CliqzUtils.setPref('news-toggle-trending', JSON.stringify(trending));

                      CliqzUtils.telemetry({
                        type: 'activity',
                        action: 'news-toggle',
                        ezID: ezID,
                        old_setting: oldTrending ? 'trends': 'latest',
                        new_setting: newTrending ? 'trends': 'latest'
                      });
                    }, 0);

                    return;
                default:
                    break;
            }
        }
        if(el.className == IC) break; 
        el = el.parentElement;
    }
}



function handleAdultClick(ev){
    var state = ev.originalTarget.getAttribute('state'),
        ignored_location_warning = CliqzUtils.getPref("ignored_location_warning"),
        user_location = CliqzUtils.getPref("config_location");

    switch(state) {
        case 'yes': 
            adultMessage = 1;
            UI.handleResults();
            updateMessageState("hide");
            if (user_location != "de" && !ignored_location_warning)
              updateMessageState("show", {
                  "footer-message": getNotSupported()
              });
            break;
        case 'no':
            adultMessage = 2;
            UI.handleResults();
            updateMessageState("hide");
            if (user_location != "de" && !ignored_location_warning)
              updateMessageState("show", {
                  "footer-message": getNotSupported()
               });
            break;
        default:
            var rules = CliqzUtils.getAdultFilterState();
            if(rules[state]){
                CliqzUtils.setPref('adultContentFilter', state);
                updateMessageState("hide");
                UI.handleResults();
                if (user_location != "de" && !ignored_location_warning)
                  updateMessageState("show", {
                      "footer-message": getNotSupported()
                   });
            }
            else {
                
            }
            break;

    }
    if(state && state != 'options'){ 
        CliqzUtils.telemetry({
            type: 'setting',
            setting: 'adultFilter',
            value: state
        });
    }
    setTimeout(function(){ CliqzUtils.refreshButtons(); }, 0);
}

function getResultSelection(){
    return $('[arrow="true"]', gCliqzBox);
}

function clearResultSelection(){
    UI.keyboardSelection = null;
    var el = getResultSelection();
    el && el.setAttribute('arrow', 'false');
    var arrow = $('.cqz-result-selected', gCliqzBox);
    arrow && arrow.removeAttribute('active');
    clearTextSelection();
}

function clearTextSelection() {
    var el = getResultSelection();
    var title = $('.cqz-ez-title', el) || $('.cqz-result-title', el) || $('.cliqz-pattern-element-title', el) || el;
    title && (title.style.textDecoration = "none");
}

function smooth_scroll_to(element, target, duration) {
    target = Math.round(target);
    duration = Math.round(duration);
    if (duration < 0) return
    if (duration === 0) {
        element.scrollTop = target;
        return
    }

    var start_time = Date.now();
    var end_time = start_time + duration;
    var start_top = element.scrollTop;
    var distance = target - start_top;

    
    var smooth_step = function(start, end, point) {
        if(point <= start) { return 0; }
        if(point >= end) { return 1; }
        var x = (point - start) / (end - start); 
        return x*x*x*(x*(x*6 - 15) + 10);
    }

    var previous_top = element.scrollTop;

    
    var scroll_frame = function() {
        if(element.scrollTop != previous_top) return;

        
        var now = Date.now();
        var point = smooth_step(start_time, end_time, now);
        var frameTop = Math.round(start_top + (distance * point));
        element.scrollTop = frameTop;

        
        if(now >= end_time) return;

        
        
        
        if(element.scrollTop === previous_top && element.scrollTop !== frameTop) return;
        previous_top = element.scrollTop;

        
        setTimeout(function(){ scroll_frame(); }, 0);
    }
    
    setTimeout(function(){ scroll_frame(); }, 0);
}

function selectNextResult(pos, allArrowable) {
    if (pos != allArrowable.length - 1) {
        var nextEl = allArrowable[pos + 1];
        setResultSelection(nextEl, true, false, true);
        arrowNavigationTelemetry(nextEl);
    }
}

function selectPrevResult(pos, allArrowable) {
    var nextEl = allArrowable[pos - 1];
    setResultSelection(nextEl, true, true, true);
    arrowNavigationTelemetry(nextEl);
}

function setResultSelection(el, scroll, scrollTop, changeUrl, mouseOver){
    if(el && el.getAttribute("url")){
        
        var target = $('.cqz-ez-title', el) || $('[arrow-override]', el) || el;
        var arrow = $('.cqz-result-selected', gCliqzBox);

        if(!target.hasAttribute('arrow-override') &&
          el.getElementsByClassName("cqz-ez-title").length != 0 && mouseOver) return;

        
        clearResultSelection();

        if(target != el){
            
            el.removeAttribute('arrow');
            target.setAttribute('url', el.getAttribute('url'));
        }
        arrow.className = arrow.className.replace(" notransition", "");
        if(!mouseOver && el.getAttribute("url") == UI.lastSelectedUrl) arrow.className += " notransition";
        UI.lastSelectedUrl = el.getAttribute("url");

        var offset = target.offsetTop;

        if(el.hasAttribute('arrow-override')){
          offset += closest(el, '.cqz-result-box').offsetTop;
        }

        if(target.className.indexOf("cliqz-pattern") != -1) {
          var context;
          if(context = $('.cqz-result-pattern', gCliqzBox))
            offset += context.parentElement.offsetTop;
        }
        var scroll = parseInt(offset/303) * 303;
        if(!mouseOver) smooth_scroll_to(gCliqzBox.resultsBox, scroll, 800);

        target.setAttribute('arrow', 'true');
        arrow.style.top = (offset + target.offsetHeight/2 - 7) + 'px';
        arrow.setAttribute('active', 'true');
        var title = $('.cqz-ez-title', el) || $('.cqz-result-title', el) || $('.cliqz-pattern-element-title', el) || el;
        if(title && title.className.indexOf("title") != -1 && mouseOver) title.style.textDecoration = 'underline';

        
        if (UI.lastInput == "") {
            if (CLIQZ.Core.urlbar.selectionStart !== CLIQZ.Core.urlbar.selectionEnd)
                UI.lastInput = CLIQZ.Core.urlbar.value.substr(0, CLIQZ.Core.urlbar.selectionStart);
            else
                UI.lastInput = CLIQZ.Core.urlbar.value;
        }
        if(changeUrl)
            CLIQZ.Core.urlbar.value = el.getAttribute("url");

        if (!mouseOver)
          UI.keyboardSelection = el;
    } else if (changeUrl && UI.lastInput != "") {
        CLIQZ.Core.urlbar.value = UI.lastInput;
        UI.lastSelectedUrl = "";
        clearResultSelection();
    }
}

function getStatus(ev, el){
  var oTarget = ev.originalTarget;

  return  (oTarget.hasAttribute('newtab') && el.getAttribute('url') ?
          CliqzUtils.getLocalizedString("openInNewTab", el.getAttribute('url')) : ''
     )
     ||
     
     (oTarget.hasAttribute('show-status') &&
        (oTarget.getAttribute('url')
          ||
         oTarget.parentElement.hasAttribute('show-status') && oTarget.parentElement.getAttribute('url'))
     )
     ||
     
     (el.hasAttribute('arrow') ? el.getAttribute('url') : '');
}

var lastMoveTime = Date.now();
function resultMove(ev){
    if (Date.now() - lastMoveTime > 50) {
        var el = ev.target;
        while (el && el.className != IC && !el.hasAttribute('arrow')) {
            el = el.parentElement;
        }
        clearTextSelection();
        setResultSelection(el, false, false, false, true);
        lastMoveTime = Date.now();

        if(!el) return;
        XULBrowserWindow.setOverLink(getStatus(ev, el));
    }
}

function onEnter(ev, item){
  var urlbar = CLIQZ.Core.urlbar;
  var input = urlbar.mInputField.value;
  var cleanInput = input;
  var lastAuto = CliqzAutocomplete.lastAutocomplete ? CliqzAutocomplete.lastAutocomplete : "";
  var urlbar_time = CliqzAutocomplete.lastFocusTime ? (new Date()).getTime() - CliqzAutocomplete.lastFocusTime: null;
  var newTab = ev.metaKey || ev.ctrlKey;

  
  if(input.indexOf("://") == -1 && lastAuto.indexOf("://") != -1) {
    if(CliqzHistoryPattern.generalizeUrl(lastAuto)
    == CliqzHistoryPattern.generalizeUrl(input))
      input = lastAuto;
  }

  
  if(input.indexOf("@") != -1 &&
    input.split("@")[0].indexOf(":") != -1) {
      if(input.indexOf("://") == -1)
        input = "http://" + input;
      var login = input.substr(input.indexOf("://")+3, input.indexOf("@")-input.indexOf("://")-2);
      cleanInput = input.replace(login, "");
  }

  
  
  if (CliqzHistoryPattern.generalizeUrl(lastAuto)
  == CliqzHistoryPattern.generalizeUrl(input) &&
  urlbar.selectionStart !== 0 && urlbar.selectionStart !== urlbar.selectionEnd) {
    logUIEvent(UI.keyboardSelection, "autocomplete", {
      action: "result_enter",
      urlbar_time: urlbar_time,
      autocompleted: CliqzAutocomplete.lastAutocompleteType,
      position_type: ['inbar_url'],
      source: getResultKind(item),
      current_position: -1,
      new_tab: newTab
    });
  }
  
  else if (!CliqzUtils.isUrl(input) && !CliqzUtils.isUrl(cleanInput)) {
    if(CliqzUtils.getPref("double-enter", false) && (CliqzAutocomplete.lastQueryTime + 1500 > Date.now())){
      var r = currentResults.results;
      if(!currentResults.blocked && r.length > 0 && (r.length > 1 || r[0].vertical != 'noResult')){
        currentResults.blocked = true;
        var signal = {
            type: 'activity',
            action: 'double_enter'
        };
        CliqzUtils.telemetry(signal);
        return true;
      }
    }

    logUIEvent({url: input}, "google", {
      action: "result_enter",
      position_type: ['inbar_query'],
      urlbar_time: urlbar_time,
      current_position: -1
    });
    CliqzHistory.setTabData(window.gBrowser.selectedTab.linkedPanel, "extQuery", input);
    CLIQZ.Core.triggerLastQ = true;

    var customQuery = CliqzResultProviders.isCustomQuery(input);
    if(customQuery){
        urlbar.value = customQuery.queryURI;
    }
    return false;
  }
  
  else if (!getResultSelection()){
    logUIEvent({url: input}, "typed", {
      action: "result_enter",
      position_type: ['inbar_url'],
      urlbar_time: urlbar_time,
      current_position: -1,
      new_tab: newTab
    }, CLIQZ.Core.urlbar.mInputField.value);
    CLIQZ.Core.triggerLastQ = true;
  
  } else {
    logUIEvent(UI.keyboardSelection, "result", {
      action: "result_enter",
      urlbar_time: urlbar_time,
      new_tab: newTab
    }, CliqzAutocomplete.lastSearch);
  }

  CLIQZ.Core.openLink(input, newTab);
  CliqzHistoryManager.updateInputHistory(CliqzAutocomplete.lastSearch, input);
  return true;
}

function enginesClick(ev){
    var engineName;
    var el = ev.target;

    if(engineName = ev && ((el && el.getAttribute('engine')) || (el.parentElement && el.parentElement.getAttribute('engine')))){
        var engine;
        if(engine = Services.search.getEngineByName(engineName)){
            var urlbar = CLIQZ.Core.urlbar,
                userInput = urlbar.value;

            
            if(urlbar.selectionStart &&
               urlbar.selectionEnd &&
               urlbar.selectionStart != urlbar.selectionEnd){
                userInput = userInput.slice(0, urlbar.selectionStart);
            }

            var url = engine.getSubmission(userInput).uri.spec,
                action = {
                    type: 'activity',
                    action: 'visual_hash_tag',
                    engine: ev.target.getAttribute('engineCode') || -1
                };

            if(ev.metaKey || ev.ctrlKey){
                CLIQZ.Core.openLink(url, true);
                action.new_tab = true;
            } else {
                gBrowser.selectedBrowser.contentDocument.location = url;
                CLIQZ.Core.popup.closePopup();
                action.new_tab = false;
            }

            CliqzUtils.telemetry(action);
        }
    }
}

function arrowNavigationTelemetry(el){
    var action = {
        type: 'activity',
        action: 'arrow_key',
        current_position: getResultPosition(el),
    };
    if(el){
        
        if(el.getAttribute('extra'))
            action.extra = el.getAttribute('extra');

        action.position_type = getResultKind(el);
        var url = getResultOrChildAttr(el, 'url');
        action.search = CliqzUtils.isSearch(url);
    }
    CliqzUtils.telemetry(action);
}

ctx.CLIQZ.UI = UI;

})(this);