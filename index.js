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
var chalk = require('chalk');
var Delimiters = require('delimiters');
var arrayify = require('arrayify-compact');
var loader = require('load-templates');
var Engines = require('engine-cache');
var Helpers = require('helper-cache');
var Parsers = require('parser-cache');
var Storage = require('config-cache');
var Layouts = require('layouts');
var extend = _.extend;
var merge = _.merge;


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
}

util.inherits(Template, Storage);
extend(Template.prototype, Delimiters.prototype);


/**
 * Initialize defaults.
 *
 * @api private
 */

Template.prototype.init = function() {
  this.delims = {};
  this.defaultOptions();

  this.viewType = {};
  this.viewType.partial = [];
  this.viewType.renderable = [];
  this.viewType.layout = [];
  this.layoutSettings = {};

  this.engines = this.engines || {};
  this.parsers = this.parsers || {};

  this._ = {};
  this._.parsers = new Parsers(this.parsers);
  this._.engines = new Engines(this.engines);
  this._.helpers = new Helpers({
    bindFunctions: true,
    thisArg: this
  });
  this._.loader = loader(this.options);

  this.defaultConfig();
  this.defaultTemplates();
  this.defaultParsers();
  this.defaultEngines();
};


/**
 * Initialize default cache configuration.
 *
 * @api private
 */

