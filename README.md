# Sticky Header
A JavaScript library which allows you to specify nearly anything as a sticky header with little configuration.

## Installation
Copy the StickyHeader and ScreenGeometry folders into your project and include them, make sure its dependencies are also installed.

### Dependencies
1. [jQuery](https://jquery.com/)
2. [loDash](https://lodash.com/) *or* [Underscore](http://underscorejs.org/)

## Behavior
The default StickyHeader behavior is to stick/stack on the top of the screen once the window scrolls to/past it. There are lots of configuration options for customizing this behavior to allow the header to always stick to the top of the screen, to only be sticky within certain boundaries, and so on.

StickyHeaders originate from element which live on the page and attempt to create seamless transitions as if the element is actually lifting out of the normal layout and sticking to the top of the page. An example use case would be the header row of a table becoming sticky when the user scrolls the header out of view. The header row would then be able to follow the user down, allowing the user to see which columns were which.

When the StickyHeader counterpart of an element is active, the source element becomes hidden and vice-versa. 

### Performance Optimizations
Headers enter a sleep state when they are scrolled offscreen to reduce polling and DOM changes. When active or awake StickyHeaders watch their source elements for changes so they can continuously match them. This has been optimized by caching the elements in memory and only performing DOM changes when the source element actually changes.


## Usage
To create a StickyHeader, use any valid jQuery selector syntax in specifying the source element.
     new StickyHeader('#myHeaderSelector', { options });

If no StickyHeaderStack is specified, StickyHeaders will stack in the default stack. In most cases you should only need one Stack and will not need to create or specify another.

## Known Issues / Limitations
1. The behavior of the StickyPushable is a little quirky right now and is still being worked on.
2. Headers don't stack in the order they are encountered, but are stacked in the order they are added. This will need to be fixed.

## To Do
1. Allow sticky headers to stick and stack to any side of the screen to allow for sticky sidebars and footers.
2. Improve the way headers monitor their source element

