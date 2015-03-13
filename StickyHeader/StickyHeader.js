(function(exports) {

  var SCROLL_BUFFER = 25;

  // Manages the stacking of headers on the page

  var StickyHeaderStack = function(options) {
    options || (options = {});

    this.stack = [];
    this.activeStack = [];
    this.positionListeners = [];
    this.$stackOffset = null;
    this.bottom = 0;

    this.scrollWatch = options.scrollWatch || window;
    this.watchScroll();
  }
  StickyHeaderStack.prototype = {

    push: function(header) {
      // header.mobileState = util.MobileUtils.getState();
      header.mobileState = "desktop";

      this.stack.push(header);
      return this.stack.length - 1;
    },
    pop: function(index) {
      if (index) {
        this.stack.splice(index, 1);
        this.updatePositions();
      } else {
        this.stack.pop();
      }
    },

    // Gets the offset for positioning the element
    getOffset: function(forIndex, updatePositions) {
      forIndex = forIndex ? forIndex : this.stack.length - 1;

      var insertionPoint = 0;
      for (var idx = 0; idx <= forIndex; idx++) {

        var header = this.stack[idx];
        if (updatePositions) {

          if (header.active) {
            this.pushIntoActiveStack(header);

            if (header.containment.top && insertionPoint < header.containment.top) {
              insertionPoint = header.containment.top;
            }
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

    pushIntoActiveStack: function(header) {
      if(header.activeStackIndex == -1) {
        this.activeStack.push(header);
        header.activeStackIndex = this.activeStack.length - 1;
      }
    },

    removeFromActiveStack: function(header) {
      var idx = header.activeStackIndex;
      if (idx >= 0) {
        this.activeStack.splice(idx, 1);
        header.activeStackIndex = -1;
      }
    },

    getActiveHeaderWithIndex: function(index) {
      if (index < this.activeStack.length) {
        return this.activeStack[index];
      }
    },

    getStackHeight: function() {
      var totalHeight = 0;
      for (var idx = 0; idx < this.stack.length; idx++) {

        var header = this.stack[idx];
        totalHeight += header.currentHeight;
      }

      return totalHeight;
    },

    updatePositions: function() {
      this.getOffset(false, true);
    },

    publishMobileStateChange: function(ev) {
      for (var idx = 0; idx < this.stack.length; idx++) {
        var header = this.stack[idx];
        header.mobileState = ev.state;
      }
    },

    setupSubscriptions: function() {
      var _stack = this;
      $(document).on("mobileStateChange", function(event, data) {
        _stack.publishMobileStateChange(data);
        _stack.updatePositions();
      });
    },

    setHeaderSpaceOffsetElement: function(el) {
      this.$stackOffset = $(el);
      this.$stackOffset.css("display", "block");
      this.$stackOffset.width("100%");
    },

    setHeaderReservedSpace: function() {

      if (this.$stackOffset) {
        var offset = 0;

        for (var idx = 0; idx < this.stack.length; idx++) {
          var _header = this.stack[idx];
          offset += _header.reservedSpaceHeight;
        }

        this.$stackOffset.height(offset);
      }
    },
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
    watchScroll: function() {
      var _stack = this;
      $(this.scrollWatch).on('scroll', _.throttle(function() {
        _stack.scrollHandler();
        _stack.updatePositions();
      }, SCROLL_BUFFER));
    },

  };




  // Causes a header to behave as a sticky header, sticking to the top
  // of the page
  // options: {
  //     scrollWatch: selector or element to watch,
  //     hideAbove: hides the header above the given y index
  var StickyHeader = function(selector, options) {
    options = options ? options : {};

    this.$header = $(selector);
    this.$stickyHeader = null;
    this._active = false;
    this.activeStackIndex = -1;

    this.hidden = false;

    this.stack = StickyHeaderStack;
    this.placeholder = options.placeholder || "clone";
    this.mobileState = 'none';

    this.containment = options.containment || {};

    this.hideOnDesktop = options.hideOnDesktop || false;
    this.hideOnMobile = options.hideOnMobile || false;


    // Initialization
    this.initialize(options);
  };


  StickyHeader.prototype = {
    initialize: function(options) {
      this.createStickyClone();

      StickyHeaderStack.push(this);
      StickyHeaderStack.updatePositions();
    },
    createStickyClone: function() {
      var placeholderPosition = this.getPlaceholderPositionInWindow();

      this.$stickyHeader = this.$header.clone();
      this.$stickyHeader
        .attr('id', this.$header.attr('id') + "-sticky")
        .addClass('sticky-header')
        .appendTo('body')
        .css('left', placeholderPosition.left);

    },
    getPlaceholderPositionInWindow: function() {
      return ScreenGeometry.elementPositionInWindow(this.$header);
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
      var top = this.$stickyHeader.css('top');
      if(typeof top === "string") {
        top = parseInt(top.replace('px'));
      }
      return (top == 'auto') ? 0 : top;
    },

    set top(newValue) {
      if (newValue < 0) {
        newValue = 0;
      }
      this.$stickyHeader.css('top', newValue);
    },

    get active() {
      var placeholderPosition = this.getPlaceholderPositionInWindow(),
        idx                   = this.activeStackIndex,
        stackLength           = this.stack.activeStack.length,
        bottom;

      if(idx == 0) {
        bottom = 0;

      } else if(idx > 0) {
        bottom = this.stack.getActiveHeaderWithIndex(idx - 1).bottom;

      } else {
        bottom = this.stack.bottom;
      }

      if (placeholderPosition.top <= bottom) {
        this._active = true;
        this.$stickyHeader.addClass('active');
        this.$stickyHeader.css('visibility', 'visible');
      } else {
        this._active = false;
        this.$stickyHeader.removeClass('active');
        this.$stickyHeader.css('visibility', 'hidden');
      }

      return this._active;
    },
  }

  StickyHeaderStack = new StickyHeaderStack();

  $(document).ready(function() {
    StickyHeaderStack.setupSubscriptions();

    $('body').prepend('<div class="stickyHeaderOffset"></div>');
    StickyHeaderStack.setHeaderSpaceOffsetElement('.stickyHeaderOffset');
  });

  exports.StickyHeaderStack = StickyHeaderStack;
  exports.StickyHeader = StickyHeader;
})(window);