Template.prototype.defaultConfig = function() {
  this.set('locals', {});
  this.set('imports', {});
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
  this.option('layoutTag', 'body');
  this.option('layoutDelims', ['{%', '%}']);
  this.option('engineDelims', null);
  this.option('layout', null);

  this.option('strictErrors', true);
  this.option('partialLayout', null);
  this.option('mergePartials', true);
  this.option('mergeFunction', merge);
  this.option('bindHelpers', true);

  // loader options
  this.option('noparse', false);
  this.option('nonormalize', false);
  this.option('rename', function (filepath) {
    return path.basename(filepath);
  });

  this.addDelims('*', ['<%', '%>']);
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
 *   - `*` The noop engine is used as a pass-through when no other engine matches.
 *   - `md` Used to process Lo-Dash templates in markdown files.
 *
 * @api private
 */

Template.prototype.defaultEngines = function() {
  this.engine('*', require('engine-noop'), {
    layoutDelims: ['{%', '%}'],
    destExt: '.html'
  });

  this.engine(['md', 'html'], require('engine-lodash'), {
    layoutDelims: ['{%', '%}'],
    destExt: '.html'
  });
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

Template.prototype.lazyLayouts = function(ext, options) {
  if (!this.layoutSettings.hasOwnProperty(ext)) {
    var opts = extend({}, this.options, options);

    this.layoutSettings[ext] = new Layouts({
      locals: opts.locals,
      layouts: opts.layouts,
      delims: opts.layoutDelims,
      tag: opts.layoutTag
    });
  }
};


/**
 * Determine the correct layout to use for the given `file`.
 *
 * @param  {Object} `file` File object to test search for `layout`.
 * @return {String} The name of the layout to use.
 */

Template.prototype.determineLayout = function (file) {
  if (file.layout) {
    return file.layout;
  }

  if (file.data && file.data.layout) {
    return file.data.layout;
  }

  if (file.locals && file.locals.layout) {
    return file.locals.layout;
  }

  return this.option('layout');
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
  var o = merge({}, options);

  if (typeof file === 'object') {
    o = merge({}, o, file);
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
 * @doc api-parse
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
 * @doc api-parseSync
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
 * @doc api-engine
 * @param {String} `ext`
 * @param {Function|Object} `fn` or `options`
 * @param {Object} `options`
 * @return {Object} `Template` to enable chaining
 * @api public
 */

Template.prototype.engine = function (extension, fn, options) {
  var args = [].slice.call(arguments);

  if (typeof extension === 'string' && args.length <= 1) {
    return this._.engines.get(extension);
  }

  arrayify(extension).forEach(function (ext) {
    this._registerEngine(ext, fn, options);
  }.bind(this));
  return this;
};


/**
 * Private method to register engines.
 *
 * @param {String} `ext`
 * @param {Function|Object} `fn` or `options`
 * @param {Object} `options`
 * @return {Object} `Template` to enable chaining
 * @api private
 */

Template.prototype._registerEngine = function (ext, fn, options) {
  var opts = _.extend({thisArg: this, bindFunctions: true}, options);
  this._.engines.register(ext, fn, opts);

  if (ext[0] !== '.') {
    ext = '.' + ext;
  }
  if (opts.delims) {
    this.option('engineDelims', this.makeDelims(opts.delims));
  }
  // Initialize layouts
  this.lazyLayouts(ext, opts);
  return this;
};


/**
 * Get the engine registered for the given `ext`. If no
 * `ext` is passed, the entire cache is returned.
 *
 * @doc api-getEngine
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
  return this._.helpers.addHelper(name, fn, thisArg);
};


/**
 * Get and set async helpers on `templates.cache.helpers.` Helpers registered
 * using this method should be generic javascript functions, since they
 * will be passed to every engine.
 *
 * @param {String} `name` The helper to cache or get.
 * @param {Function} `fn` The helper function.
 * @param {Object} `thisArg` Context to bind to the helper.
 * @return {Object} Object of helpers for the specified engine.
 * @api public
 */

Template.prototype.addHelperAsync = function (name, fn, thisArg) {
  return this._.helpers.addHelperAsync(name, fn, thisArg);
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
 * Add a new template `type`, along with associated get/set methods.
 * You must specify both the singular and plural names for the type.
 *
 * @param {String} `type` Singular name of the type to create, e.g. `page`.
 * @param {String} `plural` Plural name of the template type, e.g. `pages`.
 * @param {Object} `options` Options for the template type.
 *   @option {Boolean} [options] `renderable` Is the template a partial view?
 *   @option {Boolean} [options] `layout` Can the template be used as a layout?
 *   @option {Boolean} [options] `partial` Can the template be used as a partial?
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

  // Add a `viewType` to the cache for `plural`
  this._setType(plural, opts);

  /**
   * Singular template `type` (e.g. `page`)
   */

  Template.prototype[type] = function (key, value, locals) {
    var args = [].slice.call(arguments);
    var arity = args.length;
    var file = {}, name;

    if (arity === 1) {
      if (isFilepath(key)) {
        // if no `path` property exists, use the actual key
        if (!_.values(key)[0].hasOwnProperty('path')) {
          _.values(key)[0].path = Object.keys(key)[0];
        }
        merge(file, key);
      } else {
        if (!key.hasOwnProperty('content')) {
          key = {content: key};
        }
        if (key.hasOwnProperty('path')) {
          file[key.path] = key;
        } else {
          throw new Error('template.'+type+'() cannot find a key for:', key);
        }
      }
    } else {
      if (typeof value === 'string') {
        value = {content: value};
      }
      value.path = value.path || key;
      file[key] = value;
    }

    this._normalizeTemplates(plural, file, locals, opts);
    return this;
  };


  /**
   * Plural template `type` (e.g. `pages`)
   */

  Template.prototype[plural] = function (pattern, locals) {
    var args = [].slice.call(arguments);
    if (!args.length) {
      return this.cache[plural];
    }
    // load templates. options are passed to loader in `.init()`
    var files = this._.loader.load(pattern, locals, opts);
    this._normalizeTemplates(plural, files, locals, opts);
    return this;
  };

  // Create helpers to handle each template type we create.
  if (!this._.helpers.hasOwnProperty(type)) {
    this.addHelperAsync(type, function (name, locals, next) {
      var last = _.last(arguments);
      if (typeof locals === 'function') {
        next = locals;
        locals = {};
      }
      if (typeof next !== 'function') {
        next = last;
      }

      var partial = this.cache[plural][name];
      if (!partial) {
        console.log(new Error(chalk.red('helper {{' + type + ' "' + name + '"}} not found.')));
        return next(null, '');
      }
      partial.locals = merge(partial.locals || {}, locals);
      this.render(partial, {}, function (err, content) {
        if (err) return next(err);
        return next(null, content);
      });
    }.bind(this));
  }

  return this;
};


/**
 * Normalize and extend custom view types onto the cache.
 *
 * @param {String} `plural` Object to extend
 * @param {Object} `files` File objects to normalize
 * @param {Object} `locals` Local data to extend onto the `file.data` property.
 * @param {Object} `options` Options to pass to
 * @api private
 */

Template.prototype._normalizeTemplates = function (plural, files, locals, options) {
  var opts = extend({}, options);

  _.forOwn(files, function (file, key) {
    var ext = path.extname(file.path);
    if (!ext) {
      ext = opts.ext;
    }

    var fileProps = ['data', 'content', 'orig', 'path'];

    // Separate the `root` properties from the `data`
    var root = _.pick(file, fileProps);
    root.data = merge({}, _.omit(file, fileProps), locals, root.data);
    root.locals = locals || {};
    var stack = this.getParsers(ext);
    var value = this.parseSync(root, stack, root.data);

    this.cache[plural][key] = value;

    if (opts.layout) {
      if (ext[0] !== '.') {
        ext = '.' + ext;
      }
      this.layoutSettings[ext].setLayout(this.cache[plural]);
    }
  }.bind(this));
};


/**
 * Get partials from the cache. If `options.mergePartials` is `true`,
 * this object will keep custom partial types seperate - otherwise,
 * all templates with the type `partials` will be merged onto the
 * same object. This is useful when necessary for the engine being
 * used.
 *
 * @api private
 */

Template.prototype._mergePartials = function (options, shouldMerge) {
  shouldMerge = shouldMerge || this.option('mergePartials');
  var opts = extend({partials: {}}, options);

  this.cache.partials  = extend({}, this.cache.partials, opts.partials);

  this.viewType.partial.forEach(function (type) {
    var partials = merge({}, this.cache[type]);
    _.forOwn(partials, function (value, key) {
      if (shouldMerge) {
        opts.partials[key] = value.content;
      } else {
        opts[type][key] = value.content;
      }
      opts = merge({}, opts, value.data, value.locals);
    });
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

  // If `file` is a string, try find a cached template with that name.
  if (typeof file === 'string') {
    var str = file;
    file = this.lookupTemplate(file);

    // if it's not cached, since it's a string assume it should be
    // rendered and cache it.
    if (!file) {
      var id = _.uniqueId('__temp__') +'.html';
      this.page(id, {content: str}, options);
      file = this.lookupTemplate(id);
    }
  }

  // Ensure the correct properties are on the `file` object.
  this.assertProperties(file);

  var opts = this.buildContext(file, options);

  // Get file extension
  var ext = opts.ext || path.extname(file.path) || '*';
  if (ext[0] !== '.') {
    ext = '.' + ext;
  }

  // Get the layout engine for `ext`
  var layoutEngine = this.layoutSettings[ext];

  // Clone the content
  var content = file.content;

  // If a layout engine is defined, run it and update the content.
  if (!!layoutEngine) {
    var layout = this.determineLayout(file);
    var obj = layoutEngine.render(file.content, layout);
    content = obj.content;
  }

  // Extend generic helpers into engine-specific helpers.
  opts.helpers = merge({}, this._.helpers, opts.helpers);
  opts = this._mergePartials(opts);

  // If the current engine has custom delims, pass them to the engine
  var delims = this.getDelims(ext) || this.option('engineDelims');
  this.useDelims(ext);
  if (delims) {
    opts = extend({}, opts, delims);
  }

  // Get the template engine for `ext`
  var engine = this.getEngine(ext);
  if (opts.engine) {
    if (opts.engine[0] !== '.') {
      opts.engine = '.' + opts.engine;
    }
    engine = this.getEngine(opts.engine);
  }

  try {
    engine.render(content, opts, function (err, content) {
      if (this.option('pretty')) {
        content = this.prettify(content, this.options);
      }
      return this._.helpers.resolve(content, cb.bind(this));
    }.bind(this));
  } catch (err) {
    cb(err);
  }
};


/**
 * Lookup a cached template.
 *
 * @param  {String} `key` Name of the template.
 * @param  {String} `type` Template type. Valid values are `renderable`|`partial`|`layout`.
 * @return  {Object} Cached template object.
 * @api private
 */

Template.prototype.lookupTemplate = function(key, type) {
  if (!type) type = 'renderable';

  return _.map(this.viewType[type], function(plural) {
    return _.find(this.cache[plural], {path: key});
  }.bind(this))[0] || null;
};


/**
 * Build up the context with the given objects. To change how
 * context is merged, use `options.contextFn`.
 *
 * @param  {Object} `file` Normalized file object.
 * @param  {Object} `methodLocals` Locals defined on the `render` method.
 * @return  {Object} Merged context object.
 * @api private
 */

Template.prototype.buildContext = function(file, methodLocals) {
  if (this.option('contextFn')) {
    return this.option('contextFn').call(this, file, methodLocals);
  }

  var fileRoot = _.omit(file, ['data', 'orig', 'locals']);
  var res = merge({}, this.cache.data, methodLocals, fileRoot, file.data, file.locals);
  // console.log(res);
  return res;
};


/**
 * Throw an error if `file` does not have `keys`.
 *
 * @param  {String} `file` The object to test.
 * @api public
 */

Template.prototype.assertProperties = function(file) {

  if (typeof file === 'object' && !file.hasOwnProperty('content')) {
    throw new Error('render() expects "' + file + '" to be an object.');
  }

  // var props = ['content', 'path'];

  // if (keys) {
  //   props = props.concat(keys);
  // }

  // if (typeof file === 'object') {
  //   props.forEach(function (prop) {
  //     if (!file.hasOwnProperty(prop)) {
  //       throw new Error('render() expects "' + file + '" to have a `' + prop + '` property.');
  //     }
  //   });
  // } else {
  //   throw new Error('render() expects "' + file + '" to be an object.');
  // }
};


/**
 * Format HTML using [js-beautify].
 *
 * @param  {String} `html` The HTML to beautify.
 * @param  {Object} `options` Options to pass to [js-beautify].
 * @return {String} Formatted string of HTML.
 */

Template.prototype.prettify = function(html, options) {
  return prettify(html, _.extend({
    indent_handlebars: true,
    indent_inner_html: true,
    preserve_newlines: false,
    max_preserve_newlines: 1,
    brace_style: 'expand',
    indent_char: ' ',
    indent_size: 2,
  }, options));
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
 */

module.exports = Template;

