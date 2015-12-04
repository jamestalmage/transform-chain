# transform-chain [![Build Status](https://travis-ci.org/jamestalmage/transform-chain.svg?branch=master)](https://travis-ci.org/jamestalmage/transform-chain)

> Build a chain of transforms

Provides a means of managing a list of transforms. 
Built with `require.extensions` transforms in mind, but not limited to that use case.

## Install

    $ npm install --save transform-chain

## Usage

```js
import TransformChain from 'transform-chain';
const chain = new TransformChain();

chain.appendTransform((code, filename, next) => {
  // true if downstream transforms want to manipulate this file too.
  next.hasMatch(filename); 

  // transform the code - no additional transforms applied
  return doTransform(code);
  
  // transform the code and forward it down the chain
  return next(doTransform(code), filename);
  
  // forward down the chain, and perform the transform after
  return doTransform(next(code, filename));
});
```

## API

### TransformChain

Creates a new transform chain.

#### appendTransform

Appends a transform to the end of the chain.

**Parameters**

-   `transform` **Transform or TransformDefinition** the transform to append.

#### hasMatch

Check if the chain has a matching transform for a particular file.

**Parameters**

-   `filename` **string** the path to the file.

Returns **boolean** true if at least one transform in the chain matches the file.

#### notifyPostLoadHooks

Notify every transform that a file has been loaded. Included for legacy istanbul support.

**Parameters**

-   `filename` **string** Passed to every transforms `postLoadHook` (regardless of whether the transform matches the loaded file).

#### prependTransform

Prepends a transform at the beginning of the chain.

**Parameters**

-   `transform` **Transform or TransformDefinition** the transform to prepend.

#### transform

Transform an input using the matching transforms from the chain.

**Parameters**

-   `code` **Any** The object to be transformed using the chain. Usually this will always be a string, but it is not required. Whatever type it is. All transforms in the chain must support it.
-   `filename` **string** 

Returns **Any** The transformed results. Again, this is almost always going to be a string.

### Transform

Create a new transform.

**Parameters**

-   `opts` **Object or transformCallback** 
    -   `opts.transform` **[transformCallback]** The transform function. (optional, default `noop`)
    -   `opts.match` **[Function or string or Array&lt;string&gt; or RegExp]** Used to filter whether or not this transform is applied to a given file.
    -   `opts.extensions` **[Array&lt;string&gt;]** List of file extensions this transform applies to. (optional, default `'.js'`)
    -   `opts.verbose` **[boolean]** If true, every invocation of the transform will be logged. (optional, default `false`)
    -   `opts.name` **[string]** The name of this transform, used in logging and error reporting.

Returns **Transform** A new transform instance

#### matches

Check whether this transform should be applied to a given file. `transformCallback`

**Parameters**

-   `filename` **string** The name of the file

Returns **boolean** true if this transform should be applied to the file.

#### transform

Perform the transform. Called with the same parameters as `transformCallback`.

**Parameters**

-   `code` **string or Any** 
-   `filename` **string** 
-   `next` **Function** 

Returns **string or Any** 

### transformCallback

A callback that performs a transform

**Parameters**

-   `code` **string or Any** The input to be transformed.
-   `filename` **string** The name of the file being transformed.
-   `next` **Function** Execute the rest of the transform synchronously
    -   `next.hasNext` **Function** Check if any of the transforms remaining in the chain can handle the file.
        You can optionally pass a string to change the name of the file.

## License

MIT © [James Talmage](http://github.com/jamestalmage)
