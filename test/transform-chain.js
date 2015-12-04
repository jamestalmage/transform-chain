import test from 'ava';
import Chain from '../';
import Transform from '../transform';

test.beforeEach(t => t.context = new Chain());

test('transforms can pass modified code down the remaining chain', ({context: chain, ... t}) => {
	chain.appendTransform((code, file, next) => next(code + ' bar', file));
	chain.appendTransform((code, file, next) => next(code + ' baz', file));
	chain.appendTransform((code, file, next) => next(code + ' qux', file));

	t.is(chain.transform('foo', 'foo.js'), 'foo bar baz qux');
});

test('prepend places transforms at the top of the chain', ({context: chain, ... t}) => {
	chain.prependTransform((code, file, next) => next(code + ' bar', file));
	chain.prependTransform((code, file, next) => next(code + ' baz', file));
	chain.prependTransform((code, file, next) => next(code + ' qux', file));

	t.is(chain.transform('foo', 'foo.js'), 'foo qux baz bar');
});

test('transforms can modify code after processing the remaining chain', ({context: chain, ... t}) => {
	chain.appendTransform((code, file, next) => 'bar ' + next(code, file));
	chain.appendTransform((code, file, next) => 'baz ' + next(code, file));

	t.is(chain.transform('foo', 'foo.js'), 'bar baz foo');
});

test('transforms elect not to continue down the chain', ({context: chain, ... t}) => {
	chain.appendTransform((code, file, next) => 'bar');
	chain.appendTransform((code, file, next) => 'baz ' + next(code, file));

	t.is(chain.transform('foo', 'foo.js'), 'bar');
});

test('transforms can change the filename they pass down the chain', ({context: chain, ... t}) => {
	chain.appendTransform((code, file, next) => next(code, 'bar-' + file));
	chain.appendTransform((code, file, next) => next(file + ':' +code, file));

	t.is(chain.transform('foo', 'foo.js'), 'bar-foo.js:foo');
});

test('only matching transforms are applied', ({context: chain, ... t}) => {
	chain.appendTransform(new Transform({
		transform: (code, file, next) => next(code + ' foo'),
		match: /foo/
	}));
	chain.appendTransform({
		transform: (code, file, next) => next(code + ' bar'),
		match: /bar/
	});

	t.is(chain.transform('foo', 'foo.js'), 'foo foo');
	t.is(chain.transform('foo', 'bar.js'), 'foo bar');
});

test('chain.hasMatch()', ({context: chain, ... t}) => {
	chain.appendTransform((code, file, next) => next(code + ' foo', file));

	t.false(chain.hasMatch('foo.coffee'));
	t.true(chain.hasMatch('foo.js'));

	chain.appendTransform({
		transform: (code, file, next) => next(code + ' coffee', file),
		extensions: ['.coffee']
	});

	t.true(chain.hasMatch('foo.coffee'));
});

test('next.hasMatch() can be used to determine if there is a downstream match', ({context: chain, ... t}) => {
	t.plan(6);

	chain.appendTransform((code, file, next) => {
		t.true(next.hasMatch(), 'first transform');
		t.true(next.hasMatch('foo.coffee'), 'first transform');
		next(code, 'foo.coffee');
	});

	chain.appendTransform({
		transform: (code, file, next) => {
			t.false(next.hasMatch(), 'second transform');
			t.true(next.hasMatch('foo.js'), 'second transform');
			next(code, 'foo.js');
		},
		extensions: ['.coffee']
	});

	chain.appendTransform((code, file, next) => {
		t.false(next.hasMatch(), 'third transform');
		t.false(next.hasMatch('foo.js'), 'third transform');
		next(code, file);
	});

	chain.transform('foo', 'foo.js');
});

test('notifyPostLoadHook', ({context: chain, ... t}) => {
	const messages = [];

	chain.appendTransform({postLoadHook: file => messages.push([1, file])});
	chain.appendTransform({postLoadHook: file => messages.push([2, file])});

	chain.notifyPostLoadHooks('foo.js');

	t.same(messages, [
		[1, 'foo.js'],
		[2, 'foo.js']
	]);
});
