'use strict';

var Transform = require('./transform');

/**
 * Creates a new transform chain.
 * @constructor
 */
function TransformChain() {
	this._transforms = [];
}

/**
 * Appends a transform to the end of the chain.
 * @param {Transform|TransformDefinition} transform the transform to append.
 */
TransformChain.prototype.appendTransform = function (transform) {
	this._transforms.push(new Transform(transform));
};

/**
 * Prepends a transform at the beginning of the chain.
 * @param {Transform|TransformDefinition} transform the transform to prepend.
 */
TransformChain.prototype.prependTransform = function (transform) {
	this._transforms.unshift(new Transform(transform));
};

/**
 * Check if the chain has a matching transform for a particular file.
 * @param {string} filename the path to the file.
 * @returns {boolean} true if at least one transform in the chain matches the file.
 */
TransformChain.prototype.hasMatch = function (filename) {
	return hasMatch(this._transforms, filename);
};

function hasMatch(transforms, fileName) {
	return transforms.some(function (transform) {
		return transform.matches(fileName);
	});
}

/**
 * Transform an input using the matching transforms from the chain.
 * @param {*} code The object to be transformed using the chain. Usually this will always be a string, but it is not required. Whatever type it is. All transforms in the chain must support it.
 * @param {string} filename
 * @returns {*} The transformed results. Again, this is almost always going to be a string.
 */
TransformChain.prototype.transform = function (code, filename) {
	var transforms = this._transforms.slice();

	function next(code, fn) {
		filename = fn;
		while (transforms.length) {
			var transform = transforms.shift();
			if (transform.matches(fn)) {
				return transform.transform(code, fn, next);
			}
		}
		return code;
	}

	next.hasMatch = function (fn) {
		return hasMatch(transforms, fn || filename);
	};

	return next(code, filename);
};

/**
 * Notify every transform that a file has been loaded. Included for legacy istanbul support.
 * @param {string} filename - Passed to every transforms `postLoadHook` (regardless of whether the transform matches the loaded file).
 */
TransformChain.prototype.notifyPostLoadHooks = function (filename) {
	var transforms = this._transforms.slice();
	transforms.forEach(function (transform) {
		if (transform.postLoadHook) {
			transform.postLoadHook(filename);
		}
	});
};

module.exports = TransformChain;
