// Test
export class StickyHeaderStack {
    constructor( scrollWatchSelector ) {
        this.dom = {
            el: document.createElement("DIV"),
            scrollWatch: document.querySelector(scrollWatchSelector)
        };
        this.subscribers = {
            scroll: []
        };
    }

    bindEvents() {
        this.dom.el.addEventListener("scroll", (ev) => {
            if(this.subscribers.scroll) {
                this.subscribers.scroll.forEach((fn) => {
                    fn( this.bottom, ev ); 
                });
            }
        });
    }

    get top() {
        return this.dom.el.offsetTop;
    }

    get height() {
        return this.dom.el.offsetHeight;
    }

    get bottom() {
        return this.top + this.height;
    }

    popHeader( header ) {
        this.dom.el.removeChild( header.dom.sticky );
    }

    onScroll( fn ) {
        this.subscribers.scroll.push( fn );
    }
}