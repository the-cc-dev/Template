/*!
 * view-cache <https://github.com/jonschlinkert/view-cache>
 *
 * Copyright (c) 2014 Jon Schlinkert, contributors.
 * Licensed under the MIT license.
 */

'use strict';

var _ = require('lodash');
var util = require('util');
var path = require('path');
var Delimiters = require('delimiters');
var Engines = require('engine-cache');
var Parsers = require('parser-cache');
var Storage = require('config-cache');
var Layouts = require('layouts');
var extend = _.extend;


/**
 * Create a new instance of `Template`, optionally passing the default
 * `context` and `options` to use.
 *
 * **Example:**
 *
 * ```js
 * var Template = require('template');
 * var template = new Template();
 * ```
 *
 * @class `Template`
 * @param {Object} `context` Context object to start with.
 * @param {Object} `options` Options to use.
 * @api public
 */

function Template(options) {
  Delimiters.call(this, options);
  Storage.call(this, options);

  this.init();

  this.defaultConfig();
  this.defaultOptions();
  this.defaultParsers();
  this.defaultEngines();
  this.defaultHelpers();
  this.defaultTemplates();
}

util.inherits(Template, Storage);
extend(Template.prototype, Delimiters.prototype);


/**
 * Initialize default cache configuration.
 *
 * @api private
 */

Template.prototype.init = function() {
  this.engines = this.engines || {};
  this.parsers = this.parsers || {};
  this.delims = {};

  this.viewType = {};
  this.viewType.partial = [];
  this.viewType.renderable = [];
  this.viewType.layout = [];

  this._ = {};

  this._.helpers = this.helpers || {};
  this._.parsers = new Parsers(this.parsers);
  this._.engines = new Engines(this.engines);
};


/**
 * Initialize default cache configuration.
 *
 * @api private
 */

Template.prototype.defaultConfig = function() {
  this.set('locals', {});
  this.set('imports', {});
  this.set('helpers', {});
  this.set('layouts', {});
  this.set('partials', {});
  this.set('pages', {});
};


/**
 * Initialize default options.
 *
 * @api private
 */

Template.prototype.defaultOptions = function() {
  this.option('cwd', process.cwd());
  this.option('ext', '*');

  this.option('delims', {});
  this.option('layout', null);
  this.option('layoutTag', 'body');
  this.option('layoutDelims', ['{{', '}}']);

  this.option('partialLayout', null);
  this.option('mergePartials', true);
  this.option('bindHelpers', true);

  this.addDelims('*', ['<%', '%>']);
  this.addDelims('es6', ['${', '}'], {
    interpolate: /\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g
  });
};


/**
 * Load default parsers
 *
 * @api private
 */

Template.prototype.defaultParsers = function() {
  this.parser('md', require('parser-front-matter'));
  this.parser('*', require('parser-noop'));
};


/**
 * Load default engines.
 *
 * @api private
 */

Template.prototype.defaultEngines = function() {
  this.engine('md', require('engine-lodash'));
  this.engine('*', require('engine-noop'));
};


/**
 * Load default helpers.
 *
 * @api private
 */

Template.prototype.defaultHelpers = function() {
  if (!this.helpers.hasOwnProperty('partial')) {
    this.addHelper('partial', function (name, locals) {
      var partial = this.cache.partials[name];
      var ctx = _.extend({}, partial.data, locals);
      return _.template(partial.content, ctx);
    });
  }
};


/**
 * Register default template types.
 *
 * @api private
 */

Template.prototype.defaultTemplates = function() {
  this.create('page', 'pages', {renderable: true});
  this.create('layout', 'layouts', {layout: true});
  this.create('partial', 'partials');
};


/**
 * Lazily add a `Layout` instance if it has not yet been added.
 * Also normalizes settings to pass to the `layouts` library.
 *
 * We can't instantiate `Layout` in the defaultConfig because
 * it reads settings which might not be set until after init.
 *
 * @api private
 */

Template.prototype.lazyLayouts = function(options) {
  if (!this._layouts) {
    var opts = _.extend({}, this.options, options);

    this._layouts = new Layouts({
      locals: opts.locals,
      layouts: opts.layouts,
      delims: opts.layoutDelims,
      tag: opts.layoutTag
    });
  }
};


/**
 * Register the given parser callback `fn` as `ext`. If `ext`
 * is not given, the parser `fn` will be pushed into the
 * default parser stack.
 *
 * {%= docs("api-parser") %}
 *
 * @param {String} `ext`
 * @param {Function|Object} `fn` or `options`
 * @param {Function} `fn` Callback function.
 * @return {Object} `Template` to enable chaining.
 * @api public
 */

Template.prototype.parser = function (ext, options, fn) {
  this._.parsers.register.apply(this, arguments);
  return this;
};


