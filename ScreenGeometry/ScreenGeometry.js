(function(exports) {
  var mobileState = "none";
  var MOBILE_WIDTH_BREAKPOINT = 767;

  // ---------------------------------------------
  //
  //              Screen Geoemetry
  //
  // ---------------------------------------------
  var ScreenGeometry = {
    getScreenHeight: function(){
      return $(window).height();
    },
    getScreenWidth: function(){
      return $(window).width();
    },

    elementPositionInWindow: function( element ) {
      var $element = $(element),
          offset   = $element.offset();

      return this.positionRelativeToWindow(offset);

    },

    isPositionInWindow: function( position ) {
      return ( position.left >= 0
        && position.left <= window.outerWidth
        && position.top >= 0
        && position.top <= window.outerHeight);
    },

    isElementOriginInWindow: function( element ) {
      var position = this.elementPositionInWindow( element );
      return this.isPositionInWindow( position );
    },

    isPartOfElementInWindow: function( element ) {
      var origin = this.elementPositionInWindow( element );
          pt_bl  = {
            left: origin.left,
            top: origin.top + $(element).outerHeight()
          },
          pt_br  = {
            left: origin.left + $(element).outerWidth(),
            top: origin.top + $(element).outerHeight()
          },
          pt_tr  = {
            left: origin.left + $(element).outerWidth(),
            top: origin.top
          },
          result = false;

      var points = [origin, pt_bl, pt_br, pt_tr];
      for(var idx = 0; idx < points.length; idx++) {
        var test_pt = points[idx];

        result = this.isPositionInWindow( test_pt );
        if(result) {
          result = true;
        }
      }

      return result;
    },

    positionRelativeToWindow: function( position ) {
      return {
        top:  position.top - $(window).scrollTop() ,
        left: position.left - $(window).scrollLeft()
      };
    },

    isPositionWithinElement: function( position, element ) {
      var $element  = $(element),
          elPos     = $element.offset(),
          width     = $element.outerWidth(),
          height    = $element.outerHeight();

      var left      = elPos.left,
          right     = left + width,
          top       = elPos.top,
          bottom    = top + height;

      return ( position.left >= left
        && position.left <= right
        && position.top >= top
        && position.top <= bottom );
    },

    isMobileLike: function() {
      var mobileSized = ( this.getScreenWidth() <= MOBILE_WIDTH_BREAKPOINT );
      return mobileSized;
    },

    getState: function() {
      if(mobileState == 'none') {
        mobileState = getCurrentState();
      }

      return mobileState;
    }
  };

  // ---------------------------------------------
  //
  //              Private Methods
  //
  // ---------------------------------------------
  function getCurrentState() {
    var mobileLike = ScreenGeometry.isMobileLike(),
      _newState = mobileLike ? "mobile" : "desktop";

    return _newState;
  };

  function watchWindowSize() {
    $( window ).resize( _.throttle( function() {
        var _newState = getCurrentState();

        if( _newState != mobileState ) {
            publishMobileStateChange( mobileState, _newState);
            mobileState = _newState;
        }
    }, 100));
  };

  function publishMobileStateChange ( oldState, newState ) {
    var ev = {
        state:          newState,
        oldState:       oldState,
        screenWidth:    ScreenGeometry.getScreenWidth(),
        screenHeight:   ScreenGeometry.getScreenHeight()
    };
    $(document).trigger("mobileStateChange", [ev]);
  };



  // Bind the window size watcher and export the function
  watchWindowSize();
  exports.ScreenGeometry = ScreenGeometry;

})(window);
