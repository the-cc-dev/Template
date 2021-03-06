
## templates

There are a few default template types, but you can create as many as you want.

**Built-in types**

- `page`: think of pages as being "renderable"
- `partial`: think of partials as includes, or partial views
- `layout`: think of layouts as wrappers for other templates

Okay, remember way back when I said these are "types"? Well, technically they're "subtypes". Don't worry, it's simple.

### template types

Although any template can be rendered or be used as layouts or partials, you get better convenience methods by assigning `types` to them.

**What's are template types / subtypes?**

For example, let's say we want to create a special kind of template for generating docs.

  1. Let's make it `renderable` (this is our `type`), and
  1. It makes sense that we would describe each template as a `doc` and
    several of them as `docs` (this is our `subtype`). We'll make use of this knowledge in a moment.

Here's how we would create this new template type:

```js
// the second arg, `docs` is optional, use it if the plural is something wierd
template.create('doc', 'docs', { isRenderable: true });
```

### Subtype methods

> Great. What happens when a subtype is created?

**Magical things**

Two methods are created specifically for your new template subtype: `render` and `get`. Methods names are created from the name of your template, plus the method name.

For example, say you create a new template subtype, `post`, the following methods will be created:

- `.renderPost()`: This async method takes the same parameters as render accept that the first parameter is the `name` of the post to render, and template lookups are faster since the method will look specifically for a `post` on the cache, rather than looking across all `renderable` subtypes.
- `.getPost()`: Method for getting a `post` by name from the cache.

**Examples**

```js
var home = template.getPost('home.md');
//=> {data: {}, locals: {}, content: 'This is the home page!', ...}
```
And for rendering:

```js
template.renderPost('foo.md', function(err, content) {
  // do stuff with err and content.
});
```


We would store them on a `docs` the name `doc` for our template





 To make sense of this, the build in `types` are:

 - `renderable`


Add some templates:

```js
template.layout('default', 'abc {%% body %} xyz');
template.partial('sidebar', '<nav>foo</nav>');
template.page('home', 'Welcome! <%= partial("sidebar") %>', {layout: 'default'});
```

## engines

Define a [consolidate](https://github.com/tj/consolidate.js)-compatible template engine:

```js
template.engine('hbs', require('engine-handlebars'));
template.engine('md', require('engine-lodash'));
```

## Custom template types

Subtypes belong to one of the three **types**: `renderable`, `layout` or `partial`.

```js
// `post` is now subtype of `renderable`
template.create('post', { isRenderable: true });

// We can now add `posts` using the `.post()` or `.posts()` method
template.post('home.md', { content: 'Innovate faster than you ever could have imagined!' });
template.post('about.md', { content: 'Create originally as a framework to...' });
```

## Engines

Render templates with any any engine.




## API



## Libraries used

* [engine-cache]
* [engine-noop]
* [parse-files]
* [parser-cache]
* [parser-front-matter]
* [parser-noop]
