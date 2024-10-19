import assert from 'assert';
import { TypeDef, traitFactoryCreate } from 'glov/common/trait_factory';
import { has } from 'glov/common/util';
import 'glov/server/test';
import { DummyFS } from './dummyfs';

import type { DataObject } from 'glov/common/types';

class BaseClass {
  declare type_id: string;
  data: DataObject;
  constructor(data: DataObject) {
    this.data = data;
  }
  myMethod(foo: number): number | false {
    // default implementation
    return false;
  }
  myOptionalMethod?(foo: number): number | false;
}

let factory = traitFactoryCreate<BaseClass, DataObject>();
function myMethodHigh(this: BaseClass, foo: number): number | false {
  return 10 * foo;
}
factory.registerTrait('methodhigh', {
  compound_methods: {
    myMethod: myMethodHigh,
    myOptionalMethod: myMethodHigh,
  },
});

function myMethodMid(this: BaseClass, foo: number): number | false {
  if (foo > 10) {
    return 5 * foo;
  }
  return false;
}
factory.registerTrait('methodmid', {
  compound_methods: {
    myMethod: myMethodMid,
    myOptionalMethod: myMethodMid,
  },
});

function myMethodLow(this: BaseClass, foo: number): number | false {
  return 1;
}
factory.registerTrait('methodlow', {
  compound_methods: {
    myMethod: myMethodLow,
    myOptionalMethod: myMethodLow,
  },
});


let fs = new DummyFS<TypeDef>({
  'foo/justhigh.def': {
    traits: [{
      id: 'methodhigh',
    }],
  },
  'foo/highlow.def': {
    traits: [{
      id: 'methodlow',
    }, {
      id: 'methodhigh',
    }],
  },
  'foo/justmid.def': {
    traits: [{
      id: 'methodmid',
    }],
  },
  'foo/midlow.def': {
    traits: [{
      id: 'methodlow',
    }, {
      id: 'methodmid',
    }],
  },
  'foo/lowmid.def': { // same, but opposite order
    traits: [{
      id: 'methodmid',
    }, {
      id: 'methodlow',
    }],
  },
  'foo/justlow.def': {
    traits: [{
      id: 'methodlow',
    }],
  },
  'foo/none.def': {
  },
});

let reload_called = '';
function onReload(type_id: string): void {
  reload_called = type_id;
}

factory.initialize({
  name: 'Test',
  fs,
  directory: 'foo',
  ext: '.def',
  Ctor: BaseClass,
  reload_cb: onReload,
});

let justhigh = factory.allocate('justhigh', {});
let highlow = factory.allocate('highlow', {});
let justmid = factory.allocate('justmid', {});
let midlow = factory.allocate('midlow', {});
let lowmid = factory.allocate('lowmid', {});
let justlow = factory.allocate('justlow', {});
let none = factory.allocate('none', {});
let all = [justhigh, highlow, justmid, midlow, lowmid, justlow];

// Methods are not being overridden in the instance
all.forEach(function (obj) {
  let Test = factory.getCtorForTesting(obj.type_id);
  assert(has(BaseClass.prototype, 'myMethod'));
  assert(has(Test.prototype, 'myMethod'));
  assert(!has(obj, 'myMethod'));
});

// Non-compound implementations with no default method are simply being assigned the single method
assert.equal(justhigh.myOptionalMethod, myMethodHigh);
assert.equal(justmid.myOptionalMethod, myMethodMid);
assert.equal(justlow.myOptionalMethod, myMethodLow);
assert.equal(none.myOptionalMethod, undefined);
// Compound implementations and those with default methods get something else
assert(justhigh.myMethod !== myMethodHigh);
assert(justmid.myMethod !== myMethodMid);
assert(justlow.myMethod !== myMethodLow);
assert(highlow.myMethod !== myMethodHigh && highlow.myMethod !== myMethodLow);

assert.equal(justhigh.myMethod(7), 70);
assert.equal(justmid.myMethod(7), false);
assert.equal(justmid.myMethod(17), 17*5);
assert.equal(justlow.myMethod(7), 1);
assert.equal(highlow.myMethod(7), 70);
assert.equal(midlow.myMethod(7), 1);
assert.equal(midlow.myMethod(17), 17*5);
assert.equal(lowmid.myMethod(7), 1);
assert.equal(lowmid.myMethod(17), 1);
assert.equal(none.myMethod(17), false);


// Reload
assert(!reload_called);
// trigger reload
fs.applyNewFile('foo/midlow.def', {
  // simple, no traits
});
assert.equal(reload_called, 'midlow');
let newmidlow = factory.allocate('midlow', {});
// existing unchanged
assert.equal(midlow.myMethod(7), 1);
// new has new behavior
assert.equal(newmidlow.myMethod(7), false);

fs.applyNewFile('foo/justhigh.def', {
  // simple, no traits
});
assert.equal(reload_called, 'justhigh');
assert.equal(justhigh.myMethod(7), 70);
let newjusthigh = factory.allocate('midlow', {});
assert.equal(newjusthigh.myMethod(7), false);

fs.applyNewFile('foo/none.def', {
  traits: [{
    id: 'methodlow',
  }],
});
assert.equal(reload_called, 'none');
assert.equal(none.myMethod(7), false);
let newnone = factory.allocate('none', {});
assert.equal(newnone.myMethod(7), 1);
