/* eslint import/order:off */
import 'glov/client/test'; // Must be first

import assert from 'assert';
import { cmdAutoCompleteMatchForTesting } from 'glov/client/cmd_auto_complete';

function test(user: string, cmd: string, expected: number): void {
  let actual = cmdAutoCompleteMatchForTesting(user, cmd);
  assert.equal(actual, expected,
    `('${user}', '${cmd}') returned ${actual} (expected: ${expected})`);
}
// exact match with parameters
test('mycmd foo', 'my_cmd', 10);
test('mycmd foo', 'my_cmd_two', 0);
// prefix match
test('mycmd', 'my_cmd', 10);
test('myc_md', 'my_cmd', 10);
test('mycmd', 'my_cmd_two', 9);
test('myc_md', 'my_cmd_two', 9);
// equal with transpose
test('mcymd', 'my_cmd', 8);
test('mcy_md', 'my_cmd', 8);
test('mcy_md', 'my_cmd_two', 7);
test('mcymd', 'my_cmd_two', 7);
// rough match
// weight bump 2 for prefix match
// weight bump 1 for no transpose
const PREFIX_EXACT = 6;
const PREFIX_TRANSPOSE = 5;
const ROUGH_EXACT = 4;
const ROUGH_TRANSPOSE = 3;
test('abcd', 'abXY_cdXY', PREFIX_EXACT);
test('abcd', 'abcXY_bcdXY', ROUGH_EXACT); // c/should be PREFIX_EXACT
test('abcd', 'acXY_bdXY', PREFIX_TRANSPOSE);
test('abcd', 'X_bacdX', ROUGH_TRANSPOSE); // c/should be PREFIX_TRANSPOSE
test('abcd', 'X_abdcX', ROUGH_TRANSPOSE); // c/should be PREFIX_TRANSPOSE
test('abcd', 'babdc', ROUGH_TRANSPOSE);
test('abcd', 'babcd', ROUGH_EXACT);
test('abcd', 'abXY_efXY_cdXY', PREFIX_EXACT);
test('abcd', 'aXbXY_cXdXY', ROUGH_EXACT);
test('abcd', 'abXY_bcdXY', ROUGH_EXACT); // c/should be PREFIX_EXACT
test('abcd', 'abXY_efXY_bcdXY', ROUGH_EXACT); // c/should be PREFIX_TRANSPOSE
test('abcd', 'abXY_cbdXY', ROUGH_EXACT); // c/should be PREFIX_TRANSPOSE
test('abcd', 'abXY_bacdXY', ROUGH_EXACT); // c/should be PREFIX_TRANSPOSE
test('abcd', 'abXY_bdacXY', ROUGH_TRANSPOSE);
