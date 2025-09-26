import assert from 'assert';
import { DataObject } from 'glov/common/types';
import {
  cmpNumericSmart,
  dateToFileTimestamp,
  defaultsDeep,
  empty,
  lerpAngle,
  nearSameAngle,
  once,
  randomNot,
  refclone,
  trimEnd,
} from 'glov/common/util';
import 'glov/server/test';
import { asyncSeries } from 'glov-async';

const { PI } = Math;

asyncSeries([
  function testOnce(next) {
    let called = false;
    function foo(): void {
      assert(!called);
      called = true;
    }
    let bar = once(foo);
    bar();
    bar();
    assert(called);
    next();
  },
  function testMisc(next) {
    assert(empty({}));
    assert(!empty({ foo: 'bar' }));
    assert(empty([] as unknown as DataObject));
    assert(!empty([1] as unknown as DataObject));
    next();
  },
  function testEmpty(next) {
    class Foo {
      bar: string;
      constructor() {
        this.bar = 'baz';
      }
    }
    assert(!empty(new Foo() as unknown as DataObject));
    class Foo2 {
      declare bar: string;
    }
    assert(empty(new Foo2() as unknown as DataObject));
    class Foo3 {
      bar!: string;
    }
    assert(!empty(new Foo3() as unknown as DataObject));
    class Foo4 {
      bar?: string;
    }
    assert(!empty(new Foo4() as unknown as DataObject));
    next();
  },
  function testLerpAngle(next) {
    const E = 0.00001;
    const ANGLES = [0, 0.1, PI/3, PI/2, PI, PI * 3/2, PI * 2];
    for (let ii = 0; ii < ANGLES.length; ++ii) {
      let a0 = ANGLES[ii];
      for (let jj = ii; jj < ANGLES.length; ++jj) {
        let a1 = ANGLES[jj];
        assert(nearSameAngle(lerpAngle(0, a0, a1), a0, E));
        assert(nearSameAngle(lerpAngle(0, a1, a0), a1, E));
        assert(nearSameAngle(lerpAngle(1, a0, a1), a1, E));
        assert(nearSameAngle(lerpAngle(1, a1, a0), a0, E));
      }
    }
    assert(nearSameAngle(lerpAngle(0.5, 0, 0.2), 0.1, E));
    assert(nearSameAngle(lerpAngle(0.5, 0, PI*2-0.2), PI*2-0.1, E));
    next();
  },
  function testDateToFileTimestamp(next) {
    let d = new Date(9999, 11, 31, 23, 59, 59);
    assert(dateToFileTimestamp(d) === '9999-12-31 23_59_59');
    d = new Date(1900, 0, 1, 0, 0, 0);
    assert(dateToFileTimestamp(d) === '1900-01-01 00_00_00');
    next();
  },
  function testRandomNot(next) {
    let v = 2;
    for (let ii = 0; ii < 10; ++ii) {
      let v2 = randomNot(v, 2, 4);
      assert(v2 !== v);
      assert(v2 >= 2);
      assert(v2 < 4);
      v = v2;
    }
    next();
  },
  function testTrimEnd(next) {
    assert.equal(trimEnd('asdf  '), trimEnd('asdf'));
    assert.equal(trimEnd('asdf \n '), trimEnd('asdf'));
    assert.equal(trimEnd('  asdf \n '), trimEnd('  asdf'));
    assert.equal(trimEnd(' \n asdf \n '), trimEnd(' \n asdf'));
    next();
  },
  function testCmpNumericSmart(next) {
    let arr = [
      'Thing 2b',
      'Thing 2',
      'Thing 11',
      'Thing 1',
      '1',
      'Z',
    ];
    arr.sort(cmpNumericSmart);
    assert.equal(arr.join(','), [
      '1',
      'Thing 1',
      'Thing 2',
      'Thing 2b',
      'Thing 11',
      'Z',
    ].join(','));
    next();
  },
  function testDefaultsDeep(next) {
    assert.deepEqual(defaultsDeep({}, { a: 1 }), { a: 1 });
    assert.deepEqual(defaultsDeep({ a: 2 }, { a: 1 }), { a: 2 });
    assert.deepEqual(defaultsDeep({ a: 2, b: 3 }, { a: 1 }), { a: 2, b: 3 });
    assert.deepEqual(defaultsDeep({ a: 2 }, { b: 3 }), { a: 2, b: 3 });
    assert.deepEqual(defaultsDeep({ }, { a: [1,2] }), { a: [1,2] });
    assert.deepEqual(defaultsDeep({ a: [2] }, { a: [1,2] }), { a: [2] });
    assert.deepEqual(defaultsDeep({ a: 'string' }, { a: { b: 1 } }), { a: 'string' });
    assert.deepEqual(defaultsDeep({ a: { b: 1 } }, { a: 'string' }), { a: { b: 1 } });
    assert.deepEqual(defaultsDeep({ a: { b: 1 } }, { a: [1] }), { a: { b: 1 } });
    assert.deepEqual(defaultsDeep({ a: [2] }, { a: { b: 1 } }), { a: [2] });
    next();
  },
  function testRefclone(next) {
    {
      let A = { list: [1, 2, 3] };
      let B = { list: [1, 2, 3] } as DataObject;

      let C = refclone(A, B);
      assert(C === A);
      B.foo = 'bar';
      C = refclone(A, B);
      assert(C !== A);
      assert(C !== B);
      assert(C.list !== B.list);
      assert(C.list === A.list);
    }

    {
      let A = { list: [1, 2, 3] };
      let B = { list: [1, 2, 3, 4] };

      let C = refclone(A, B);
      assert(C.list !== A.list);
      assert(C.list !== B.list);
    }

    {
      let A = { foo: { list: [1, 2, { bar: 'baz' }] } };
      let B = { foo: { list: [1, 2, { bar: 'baz' }] } };

      let C = refclone(A, B);
      assert(C === A);
      (B as DataObject).bar = 'baz';
      C = refclone(A, B);
      assert(C !== A);
      assert(C.foo === A.foo);
      B.foo.list[0] = 2;
      C = refclone(A, B);
      assert(C !== A);
      assert(C.foo.list !== A.foo.list);
      assert(C.foo.list !== B.foo.list);
      assert(C.foo.list[2] === A.foo.list[2]);
    }
    next();
  }
], function (err) {
  if (err) {
    throw err;
  }
});
