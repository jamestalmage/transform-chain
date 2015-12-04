'use strict';

var path = require('path');
var fnName = require('fn-name');
var isRegExp = require('is-regexp');
var multimatch = require('multimatch');

/**
 * Create a new transform.
 * @param {Object|transformCallback} opts
 * @param {transformCallback} [opts.transform=noop] - The transform function.
 * @param {Function|string|string[]|RegExp} [opts.match] - Used to filter whether or not this transform is applied to a given file.
 * @param {string[]} [opts.extensions='.js'] - List of file extensions this transform applies to.
 * @param {boolean} [opts.verbose=false] - If true, every invocation of the transform will be logged.
 * @param {string} [opts.name] - The name of this transform, used in logging and error reporting.
 * @returns {Transform} A new transform instance
 *
 * @constructor
 */
function Transform(opts) {
	if (opts instanceof Transform) {
		return opts;
	}
	if (!this instanceof Transform) {
		return new Transform(opts);
	}
	if (typeof opts === 'function') {
		opts = {transform: opts};
	}
	this._extensions = opts.extensions || ['.js'];
	this._matcher = normalizeMatcher(opts.match);
	this._transformer = opts.transform;
	this._verbose = opts.verbose;
	this.name = opts.name;
	if (!this.name && this._transformer) {
		this.name = fnName(this._transformer) || '[anonymous]';
	}
	this.postLoadHook = opts.postLoadHook;
}

/**
 * Check whether this transform should be applied to a given file. {@link transformCallback}
 * @param {string} filename The name of the file
 * @returns {boolean} true if this transform should be applied to the file.
 */
Transform.prototype.matches = function (filename) {
	return Boolean(
		typeof filename === 'string' &&
		this._extensions.indexOf(path.extname(filename)) !== -1 &&
		(!this._matcher || this._matcher(path.resolve(filename)))
	);
};

/**
 * Perform the transform. Called with the same parameters as {@link transformCallback}.
 * @param {string|*} code
 * @param {string} filename
 * @param {Function} next
 * @returns {string|*}
 */
Transform.prototype.transform = function (code, filename, next) {
	if (!this._transformer || !this.matches(filename)) {
		return next(code, filename);
	}

	if (this._verbose) {
		this.log('Applying transform ' + this.name + ' to ' + filename);
	}

	try {
		return this._transformer(code, filename, next);
	} catch (ex) {
		return this.handleException(ex, code, filename, next);
	}
};

/**
 * Callback used to handle errors thrown by the wrapped transform function.
 *
 * The default implementation will check to see if there are additional downstream transforms
 * that can handle the file and forward it to them. Otherwise it will return the original input
 * unmodified.
 *
 * Exposed with the intention of being overridden if users desire a different behavior.
 *
 * @access private
 * @param {Error} ex The thrown exception
 * @param {string|*} code The value passed into the transform.
 * @param {string} filename The name of the file being transformed.
 * @param {Function} next Callback for triggering the next transform.
 * @returns {string|*} the fallback response.
 */
Transform.prototype.handleException = function (ex, code, filename, next) {
	var hasNext = next.hasNext();
	this.log(
		'Error in transform ', this.name,
		'for', filename,
		hasNext ? '; calling next transform' : '; returning original code'
	);
	this.log(ex.message || String(ex));
	this.log(ex.stack);

	return hasNext ? next(code, filename) : code;
};

/**
 * Has the same signature as, and forwards directly to console.error.
 * Users can override this method to provide whatever logging mechanism they choose.
 * @access private
 */
Transform.prototype.log = function () {
	console.error.apply(console, arguments);
};

function normalizeMatcher(matcher) {
	if (!matcher || typeof matcher === 'function') {
		return matcher;
	}
	if (isRegExp(matcher)) {
		return function (filename) {
			return matcher.test(filename);
		};
	}
	if (typeof matcher === 'string') {
		matcher = [matcher];
	}
	if (Array.isArray(matcher)) {
		matcher = matcher.slice();
		return function (filename) {
			return Boolean(multimatch(filename, matcher).length);
		};
	}
	throw new Error('Bad matcher, if supplied it should a function, regexp, string, or array of strings. Got: ' + typeof matcher);
}

module.exports = Transform;


/**
 * A callback that performs a transform
 * @typedef {Function} transformCallback
 * @param {string|*} code - The input to be transformed.
 * @param {string} filename - The name of the file being transformed.
 * @param {Function} next - Execute the rest of the transform synchronously
 *
 * @param {Function} next.hasNext - Check if any of the transforms remaining in the chain can handle the file.
 * You can optionally pass a string to change the name of the file.
 */