/**
 * Private method for normalizing args passed to parsers.
 *
 * @param  {Object|String} `file` Either a string or an object.
 * @param  {Array} `stack` Optionally pass an array of functions to use as parsers.
 * @param  {Object} `options`
 * @return {Object} Normalize `file` object.
 * @api private
 */

Template.prototype._parse = function (method, file, stack, options) {
  var o = _.merge({}, options);

  if (typeof file === 'object') {
    o = _.merge({}, o, file);
  }

  var ext = o.ext;

  if (!Array.isArray(stack)) {
    options = stack;
    stack = null;
  }

  if (ext) {
    stack = this.getParsers(ext);
  }

  if (!stack) {
    stack = this.getParsers('*');
  }
  return this._.parsers[method](file, stack, options);
};


/**
 * Run a `file` through the given `stack` of parsers. If `file` is
 * an object with a `path` property, then the `extname` is used to
 * get the parser stack. If a stack isn't found on the cache the
 * default `noop` parser will be used.
 *
 * {%= docs("api-parse") %}
 *
 * @param  {Object|String} `file` Either a string or an object.
 * @param  {Array} `stack` Optionally pass an array of functions to use as parsers.
 * @param  {Object} `options`
 * @return {Object} Normalize `file` object.
 * @api public
 */

Template.prototype.parse = function (file, stack, options) {
  return this._parse('parse', file, stack, options);
};


/**
 * Run a `file` through the given `stack` of parsers; like `.parse()`,
 * but synchronous. If `file` is an object with a `path` property,
 * then the `extname` is used to get the parser stack. If a stack isn't
 * found on the cache the default `noop` parser will be used.
 *
 * {%= docs("api-parseSync") %}
 *
 * @param  {Object|String} `file` Either a string or an object.
 * @param  {Array} `stack` Optionally pass an array of functions to use as parsers.
 * @param  {Object} `options`
 * @return {Object} Normalize `file` object.
 * @api public
 */

Template.prototype.parseSync = function (file, stack, options) {
  return this._parse('parseSync', file, stack, options);
};


/**
 * Get a cached parser stack for the given `ext`.
 *
 * @param {String} `ext` The parser stack to get.
 * @return {Object} `Template` to enable chaining.
 * @api public
 */

Template.prototype.getParsers = function (ext) {
  return this._.parsers.get.apply(this, arguments);
};


/**
 * Register the given view engine callback `fn` as `ext`. If only `ext`
 * is passed, the engine registered for `ext` is returned. If no `ext`
 * is passed, the entire cache is returned.
 *
 * {%= docs("api-engine") %}
 *
 * @param {String} `ext`
 * @param {Function|Object} `fn` or `options`
 * @param {Object} `options`
 * @return {Object} `Template` to enable chaining
 * @api public
 */

Template.prototype.engine = function (ext, options, fn) {
  var args = [].slice.call(arguments);

  if (args.length <= 1) {
    return this._.engines.get(ext);
  }

  this._.engines.register(ext, options, fn);
  return this;
};


/**
 * Get the engine registered for the given `ext`. If no
 * `ext` is passed, the entire cache is returned.
 *
 * {%= docs("api-getEngine") %}
 *
 * @param {String} `ext` The engine to get.
 * @return {Object} Object of methods for the specified engine.
 * @api public
 */
Template.prototype.getEngine = function (ext) {
  return this._.engines.get(ext);
};


/**
 * Get and set helpers for the given `ext` (engine). If no
 * `ext` is passed, the entire helper cache is returned.
 *
 * @param {String} `ext` The helper cache to get and set to.
 * @return {Object} Object of helpers for the specified engine.
 * @api public
 */

Template.prototype.helpers = function (ext) {
  return this.getEngine(ext).helpers;
};


/**
 * Get and set helpers on `templates.cache.helpers.` Helpers registered
 * using this method should be generic javascript functions, since they
 * will be passed to every engine.
 *
 * @param {String} `name` The helper to cache or get.
 * @param {Function} `fn` The helper function.
 * @param {Object} `thisArg` Context to bind to the helper.
 * @return {Object} Object of helpers for the specified engine.
 * @api public
 */

Template.prototype.addHelper = function (name, fn, thisArg) {
  this.cache.helpers[name] = _.bind(fn, thisArg || this);
};


/**
 * Add a new template `type`, along with associated get/set methods.
 * You must specify both the singular and plural names for the type.
 *
 * @param {String} `type` Singular name of the type to create, e.g. `page`.
 * @param {String} `plural` Plural name of the template type, e.g. `pages`.
 * @param {Object} `options` Options for the template type.
 *   @option {Boolean} [options] `renderable` Is the template a partial view?
 *   @option {Boolean} [options] `layout` Can the template be used as a layout?
 * @return {Object} `Template` to enable chaining.
 * @api public
 */

