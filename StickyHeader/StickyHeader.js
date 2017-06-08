export class StickyHeader {
  constructor( selector, stack, options ) {
    this.selector   = selector;
    this.stack      = stack;
    this.active     = false;

    this.subscribers = [];

    this.dom = {
      base:     document.querySelector( this.selector ),
      sticky:   null
    };

    this.buildDOM();
  }

  buildDOM() {
    var clone = this.dom.base.cloneNode(true);
    this.dom.sticky = clone;
  }

  bindEvents() {
      this.stack.onScroll( (stackBottom, ev) => {

      });
  }

  checkTrigger( bottom ) {
      if(bottom >= this.base.)
  }

  onTrigger( fn ) {
    this.subscribers.push(fn);  
  }

  afterPop() {
    this.active = false;

  }
}