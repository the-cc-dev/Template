/*!
 * engine <https://github.com/jonschlinkert/engine>
 *
 * Copyright (c) 2014 Jon Schlinkert, contributors
 * Licensed under the MIT License (MIT)
 */

'use strict';

var should = require('should');
var Engine = require('..');
var template;

describe('engine create:', function () {
  beforeEach(function () {
    template = new Engine();
  });


  describe('.create():', function () {
    it('should create a new template `type`:', function () {
      template.create('include', 'includes');
      template.should.have.properties('include', 'includes');
    });
  });

  describe('when a new template type is created:', function () {
    it('should add methods to the cache for that type:', function () {
      template.create('apple', 'apples');
      template.should.have.properties('apple', 'apples');
    });

    it('should add templates to the cache for a given template type:', function () {
      template.create('apple', 'apples');

      template.apple('a', 'one');
      template.apple('b', 'two');
      template.apple('c', 'three');

      template.cache.should.have.property('apples');
      template.cache.apples.should.have.properties('a', 'b', 'c');
    });

    describe('.decorate()', function () {
      /* setup */
      beforeEach(function () {
        template = new Engine();

        // create some custom template types
        template.create('block', 'blocks', { isLayout: true });
        template.create('include', 'includes', { isPartial: true });
        template.create('post', 'posts', { isRenderable: true });
        template.create('doc', 'docs', { isRenderable: true });

        // intentionally create dupes using different renderable types
        template.page('aaa.md', '<%= name %>', {name: 'Jon Schlinkert'});
        template.post('aaa.md', '<%= name %>', {name: 'Brian Woodward'});
        template.docs('aaa.md', '<%= name %>', {name: 'Halle Nicole'});

        template.include('sidebar.md', '<nav>sidebar</nav>');
        template.block('default.md', 'abc {% body %} xyz');
      });

      it('should decorate the type with a `get` method:', function () {
        template.should.have.properties(['getPage', 'getPost', 'getDoc', 'getInclude']);
      });

      it.skip('should decorate the type with a `set` method:', function () {
        template.should.have.properties(['setPage', 'setPost', 'setDoc', 'setInclude']);
      });

      it('should decorate the type with a `render` method:', function () {
        template.should.have.properties(['renderPage', 'renderPost', 'renderDoc']);
      });
    });
  });

  describe('when the `isRenderable` flag is set on the options:', function () {
    it('should push the name of the type into the `isRenderable` array:', function () {
      template.create('apple', 'apples', { isRenderable: true });

      template.templateType.renderable.should.containEql('pages');
      template.templateType.renderable.should.containEql('apples');
      template.templateType.renderable.should.containEql('apples');
    });
  });

  describe('when the `isLayout` flag is set on the options:', function () {
    it('should push the name of the type into the `isLayout` array:', function () {
      template.create('orange', 'oranges', { isLayout: true });

      template.templateType.layout.should.containEql('layouts');
      template.templateType.layout.should.containEql('oranges');
    });
  });

  describe('when no type flag is set on the options:', function () {
    it('should push the name of the type into the `isPartial` array:', function () {
      template.create('banana', 'bananas');

      template.templateType.partial.should.containEql('partials');
      template.templateType.partial.should.containEql('bananas');
    });
  });

  describe('when the `isPartial` flag is set on the options:', function () {
    it('should push the name of the type into the `isPartial` array:', function () {
      template.create('banana', 'bananas', { isPartial: true });

      template.templateType.partial.should.containEql('partials');
      template.templateType.partial.should.containEql('bananas');
    });
  });

  describe('when both the `isPartial` and the `isLayout` flags are set:', function () {
    it('should push the type into both arrays:', function () {
      template.create('banana', 'bananas', { isPartial: true, isLayout: true });

      template.templateType.partial.should.containEql('bananas');
      template.templateType.layout.should.containEql('bananas');
    });
  });

  describe('when both the `isPartial` and the `isRenderable` flags are set:', function () {
    it('should push the type into both arrays:', function () {
      template.create('banana', 'bananas', { isPartial: true, isRenderable: true });

      template.templateType.partial.should.containEql('bananas');
      template.templateType.renderable.should.containEql('bananas');
    });
  });

  describe('when both the `isLayout` and the `isRenderable` flags are set:', function () {
    it('should push the type into both arrays:', function () {
      template.create('banana', 'bananas', { isLayout: true, isRenderable: true });

      template.templateType.layout.should.containEql('bananas');
      template.templateType.renderable.should.containEql('bananas');
    });
  });

  describe('when all three types flags are set:', function () {
    it('should push the type into all three arrays:', function () {
      template.create('banana', 'bananas', { isPartial: true, isLayout: true, isRenderable: true });

      template.templateType.layout.should.containEql('bananas');
      template.templateType.partial.should.containEql('bananas');
      template.templateType.renderable.should.containEql('bananas');
    });
  });
});