Template.prototype.create = function(type, plural, options) {
  if (typeof plural !== 'string') {
    throw new Error('A plural form must be defined for: "' + type + '".');
  }

  var opts = extend({ext: this.options.ext}, options);
  if (!this.cache[plural]) {
    this.set(plural, {});
  }

  // Add `viewType` arrays to the cache
  this._setType(plural, opts);

  // Singular template `type` (e.g. `page`)
  Template.prototype[type] = function (key, value, locals) {
    var args = [].slice.call(arguments);
    var arity = args.length;
    var obj = {}, name;

    if (arity === 1) {
      if (isFilepath(key)) {
        // if no `path` property exists, use the actual key
        if (!_.values(key)[0].hasOwnProperty('path')) {
          _.values(key)[0].path = Object.keys(key)[0];
        }
        _.merge(obj, key);
      } else {
        if (!key.hasOwnProperty('content')) {
          key = {content: key};
        }
        if (key.hasOwnProperty('path')) {
          obj[key.path] = key;
        } else {
          throw new Error('template.'+type+'() cannot find a key for:', key);
        }
      }
    } else {
      if (typeof value === 'string') {
        value = {content: value};
      }
      value.path = value.path || key;
      obj[key] = value;
    }

    _.forIn(obj, function (file, key) {
      var ext = path.extname(file.path);
      if (!ext) {
        ext = opts.ext;
      }

      var fileProps = ['data', 'content', 'orig', 'path'];

      // Separate the `root` properties from the `data`
      var root = _.pick(file, fileProps);
      root.data = _.merge({}, _.omit(file, fileProps), locals, root.data);
      var stack = this.getParsers(ext);

      this.cache[plural][key] = this.parseSync(root, stack, root.data);

      if (opts.layout) {
        // register with Layouts
      }
    }.bind(this));

    return this;
  };

  // Plural template `type` (e.g. `pages`)
  Template.prototype[plural] = function (key, value, locals) {
    if (!arguments.length) {
      return this.cache[plural];
    }

    // this.cache[plural]
    return this;
  };

  // Create helpers to handle each template type we create.
  if (!this.helpers.hasOwnProperty(type)) {
    this.addHelper(type, function (name, locals) {
      var partial = this.cache[plural][name];
      var ctx = _.merge({}, partial.data, locals);
      return _.template(partial.content, ctx);
    });
  }

  return this;
};


/**
 * Keeps track of custom view types, so we can pass them properly to
 * registered engines.
 *
 * @param {String} `plural`
 * @param {Object} `opts`
 * @api private
 */

Template.prototype._setType = function (plural, opts) {
  if (opts.renderable) {
    this.viewType.renderable.push(plural);
  } else if (opts.layout) {
    this.viewType.layout.push(plural);
  } else {
    this.viewType.partial.push(plural);
  }
};


/**
 * Get partials from the cache. If `options.mergePartials` is `true`,
 * this object will include custom partial types.
 *
 * @api private
 */

Template.prototype._mergePartials = function (options) {
  var opts = _.extend({}, options);

  if (!opts.partials) {
    opts.partials = {};
  }

  _.forEach(this.viewType.partial, function (type) {
    if (this.option('mergePartials')) {
      var partials = _.merge({}, opts.partials, this.cache[type]);
      _.forIn(partials, function (value, key) {
        opts.partials[key] = value.content;
        opts.locals = _.merge({}, opts.locals, value.data);
      });
    } else {
      opts[type] = _.merge({}, opts[type], this.cache[type]);
      _.forIn(opts[type], function (value, key) {
        opts[type][key] = value.content;
        opts.locals = _.merge({}, opts.locals, value.data);
      });
    }
  }.bind(this));
  return opts;
};


/**
 * Render `str` with the given `options` and `callback`.
 *
 * @param  {Object} `options` Options to pass to registered view engines.
 * @return {String}
 * @api public
 */

Template.prototype.render = function (file, options, cb) {
  if (typeof options === 'function') {
    cb = options;
    options = {};
  }

  if (typeof file !== 'object' || file && !file.hasOwnProperty('content')) {
    throw new Error('render() expects "' + file + '" to be an object.');
  }

  var o = _.omit(file, ['data', 'orig']);
  var opts = _.merge({}, options, o, file.data);

  var ext = opts.ext || path.extname(file.path) || '*';
  var engine = this.getEngine(ext);

  // Extend engine-specific helpers with generic helpers.
  opts.helpers = _.merge({}, this.cache.helpers, opts.helpers);
  opts = this._mergePartials(opts);

  try {
    engine.render(file.content, opts, cb);
  } catch (err) {
    cb(err);
  }
};


/**
 * Returns `true` if an object's key might be a filepath.
 *
 * @api private
 */

function isFilepath(key) {
  return _.keys(key).length === 1 &&
    typeof key === 'object';
}


/**
 * Expose `Template`
 *
 * @type {Class}
 */

module.exports = Template;

