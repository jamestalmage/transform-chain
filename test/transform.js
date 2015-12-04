import _test from 'ava';
import Transform from '../transform';
import debug from 'debug';

const log = debug('transform-chain');

// This is here simply to support logging, which is only used in one test.
// TODO: AVA should have grouping.
const test = _test.serial;

test.beforeEach(t => {
	t.context.log = [];
	t.context.old = {};
	['error', 'warn', 'log'].forEach(name => {
		t.context.old[name] = console[name];
		console[name] = function () {
			const entry = [name, Array.prototype.slice.call(arguments)];
			t.context.log.push(entry);
			log(entry);
		};
	});
});

test.afterEach(t => {
	['error', 'warn', 'log'].forEach(name => {
		console[name] = t.context.old[name];
	});
});

test('matcher can be a function', t => {
	const transform = new Transform({
		match: filename => filename === '/foo.js'
	});

	t.false(transform.matches('/bar.js'));
	t.true(transform.matches('/foo.js'));
});

test('matches based on extension if no matcher is provided', t => {
	t.false(new Transform({}).matches('/foo.coffee'));
	t.false(new Transform({extensions: ['.coffee']}).matches('/foo.js'));
	t.true(new Transform({}).matches('/foo.js'));
	t.true(new Transform({extensions: ['.coffee']}).matches('/foo.coffee'));
});

test('matcher can be a regular expression', t => {
	const transform = new Transform({match: /foo/});
	t.true(transform.matches('foo.js'));
	t.false(transform.matches('bar.js'));
});

test('matcher can be a string', t => {
	const transform = new Transform({match: '**/{a,b}*.js'});

	t.true(transform.matches('./at.js'));
	t.true(transform.matches('./bat.js'));
	t.true(transform.matches('./boy.js'));
	t.false(transform.matches('./cat.js'));
});

test('matcher can be an array', t => {
	const transform = new Transform({match: ['**/{a,b}*.js', '!**/*oy.js']});

	t.true(transform.matches('./at.js'));
	t.true(transform.matches('./bat.js'));
	t.false(transform.matches('./boy.js'));
});

test('transform function is used to transform the code', t => {
	const transform = new Transform({transform: code => code.replace(/foo/, 'bar')});
	t.is(transform.transform('food', 'test.js', noop), 'bard');
});

test('transform function can be the only argument', t => {
	const transform = new Transform(code => code.replace(/foo/, 'bar'));
	t.is(transform.transform('food', 'test.js', noop), 'bard');
});

test('no transform forwards to next', t => {
	t.plan(2);
	const transform = new Transform({});
	const result = transform.transform('foo', 'test.js', (code, filename) => {
		t.is(filename, 'test.js');
		return code + 'bar';
	});

	t.is(result, 'foobar');
});

test('no matcher forwards to next', t => {
	t.plan(2);
	const transform = new Transform({transform: () => 'baz'});
	const result = transform.transform('foo', 'test.coffee', (code, filename) => {
		t.is(filename, 'test.coffee');
		return code + 'bar';
	});

	t.is(result, 'foobar');
});

test('name can be set by options or using fnName', t => {
	function bar() {}
	const transform = bar;
	const name = 'foo';

	// Wrapped in IIFE to prevent Babel from giving it a name.
	const noName = (function () {
		return function () {};
	})();

	t.is(new Transform({transform, name}).name, 'foo');
	t.is(new Transform(transform).name, 'bar');
	t.is(new Transform({transform: noName}).name, '[anonymous]');
});

test('verbose', t => {
	function bar() {
		return 'bar';
	}

	const transform = new Transform({verbose: true, transform: bar});

	transform.transform('foo', 'bar.js', noop);

	t.is(t.context.log.length, 1);
	t.true(/transform bar to bar.js/.test(t.context.log[0][1][0]));
});

test('not verbose', t => {
	const transform = new Transform({transform: () => 'bar'});

	transform.transform('foo', 'bar.js', noop);

	t.is(t.context.log.length, 0);
});

test('throws with bad argument', t => {
	t.plan(1);
	try {
		new Transform({match: 3});
	} catch (e) {
		//TODO: AVA t.throws should support regex
		t.true(/Bad matcher/.test(e.message));
	}
});

test('will fall through if transform throws and there is another downstream handler', t => {
	t.plan(5);

	function next(code, file) {
		t.is('foo', code);
		t.is('foo.js', file);
		return 'bar';
	}

	next.hasNext = () => true;

	const transform = new Transform(() => {
		t.pass();
		throw new Error('blah')
	});

	t.is(transform.transform('foo', 'foo.js', next), 'bar');
	t.true(/calling next transform/.test(t.context.log[0][1].join(' ')));
});

test('will return `code` if the transform throws and there are no additional downstream handlers', t => {
	t.plan(3);

	function next() {
		t.fail();
	}

	next.hasNext = () => false;

	const transform = new Transform(() => {
		t.pass();
		throw new Error('blah')
	});

	t.is(transform.transform('foo', 'foo.js', next), 'foo');
	t.true(/returning original code/.test(t.context.log[0][1].join(' ')));
});

function noop() {}
