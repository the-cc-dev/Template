/*!
 * engine <https://github.com/jonschlinkert/engine>
 *
 * Copyright (c) 2014 Jon Schlinkert, contributors
 * Licensed under the MIT License (MIT)
 */

'use strict';

var fs = require('fs');
var path = require('path');
var should = require('should');
var Engine = require('..');
var template = new Engine();


describe('engine delimiters:', function () {
  it('should use custom delimiters defined on the engine:', function (done) {
    template.engine('*', require('engine-lodash'), {
      delims: ['<<', '>>']
    });

    template.page('foo', {content: '<<= name >>', name: 'Jon Schlinkert'});
    template.page('bar', {content: '<<= name >>', name: 'Brian Woodward'});

    template.render('foo', function (err, content) {
      if (err) console.log(err);
      content.should.equal('Jon Schlinkert');
    });

    template.render('bar', function (err, content) {
      if (err) console.log(err);
      content.should.equal('Brian Woodward');
    });
    done();
  });
});
