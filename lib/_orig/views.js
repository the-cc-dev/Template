'use strict';

var path = require('path');
var assign = require('assign-deep');
var extend = require('extend-shallow');
var Collection = require('./collection');
var utils = require('./utils');
var View = require('./view');

/**
 * Create an instance of `Views`.
 *
 * @api public
 */

function Views() {
  Collection.apply(this, arguments);
  utils.defineProp(this, 'data', {});
}

Collection.extend(Views);

/**
 * Views prototype methods
 */

utils.delegate(Views.prototype, {

  /**
   * Set an item on the collection.
   */

  set: function (key, val) {
    this[this.renameKey(key)] = new View(val, this, this.app);
    return this;
  },

  /**
   * Get a view.
   */

  get: function(prop, fn) {
    var name, res;
    if (arguments.length === 0) {
      res = {};
      for (var key in this) {
        res[key] = this[key];
      }
      return res;
    }

    // use renameKey function passed on args
    if (typeof fn === 'function') {
      prop = fn(prop);
    }

    if (!!(name = this[prop])) {
      return name;
    }

    // try again with the `renameKey` function
    name = this.renameKey(prop);

    if (name && name !== prop && !!(res = this[name])) {
      res.__proto__ = this;
      return res;
    }

    res = get(this, prop);
    if (!res) {
      res = this.find(prop);
    }

    res.__proto__ = this;
    return res;
  },

  /**
   * Find a view by `key` or glob pattern.
   *
   * @param  {String} `pattern` Key or glob pattern.
   * @param  {Object} `options` Options for [micromatch]
   * @return {Object} Matching view.
   */

  find: function (pattern, options) {
    function find() {
      var isMatch = mm.matcher(pattern, options);
      for (var key in this) {
        var val = this[key];
        if (typeof val === 'object' && isMatch(key)) {
          return val;
        }
      }
    }
    var res = this.cache(pattern, find);
    res.__proto__ = this;
    return res;
  },

  /**
   * Compile a view in the collection.
   *
   * @param  {String|Object} `view` View key or object.
   * @param  {Object} `locals`
   * @param  {Function} `fn`
   * @return {Function}
   */

  compile: function (view/*, locals*/) {
    var args = [].slice.call(arguments, 1);
    var app = this.app;
    if (typeof view === 'string') view = this[view];
    app.compile.apply(app, [view].concat(args));
    return this;
  },

  /**
   * Render a view in the collection.
   *
   * @param  {String|Object} `view` View key or object.
   * @param  {Object} `locals`
   * @param  {Function} `fn`
   * @return {Object}
   */

  render: function (view/*, locals, fn*/) {
    var args = [].slice.call(arguments, 1);
    var app = this.app;
    if (typeof view === 'string') view = this[view];
    app.render.apply(app, [view].concat(args));
    return this;
  },

  /**
   * Generate list pages based on the number of views in the collection.
   * This method should be called pre-render.
   *
   * @param  {View} `view` The view use for the view pages.
   * @param  {Object} `locals` Optional locals to use in rendering.
   * @param  {Object} `options` Additional options to use.
   * @param  {Function} `cb` Callback function that returns either an error (`err`) or a collection of view pages (`views`)
   */

  paginate: function (view, options, cb) {
    if (typeof options === 'function') {
      cb = options;
      options = {};
    }

    // temporary
    if (typeof view === 'function') {
      cb = view;
      this.app.create('list');
      this.app.list('list.hbs', {
        content: 'BEFORE\n{{#each pagination.items}}{{locals.title}}\n{{/each}}\nAFTER',
        locals: {
          limit: 2,
          permalinks: {
            structure: ':collection/:num.html'
          }
        }
      });
      view = this.app.list.get('list.hbs');
      return this.paginate(view, {}, cb);
    }

    var opts = options || {};
    var items = this.items();
    var keys = Object.keys(items);

    var len = keys.length, i = 0, pageNum = 1;
    // var total = Math.ceil(len / opts.limit);
    var pages = [];

    var page = new View(view.clone(), view.collection, view.app);
    page.options = extend({}, page.options, opts);
    page.data = page.data || {};
    page.data.pagination = {};
    page.data.pagination.items = [];

    while (len--) {
      var item = items[keys[i++]];
      page.data.pagination.items.push(item);
      if (i % opts.limit === 0) {
        page.data.pagination.collection = this.options.collection;
        page.data.pagination.num = pageNum++;
        page.data.pagination.index = page.data.pagination.num;
        page.data.pagination.limit = opts.limit;
        pages.push(page);

        page = new View(view.clone(), view.collection, view.app);
        page.options = extend({}, page.options, opts);
        page.data = page.data || {};
        page.data.pagination = {};
        page.data.pagination.items = [];
      }
    }

    if (i % opts.limit !== 0) {
      page.data.pagination.collection = this.options.collection;
      page.data.pagination.num = pageNum++;
      page.data.pagination.index = page.data.pagination.num;
      page.data.pagination.limit = opts.limit;
      pages.push(page);
    }

    cb(null, pages);

    this.stash = items;
    this.value();
    return this;
  },

  /**
   * Filter views by the given `prop`, using the specified `pattern` and `options.
   *
   * @param  {String} `prop` The property to sort by.
   * @param  {String|Object|Array|Function} `pattern` Function, glob patterns, object, array, or string pattern to use for pre-filtering views.
   * @param  {Object} `options`
   * @option  {Object} `limit` [options]
   * @option  {Object} `limit` [options]
   * @return {Object}
   */

  filter: function (prop, pattern, options) {
    options = options || {};
    var views = this.items;
    var res = Object.create(this);

    var matcher = pattern ? utils.isMatch(pattern, options) : null;

    for (var key in views) {
       if (views.hasOwnProperty(key)) {
        var file = views[key];
        if (prop === 'key') {
          if (matcher) {
            if (matcher(path.relative(process.cwd(), key))) {
              res[key] = file;
            }
          } else {
            res[key] = file;
          }
        } else {
          var val = utils.get(file, prop);
          if (prop === 'path' || prop === 'cwd') {
            val = path.relative(process.cwd(), val);
          }
          if (utils.hasValues(val)) {
            if (matcher) {
              if (matcher(val)) {
                res[key] = file;
              }
            } else {
              res[key] = file;
            }
          }
        }
      }
    }
    return res;
  },

  /**
   * Set view types for the collection.
   *
   * @param {String} `plural` e.g. `pages`
   * @param {Object} `options`
   * @api private
   */

  viewType: function() {
    this.options.viewType = utils.arrayify(this.options.viewType || []);
    if (this.options.viewType.length === 0) {
      this.options.viewType.push('renderable');
    }
    return this.options.viewType;
  }
});

/**
 * Expose `Views`
 */

module.exports = Views;