(function(exports, ScreenGeometry, TableSplicer) {

  // StickyHeader.js
  //
  // Dependencies
  // - jQuery
  // - loDash OR Underscore
  // - ScreenGeometry
  //
  // Overview
  //  - Clones and syncs to existing headers
  //  - Creates self-managed headers given limits and parameters
  //  - Headers sleep when off screen
  // -  Reacts to scrolling, position changes, resizes & orientation change
  //  - Automatically stacks headers as they become active
  //  - Seamlessly "lifts" elements off the page
  //  - Works for most elements including headers and table rows

  var SCROLL_BUFFER = 25;

  // Manages the stacking of headers on the page

  var StickyHeaderStack = function StickyHeaderStack(options) {
    options || (options = {});

    this.$stackProxy         = null;

    this.stack               = [];
    this.activeStack         = [];
    this.mobileState         = "none";
    this.positionListeners   = [];
    this._stackOffset        = options.stackOffset        || null;
    this._stackOffsetMobile  = options.stackOffsetMobile  || null;
    this._containment        = options.containment        || {};

    this._absoluteMode        = false;
    this.bottom               = 0;

    this.scrollWatch = options.scrollWatch || window;
  };
  StickyHeaderStack.prototype = {

    initialize: function( options ) {
      this.$stackProxy = $('<div style="width:100%;position:fixed;top:0;left:0;z-index:100;"></div>');
      this.$stackProxy
        .addClass('sticky-stack')
        .appendTo('body');

      this.setupSubscriptions();
    },

    // Push a StickyHeader onto the stack. Does not make it display.
    push: function(header) {
      header.mobileState = this.mobileState;

      this.stack.push(header);
      return this.stack.length - 1;
    },
    // Pop a StickyHeader off the stack
    pop: function(index) {
      if (index) {
        this.stack.splice(index, 1);
        this.updatePositions();
      } else {
        this.stack.pop();
      }
    },

    // Gets the offset for positioning the element
    calculateHeaderOffsets: function(forIndex, updatePositions) {
      forIndex = forIndex ? forIndex : this.stack.length - 1;

      if(this.absoluteMode) {
        this.$stackProxy.css('top', $('body').scrollTop());
      }

      var insertionPoint = this.top;
      for (var idx = 0; idx <= forIndex; idx++) {

        var header = this.stack[idx];
        if (updatePositions) {

          if (header.active) {
            this.pushIntoActiveStack(header);

            insertionPoint = this._constrainInsertionPointToHeaderTop( insertionPoint, header );
            insertionPoint = this._constrainInsertionPointToStackBoundary( insertionPoint );

            header.top = insertionPoint;

          } else {
            this.removeFromActiveStack(header);
          }
        }
        insertionPoint += header.currentHeight;
      }
      this.bottom = insertionPoint;
      return insertionPoint;
    },
    // Ensures that nothing is places above the header top
    _constrainInsertionPointToHeaderTop: function( insertionPoint, header ) {
      if (header.containment.top && insertionPoint < header.containment.top) {
        insertionPoint = header.containment.top;
      }
      return insertionPoint;
    },

    // Ensures the insertion point doesn't try to place outside the stack
    _constrainInsertionPointToStackBoundary: function( insertionPoint ) {
      if (this.containment.top && insertionPoint < this.containment.top) {
        insertionPoint = this.containment.top;
      }
      return insertionPoint;
    },

    // Gets whichever header is actively being displayed before this one
    getPreviousActiveInCategory: function( category ) {
      for(var idx = 0; idx < this.activeStack.length; idx++ ) {
        var header = this.activeStack[idx];

        if(header.category == category) {
          return header;
        }
      }

      return null;
    },

    // Makes an excisting header start displaying
    pushIntoActiveStack: function(header) {
      if(header.activeStackIndex == -1) {
        this.activeStack.push(header);
        header.activeStackIndex = this.activeStack.length - 1;
      }
    },

    // Removes an existing header from the stacking context (stops displaying)
    removeFromActiveStack: function(header) {
      var idx = header.activeStackIndex;
      if (idx >= 0) {
        this.activeStack.splice(idx, 1);
        header.activeStackIndex = -1;
      }
    },

    // Removes all the headers from the display state
    _resetStack: function() {
      _.each( this.activeStack, function( header ) {
        header.activeStackIndex = -1;
      });
      this.activeStack = [];
    },

    // Looks up a header based on its index (order) in the active stack
    getActiveHeaderWithIndex: function(index) {
      if (index < this.activeStack.length) {
        return this.activeStack[index];
      }
    },

    // Gets the total height of all the headers
    getStackHeight: function() {
      var totalHeight = 0;
      for (var idx = 0; idx < this.activeStack.length; idx++) {

        var header = this.activeStack[idx];
        totalHeight += header.currentHeight;
      }

      return totalHeight;
    },

    // Recalculates the positions of all the headers
    updatePositions: function() {
      this.calculateHeaderOffsets(false, true);
      this.height = this.getStackHeight();

      var ev = {
        bottom: this.bottom,
        height: this.height
      };
      this.$stackProxy.trigger('PositionsUpdated', [ev]);
    },

    // The stack simplifies mobile state changes by listening for the state change
    // and then broadcasting the event to the headers
    publishMobileStateChange: function(ev) {
      this.mobileState = ev.state;

      for (var idx = 0; idx < this.stack.length; idx++) {
        var header = this.stack[idx];
        header.mobileState = ev.state;
      }
    },

    // Sets up all the event bindings
    setupSubscriptions: function() {
      var _stack = this;

      this.watchScroll();
      this.watchResize();

      this.mobileState = ScreenGeometry.getState();

      $(document).on("mobileStateChange", function(event, data) {
        _stack.publishMobileStateChange(data);
        _stack.updatePositions();
      });
    },

    // Monitors the position of elements on the page so the headers
    // can change state when the position
    addPositionListener: function(header, position, ev, options) {
      options || (options = {});
      this.positionListeners.push({
        _position: position,
        ev: ev,
        previousState: "none",
        frequency: options.frequency || "change",
        header: header,

        set position(val) {
          this._position = val;
        },
        get position() {
          return (typeof this._position == "number") ? this._position : this._position();
        }
      });
    },

    // Handles the scroll event for all the headers
    scrollHandler: function(event) {
      var $watch = $(this.scrollWatch);

      for (var idx = 0; idx < this.positionListeners.length; idx++) {
        var listener = this.positionListeners[idx],
          position = listener.position(),
          relation;

        if ($watch.scrollTop() < position) {
          relation = "above";
        } else {
          relation = "below";
        }

        if (listener.previousState != relation || listener.frequency == "always") {
          listener.ev(relation, listener, this);
          listener.previousState = relation;
        }
      }
    },

    // Some behaviors require an emulated scroll for the headers to behave properly
    emulateScroll: function( options ) {
      if(options.reset) {
        this._resetStack();
      }
      this.scrollHandler();
      this.updatePositions();
    },

    // Listens for the scroll event
    watchScroll: function() {
      var _stack = this;
      // $(this.scrollWatch).on("touchstart",function(){
      //   alert("started scrolling")
      // });
      $(this.scrollWatch).on('scroll', _.throttle(function() {
        _stack.scrollHandler();
        _stack.updatePositions();
      }, SCROLL_BUFFER));
    },

    // Listens for page resizes
    watchResize: function() {
      var _stack = this;
      $( window ).resize( _.throttle(function() {
        for (var idx = 0; idx < _stack.stack.length; idx++) {
          var header = _stack.stack[idx];
          header.updatePosition();
        }
      }, SCROLL_BUFFER));
    },

    ///////////////////////////////////////
    //  GETTERS & SETTERS

    get absoluteMode() {
      return this._absoluteMode;
    },

    set absoluteMode( val ) {
      if(val == this._absoluteMode) return;

      var position = val ? "absolute" : "fixed";
      this._absoluteMode = val;

      this.$stackProxy.css('position', position);
      if(!val) {
        this.$stackProxy.css('top', 0);
      }
      this.updatePositions();
    },

    get top() {
      var offset = 0,
          base   = 0;

      if(this.mobileState != "mobile") {
        offset = _.isFunction(this.stackOffset) ? this.stackOffset() : this.stackOffset;
      } else {
        offset = _.isFunction(this.stackOffsetMobile) ? this.stackOffsetMobile() : this.stackOffsetMobile;
      }

      return base + offset;
    },

    set height( val ) {
      this.$stackProxy.height(val);
    },
    get height() {
      return this.$stackProxy.height();
    },

    get stackOffset() {
      if(!this._stackOffset) {
        return 0;
      }
      if(typeof this._stackOffset === 'number') {
        return this._stackOffset;

      } else if(typeof this._stackOffset === 'string' || this._stackOffset instanceof $) {
        var $offset = $(this._stackOffset);
        if($offset.css('position') == 'fixed' || $offset.css('position') == 'absolute') {
          return $offset.outerHeight();
        } else {
          return 0;
        }

      }
    },

    set stackOffset( val ) {
      this._stackOffset = val;
      this.updatePositions();
    },

    get stackOffsetMobile() {
      if(!this._stackOffsetMobile) {
        return this.stackOffset;  //Fallback to the stack offset if no mobile option is define\d
      }
      if(typeof this._stackOffsetMobile === 'number') {
        return this._stackOffsetMobile;

      } else if(typeof this._stackOffsetMobile === 'string' || this._stackOffsetMobile instanceof $) {

        var $offset = $(this._stackOffsetMobile);
        if($offset.css('position') == 'fixed' || $offset.css('position') == 'absolute') {
          return $offset.outerHeight();
        } else {
          return 0;
        }


      }
    },

    set stackOffsetMobile( val ) {
      this._stackOffsetMobile = val;
      this.updatePositions();
    },


    set containment( val ) {
      this._containment = val;
      this.updatePositions();
    },

    get containment() {
      return this._containment;
    }

  };

  var StickyHeaderBoundary = function StickyHeaderBoundary(selector, options) {
    options || (options = {});

    this.$boundary = $(selector);
  };
  StickyHeaderBoundary.prototype = {
    get top() {
      var position = ScreenGeometry.elementPositionInWindow(this.$boundary);
      if(position) {
        return position.top;
      } else {
        return 0;
      }
    },

    get height() {
      return this.$boundary.outerHeight();
    },

    // bottom position *in window*
    get bottom() {
      return this.top + this.height;
    }
  };




  // Causes a header to behave as a sticky header, sticking to the top
  // of the page
  // options: {
  //     scrollWatch: selector or element to watch,
  //     hideAbove: hides the header above the given y index
  //     alwaysActive: keep the header sticky at all times
  //     customLeftAlignment: if false, the default behavior will attempt to align with the source element
  //     hideOnMobile: hides on mobile if true
  //     hideOnDesktop: hides on desktop if true
  var StickyHeader = function StickyHeader(selector, options) {
    options = options ? options : {};

    this.$header       = $(selector).first();
    this.$stickyHeader = null;
    this.alwaysActive  = options.alwaysActive || false;
    this._active       = this.alwaysActive || null;
    this.type          = "normal";

    this.activeStackIndex = -1;

    this.cachedDOM = {};

    this.hidden                 = false;
    this.category               = options.category || null;
    this.customLeftAlignment    = options.customLeftAlignment || false;

    this.stack        = StickyHeaderStack;
    this.placeholder  = options.placeholder || "clone";
    this.mobileState  = 'none';

    this.containment = options.containment || {};

    this.hideOnDesktop = options.hideOnDesktop || false;
    this.hideOnMobile = options.hideOnMobile || false;

    this.sleeping = false;

    this.sleepCheckInterval           = null;
    this.syncToBaseHeaderInterval     = null;

    // Event binding
    this.onClick             = options.onClick  || null;

    // Cached copies of DOM information
    this._top     = null;
    this._bottom  = null;
    this._width   = null;
    this._height  = null;

    // Initialization
    this.initialize(options);
  };
  StickyHeader.prototype = {
    initialize: function(options) {
      this.setupDOM();

      StickyHeaderStack.push(this);
      StickyHeaderStack.updatePositions();

      this.syncToBaseHeader();
      this.createSleepCheckInterval();
    },

    // Builds the sticky twin of the header
    setupDOM: function() {
      var tagName = this.$header.prop("tagName"),
          $clone  = this.$header.clone();

      if(tagName == 'THEAD' || tagName == 'TR') {
        $clone.attr('id', $clone.attr('id') + '-sticky');

        var $table      = this.getNearestTableAncestor( this.$header ),
            $tableClone;

        switch(tagName) {
          case 'THEAD':
            $tableClone = TableSplicer.cloneHeader( $table );
            break;
          case 'TR':
            $tableClone = TableSplicer.cloneHeaderRow( $table, this.$header );
            break;
        }
        $tableClone.attr('id', $tableClone.attr('id') + '-sticky');

        this.$stickyHeader = $tableClone;
        this.type          = 'thead';

      } else {
        this.$stickyHeader = $clone;
      }

      this.$stickyHeader
        .attr('id', this.$header.attr('id') + "-sticky")
        .addClass('sticky-header')
        .appendTo(this.stack.$stackProxy);

      if(this.onClick) {
        var _this       = this,
            clickEvent  = (this.onClick == 'scrollToOrigin') ? function() { _this.scrollToOrigin(); } : this.onClick;

        this.$stickyHeader.on("click", clickEvent );
        this.$stickyHeader.on("touchend", clickEvent );
      }

      this.updatePosition();

    },

    // When a header is a table row we need to identify the table itself
    getNearestTableAncestor: function( el ) {
      var $el    = $(el);
      return $el.parents('table');
    },

    // The placeholder is the existing header element that lives in the DOM normally
    getPlaceholderPositionInWindow: function() {
      var position = ScreenGeometry.elementPositionInWindow(this.$header);
      if(position) {
        return position;
      } else {
        return 0;
      }
    },

    // Updates the position of the header
    updatePosition: function() {
      if(!this.customLeftAlignment) {
        var placeholderPosition = this.getPlaceholderPositionInWindow();
        this.$stickyHeader.css('left', placeholderPosition.left);
      }
    },

    stopSyncToBaseHeader: function() {
      if( this.syncToBaseHeaderInterval ) {
        clearInterval( this.syncToBaseHeaderInterval );
      }
      this.syncToBaseHeaderInterval = null;
    },

    syncToBaseHeader: function() {
      var _header         = this,
          _changedState   = false;

      this.stopSyncToBaseHeader();
      if(this.type == 'thead') return;

      this.syncToBaseHeaderInterval = setInterval( function() {
        var stickyDisplay = _header.$stickyHeader.css('display'),
            baseDisplay   = _header.$header.css('display'),
            classes = _header.$header.attr('class'),
            html = _header.$header.html();

        classes = classes ? classes + ' sticky-header' : 'sticky-header';
        classes = _header.$stickyHeader.hasClass('active') ? classes + ' active' : classes;


        if(stickyDisplay != baseDisplay) {
          if(_header.$header.css('display') == 'none' && _header.$stickyHeader.css('display') != 'none' ) {
            _header.$stickyHeader.css('display', 'none');
            _changedState = true;

          } else if(_header.$stickyHeader.css('display') != 'block' ) {
            _header.$stickyHeader.css('display', 'block');
            _changedState = true;
          }
        }

        // Match up the sticky header with the source
        // We cut down on DOM writes by caching the values
        // and only updating the DOM when changes have occurred
        if(!_header.cachedDOM['class'] || _header.cachedDOM['class'] != classes ) {
          _header.$stickyHeader.attr('class', classes);
          _header.cachedDOM['class'] = classes;
          _changedState = true;
        }
        if(!_header.cachedDOM.html || _header.cachedDOM.html != html ) {
          _header.$stickyHeader.html(html);
          _header.cachedDOM.html = html;
          _changedState = true;
        }

        // Trigger the parent to recalculate positions, since
        // geometry-related changes may have occurred
        if(_changedState) {
          _header.stack.updatePositions();
          _changedState = false;
        }

      }, 1000);
    },

    createSleepCheckInterval: function() {
      var _this = this;

      if( this.sleepCheckInterval ) {
        clearInterval( this.sleepCheckInterval );
        this.sleepCheckInterval = null;
      }

      this.sleepCheckInterval = setInterval( function() {
        _this.sleepCheck();
      }, 50);
    },

    sleepCheck: function() {
      var shouldSleep = this.shouldSleep();
      if(shouldSleep && !this.sleeping) {
        this.sleep();

      } else if(!shouldSleep && this.sleeping ) {
        this.wake();
      }
    },

    shouldSleep: function() {
      return !this._active && !ScreenGeometry.isPartOfElementInWindow( this.$header );
    },

    sleep: function() {
      this.stopSyncToBaseHeader();
      this.sleeping = true;

      // Reset the cached properties just to be safe
      this._top = null;
    },

    wake: function() {
      this.syncToBaseHeader();
      this.sleeping = false;
    },
    scrollToOrigin: function( e ) {
      $(window).scrollTop( this.$header.offset().top - this.bottom - 32 );
      var _this = this;
      setTimeout( function() {
        _this.stack.emulateScroll({ reset: true });
      }, 50);

    },


    ///////////////////////////////////////
    //  GETTERS & SETTERS

    get currentHeight() {
      if (!this._active || this.$stickyHeader.css('display') == 'none') {
        return 0;
      }
      return Math.max(this.$stickyHeader.outerHeight(), 0);

    },

    get bottom() {
      return (this.top + this.currentHeight);
    },

    get top() {
      if(this._top !== null) {
        return this._top;
      } else {
        var transform = ScreenGeometry.getTransform( this.$stickyHeader ),
            top       = 0;

        if(transform && transform.y) {
          top = transform.y;
        }

        if(typeof top === "string") {
          top = parseInt(top.replace('px'));
        }
        return (top == 'auto') ? 0 : top;
      }

    },

    set top(newValue) {
      // Filter the values
      if (newValue < 0) {
        newValue = 0;
      }

      // Set the position IF its a new position
      if(this._top !== newValue) {
        this._top = newValue;
        ScreenGeometry.setTransform( this.$stickyHeader, { y: this._top + 'px'});
      }
    },

    get active() {
      // Temporarily disabling this aspect of the 'sleep' function
      // because it causes some inconsistency with properly pushing/popping

      // if(this.sleeping) {
      //   return this._active;
      //
      // }
      if(!this.alwaysActive) {
        var placeholderPosition = this.getPlaceholderPositionInWindow(),
          idx                   = this.activeStackIndex,
          stackLength           = this.stack.activeStack.length,
          bottom;

      if(idx == 0) {
          bottom = this.stack.top;

        } else if(idx > 0) {
          bottom = this.stack.getActiveHeaderWithIndex(idx - 1).bottom;

        } else {
          bottom = this.stack.bottom;
        }
      }

      if (this.alwaysActive || placeholderPosition.top <= bottom) {
        this._active = true;
        this.$stickyHeader.addClass('active');
        this.$stickyHeader.css('visibility', 'visible');
        this.$header.css('visibility', 'hidden');
      } else {
        this._active = false;
        this.$stickyHeader.removeClass('active');
        this.$stickyHeader.css('visibility', 'hidden');
        this.$header.css('visibility', 'visible');
      }

      return this._active;
    },
  };

  // A sticky pushable won't be part of a stacking context, but it will be pushed by
  // the sticky header stack

  var StickyPushable = function StickyPushable( selector, options ) {
    options || (options = {});

    this.$el  = $(selector);
    this.$container = $(options.container || this.$el.parent());
    this.pusher = options.pusher || window;

    this._mobileState = "none";
    this.activeOnMobile   = options.activeOnMobile || true;
    this.activeOnDesktop  = options.activeOnDesktop || true;

    this.initialize( options );

    return this;
  };
  StickyPushable.prototype = {
    initialize: function( options ) {
      this.$el.css('position', 'relative');
      this.$el.css('transition', 'all 0.1s');
      this.subscribeToStackUpdates();
      this.subscribeToMobileStateChange();

      this.watchResize();
      this.refresh();

    },

    refresh: function() {
      this.screenTop = this.getPusherBottom();
    },

    subscribeToStackUpdates: function() {
      var _this = this;
      if(this.pusher instanceof StickyHeaderStack.constructor) {
        this.pusher.$stackProxy.on('PositionsUpdated', _.throttle( function( ev, data ) {
          _this.onPusherUpdate( _this.getPusherBottom() );
        }, 5));

      } else {
        $(this.pusher).scroll(_.throttle( function( ev ) {
          _this.onPusherUpdate( _this.getPusherBottom() );
        }, SCROLL_BUFFER ));
      }

    },

    getPusherBottom: function() {
      if(this.pusher instanceof StickyHeaderStack.constructor) {
        return $(window).scrollTop() + this.pusher.bottom;
      } else {
        return $(window).scrollTop();
      }
    },

    watchResize: function() {
      var _pusher = this;
      $( window ).resize( _.throttle(function() {
        _pusher.refresh();
      }, SCROLL_BUFFER));
    },

    subscribeToMobileStateChange: function() {
      var _pushable = this;
      $(document).on("mobileStateChange", function(event, data) {
        _pushable.mobileState = data.state;
      });
    },

    onPusherUpdate: function( bottom ) {
      this.screenTop = bottom;
    },

    getContainerBottom: function() {
      return (this.$container.offset().top + this.$container.height());
    },


    ///////////////////////////////////////
    //  GETTERS & SETTERS
    set top( val ) {
      if(this._top && this._top == val) {
        return;
      } else {
        if(val < 0) {
          val = 0;
        }
        val = Math.round(val);
        if((this.mobileState == "mobile" && this.activeOnMobile) || (this.mobileState != "mobile" && this.activeOnDesktop )) {
          ScreenGeometry.setTransform( this.$el, { y: val + 'px'});

        } else {
          ScreenGeometry.setTransform( this.$el, { y: 0 + 'px'});
        }

        this._top = val;
      }

    },

    set mobileState( val ) {
      this._mobileState = val;
      this.refresh();
    },

    get mobileState() {
      return this._mobileState;
    },

    get height() {
      return this.$el.outerHeight();
    },

    get originalTop() {
      if(this._originalTop) {
        return this._originalTop;
      } else {
        var cssTop = ScreenGeometry.getTransform( this.$el );

        if( (typeof cssTop === 'undefined') || (typeof cssTop == 'string' && cssTop == 'none')) {
          cssTop = 0;
        }
        this._originalTop = this.$el.offset().top - cssTop;
        return this._originalTop;
      }
    },

    set screenTop( screenPosition ) {
      var containerBottom = this.getContainerBottom(),
          relativePosition;

      if(screenPosition + this.height > containerBottom) {
        screenPosition = containerBottom - this.height;
      }
      relativePosition = screenPosition - this.originalTop;

      this.top = relativePosition;
    }
  };


  StickyHeaderStack = new StickyHeaderStack();

  $(document).ready(function() {
    StickyHeaderStack.initialize();
  });

  exports.StickyHeaderStack     = StickyHeaderStack;
  exports.StickyHeader          = StickyHeader;
  exports.StickyPushable        = StickyPushable;
  exports.StickyHeaderBoundary  = StickyHeaderBoundary;
})(window, ScreenGeometry, TableSplicer);
