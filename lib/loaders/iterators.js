'use strict';

var async = require('async');
var utils = require('../utils/fn');

module.exports = function (app) {
  app.iterator('promise', require('iterator-promise'));
  app.iterator('stream', require('iterator-streams'));
  app.iterator('async', require('iterator-async'));

  // app.iterator('async', function (stack) {
  //   var fn = stack.shift();

  //   return function () {
  //     var args = [].slice.call(arguments);
  //     var done = args.pop();
  //     var init = fn.apply(fn, args);

  //     async.eachSeries(stack, function () {
  //       // console.log(arguments)
  //     }, done);
  //   }
  // });

  app.iterator('sync', function sync(stack) {
    stack = stack.filter(Boolean);

    if (stack.length === 0) {
      return utils.identity;
    }

    return function () {
      var args = [].slice.call(arguments);

      var init = stack[0].apply(app, args);
      if (stack.length === 1) return init;

      return stack.slice(1).reduce(function (val, fn) {
        return fn.call(app, val);
      }.bind(app), init);
    }.bind(app);
  });
};