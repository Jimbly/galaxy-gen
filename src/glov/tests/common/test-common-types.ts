import type {
  KeysMatching,
  KeysMatchingLoose,
} from '../../common/types';

type TypesEqual<T, U, Y=true, N=false> =
  (<G>() => G extends T ? 1 : 2) extends
  (<G>() => G extends U ? 1 : 2) ? Y : N;

type StaticAssert<X extends true> = X;

type Test = {
  str: string;
  stropt?: string;
  strconst: 'a' | 'b';
  strconstopt?: 'a' | 'b';
  either: string | number;
  eitheropt?: string | number;
  num: number;
  numopt?: number;
  numconst: 1 | 2;
  numconstopt?: 1 | 2;
};
// exactType(KeysMatching<Test, string>;
export type Foo2 = KeysMatching<Test, string | number>;
export type Foo3 = KeysMatching<Test, number>;
export type Foo7 = KeysMatching<Test, number | undefined>;
export type Foo4 = KeysMatchingLoose<Test, string>;
export type Foo5 = KeysMatchingLoose<Test, string | number>;
export type Foo6 = KeysMatchingLoose<Test, number>;
export type Foo8 = KeysMatchingLoose<Test, number | undefined>;

export type Tests = StaticAssert<TypesEqual<KeysMatching<Test, string>, 'str'>> |
  StaticAssert<TypesEqual<KeysMatching<Test, string | number>, 'either'>> |
  StaticAssert<TypesEqual<KeysMatching<Test, number>, 'num'>> |
  StaticAssert<TypesEqual<KeysMatching<Test, number | undefined>, 'numopt'>>;
export type Tests2 = StaticAssert<TypesEqual<KeysMatchingLoose<Test, string>, 'str' | 'strconst'>> |
  StaticAssert<TypesEqual<KeysMatchingLoose<Test, string | number>,
    'str' | 'strconst' | 'either' | 'num' | 'numconst'>> |
  StaticAssert<TypesEqual<KeysMatchingLoose<Test, number>, 'num' | 'numconst'>> |
  StaticAssert<TypesEqual<KeysMatchingLoose<Test, number | undefined>, 'num' | 'numopt' | 'numconst' | 'numconstopt'>>;
