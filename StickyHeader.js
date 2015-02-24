(function () {

  // Manages the stacking of headers on the page
  var StickyHeaderStack = {
      stack: [],
  	push: function( header ) {
      header.mobileState = nuskin.util.MobileUtils.getState();
  		this.stack.push( header );
  		return this.stack.length - 1;
  	},
  	pop: function( index ) {
  		if(index) {
  			this.stack.splice( index, 1 );
  			this.updatePositions();
  		} else {
  			this.stack.pop();
  		}
  	},

  	// Gets the offset for positioning the element
  	getOffset: function( forIndex, updatePositions ) {
  		forIndex = forIndex ? forIndex : this.stack.length - 1;

  		var totalOffset = 0;
  		for(var idx = 0; idx <= forIndex; idx++ ) {

  			var header = this.stack[idx];
  			if(updatePositions) {
  				header.top = totalOffset;
  			}
  			totalOffset += header.shouldCalculateHeight() ? header.height : 0;
  		}

  		return totalOffset;
  	},

  	updatePositions: function() {
  		this.getOffset( false, true );
  	},

    publishMobileStateChange: function( ev ) {
      for(var idx = 0; idx < this.stack.length; idx++ ) {
        var header = this.stack[idx];
        header.mobileState = ev.state;
      }
    },

    setupSubscriptions: function() {
      var _stack = this;
      $(document).on("mobileStateChange", function( event, data ) {
        _stack.publishMobileStateChange( data );
        _stack.updatePositions();
      });
    }

  };




  // Causes a header to behave as a sticky header, sticking to the top
  // of the page
  // options: {
  //     scrollWatch: selector or element to watch,
  //     hideAbove: hides the header above the given y index
  var StickyHeader = function( selector, options ) {
      options = options ? options : {};

  	  this.$header 	 	    = $(selector);
      this.hidden 		    = false;
      this.hiddenInState  = false;
      this.ignore			    = false;

      this.stack 			    = StickyHeaderStack;
      this.scrollTimeout 	= null;
      this.placeholder    = options.placeholder || false;
      this._mobileState   = 'none';

      this.hideOnDesktop  = options.hideOnDesktop || false;
      this.hideOnMobile   = options.hideOnMobile || false;

      this.classApplied   = false;

      this.SCROLL_BUFFER  = 100;	// How often the scroll event can fire

      // A placeholder tracks an existing element without changing it.
      if( !this.placeholder ) {
      	this.applyClass();
      }

      if(!options.skipStack) {
          StickyHeaderStack.push( this );
          StickyHeaderStack.updatePositions();
      }

      if(options.scrollWatch || options.hideAbove) {
          options.scrollWatch = options.scrollWatch ? options.scrollWatch : window;
          this.watchScroll( options.scrollWatch, options.hideAbove );
          this.scrollHandler();
      }
  };

  StickyHeader.prototype = {
  	get height() {
  		if(this.hidden || this.ignore) {
  			return 0;
  		}
  		return Math.max(this.$header.height(), 0);
  	},
  	get top() {
  		return this.$header.css('top');
  	},
  	set top( newValue ) {
  		if( !this.placeholder ) {
  			if( newValue < 0 ) {
  				newValue = 0;
  			}
  			this.$header.css('top', newValue);
  		}
  	},
    set mobileState( newValue ) {
      this._mobileState = newValue;
      this.hiddenInState = false;

      if( this._mobileState == "desktop" && this.hideOnDesktop ) {
        this.hiddenInState = true;
      }
      if( this._mobileState == "mobile" && this.hideOnMobile ) {
        this.hiddenInState = true;
      }
    },
    get mobileState() {
      return this._mobileState;
    },

    shouldCalculateHeight: function() {
      return (!this.hidden && !this.hiddenInState);
    },

  	applyClass: function() {
  		this.$header.addClass('stickyHeader');
      this.top = 0;
      	if(this.$header.hasClass('stickyHeader')) {
      		this.classApplied = true;
      	}
  	},

      watchScroll: function( watch, hideAbove ) {
          var _header = this;

          this.scrollHandler = function( event ) {
          	var $watch = $(watch);
              if(!_header.hidden && $watch.scrollTop() < hideAbove) {
                  _header.$header.addClass('hidden');
                  _header.hidden = true;
                  _header.stack.updatePositions();

              } else if(_header.hidden && $watch.scrollTop() >= hideAbove) {
                  _header.$header.removeClass('hidden');
                  _header.hidden = false;
                  _header.stack.updatePositions();
              }

          };

          $(watch).on('scroll', _.throttle( this.scrollHandler, this.SCROLL_BUFFER));
      },


  };

  $(document).ready(function(){
    StickyHeaderStack.setupSubscriptions();
  });

  window.StickyHeaderStack = StickyHeaderStack;
  window.StickyHeader = StickyHeader;
})();
