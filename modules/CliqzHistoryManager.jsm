'use strict';


var EXPORTED_SYMBOLS = ['CliqzHistoryManager'];
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/PlacesUtils.jsm')
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('chrome://cliqzmodules/content/CliqzUtils.jsm');

var CliqzHistoryManager = {
    getStats: function(callback){
        let historysize = 0;
        let daysVisited = {};
        let visitedDomainOn = {};
        let visitedSubDomain = {};
        let today = CliqzUtils.getDay();
        let history = today;

        this.PlacesInterestsStorage
            ._execute(
                "SELECT count(*) cnt, MIN(v.visit_date) first " +
                "FROM moz_historyvisits v " +
                "JOIN moz_places h " +
                "ON h.id = v.place_id " +
                "WHERE h.hidden = 0 AND h.visit_count > 0 ",
                ["cnt", "first"],
                function(result) {
                    try {
                        history = Math.floor(result.first / 86400000000);
                        historysize = result.cnt;
                    }
                    catch(ex) {}
                }
            )
            .then(function() {
                if(CliqzUtils){
                    callback({
                        size: historysize,
                        days: CliqzUtils.getDay() - history
                    });
                }
            });
    },
    
    
    
    
    
    updateInputHistory: function(input, url) {
        if(url.indexOf("://") == -1)
            url = "http://" + url;

        
        var sql =
            "INSERT OR REPLACE INTO moz_inputhistory " +
            "SELECT h.id, IFNULL(i.input, :input_text), IFNULL(i.use_count, 0) * .9 + 1 " +
            "FROM moz_places h " +
            "LEFT JOIN moz_inputhistory i ON i.place_id = h.id AND i.input = :input_text " +
            "WHERE url = :page_url ";
        CliqzUtils.setTimeout(function() {
            CliqzHistoryManager.PlacesInterestsStorage
                ._execute(
                    sql,
                    
                    [],
                    function(results) { },
                    {
                        input_text: input,
                        page_url: url
                    }
                )
                .then(function() {
                    
                })
            },
            
            
            5000);
    },
	PlacesInterestsStorage: {
        _execute: function PIS__execute(sql, columns, onRow, parameters) {
            var conn = PlacesUtils.history.QueryInterface(Ci.nsPIPlacesDatabase).DBConnection,
                statement = conn.createAsyncStatement(sql),
                onThen, 
                promiseMock = {
                    then: function(func){
                        onThen = func;
                    }
                };
            if(parameters){
                for(var key in parameters) {
                  statement.params[key] = parameters[key];
                }
            }
            statement.executeAsync({
                handleCompletion: function(reason)  {
                  onThen();
                },

                handleError: function(error)  {
                },

                handleResult: function(resultSet)  {
                  let row;
                  while (row = resultSet.getNextRow()) {
                    
                    let result;
                    if (columns != null) {
                      
                      if (columns.length == 1) {
                        result = row.getResultByName(columns[0]);
                      }
                      
                      else {
                        result = {};
                        for(var i=0; i<columns.length; i++){
                            var column = columns[i];
                            result[column] = row.getResultByName(column);
                        }
                      }
                    }
                    
                    onRow(result);
                  }
                }
            });
            return promiseMock;
        }
    }
};