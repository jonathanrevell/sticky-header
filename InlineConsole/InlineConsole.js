if(window.location.origin.indexOf('dev.nuskin') !== -1 || window.location.origin.indexOf('test.nuskin') !== -1) {
  // Emergency test code. REMOVE WHEN DONE (TODO)
  var buildFakeLogger = function() {
    var style = "style='font-size:14px;position:fixed;bottom:0;left:0;width:100%;background-color:black;color:white;max-height:120px;''",
        input = $('<input id="inline-console" style="display:inline-block;min-width:200px;font-size: 16px;">'),
        evalButton = $('<button onclick="window.evalinlineconsole()" style="display:inline-block;">Eval</button>"'),
        prevButton = $('<button onclick="window.getinlineprev()" style="display:inline-block;">Prev</button>'),
        wrapper = $('<details id="logger"' + style + '><summary>Console</summary></details>'),
        history = $('<div id="logger-history" style="width:100%;height:4em;overflow:scroll;"></div>');

        wrapper.append(history);
        wrapper.append(input);
        wrapper.append(evalButton);
        wrapper.append(prevButton);

    $('body').append(wrapper);
  };
  buildFakeLogger();
  window._fakelog = function(str) {
    $('#logger-history').prepend('<p>' + str + '</p>');
    console.log(arguments);
  };

  // Cleans up circular structures using caching
  // http://stackoverflow.com/a/11616993
  var extStringify = function( obj ) {
    var cache = [];
    var result = JSON.stringify(obj, function(key, value) {
        if (typeof value === 'object' && value !== null) {
            if (cache.indexOf(value) !== -1) {
                // Circular reference found, discard key
                return;
            }
            // Store value in our collection
            cache.push(value);
        }
        return value;
    });
    cache = null; // Enable garbage collection

    return result;
  };

  window.getinlineprev = function() {
    $('#inline-console').val(lastInput);
  };

  var lastInput = "";
  window.evalinlineconsole = function() {
    var str = $('#inline-console').val();
    lastInput = str;
    var exp = str + " > ";
    if(str) {
      try {
        var result = eval(str);
        if(typeof result === 'object') {
          _fakelog(exp + extStringify(result));
        } else {
          _fakelog(exp + result );
        }
      }
      catch (e) {
        _fakelog(exp + "(Unable to parse) " + e);
      }


    } else {
      _fakelog(exp + "Unable to parse input");
    }
    $('#inline-console').val("");
  };
} else {
  _fakelog = function( arguments ) {
    console.log(arguments);
  };
}
