import assert from 'assert';
import {
  MDASTNode,
  mdParse,
  mdParseSetValidRenderables,
} from 'glov/client/markdown_parse';

function treeToText(tree: MDASTNode[]): string {
  let ret = '';
  for (let ii = 0; ii < tree.length; ++ii) {
    let node = tree[ii];
    if (node.type === 'text') {
      ret += node.content;
    } else if (node.type === 'paragraph') {
      ret += `${treeToText(node.content)}\n`;
    } else if (node.type === 'em' || node.type === 'strong') {
      ret += `<${node.type}>${treeToText(node.content)}</${node.type}>`;
    } else if (node.type === 'renderable') {
      ret += `<${node.content.type}=${node.content.key}>`;
    // } else {
    //   ret += `<unknown:${node.type}>`;
    }
  }
  return ret;
}

let tree: Array<MDASTNode> = mdParse('FOO_BAR Here is [img=foo] [gt=ACCESS_AREA text="Access Areas"]' +
  ' [p=1] [img=foo scale=3 nostretch] [world=1234/info] [emoji=smile] and an *em**b**tag*.');
// console.log(JSON.stringify(tree, undefined, 2));
assert(Array.isArray(tree));
assert.equal(tree.length, 1);

tree = mdParse('FOO\nbar\n\nbaz');
// console.log(JSON.stringify(tree, undefined, 2));
assert(Array.isArray(tree));
assert.equal(tree.length, 2);

tree = mdParse('a :f');
assert.equal(treeToText(tree), 'a :f\n');

tree = mdParse('a +.  f');
assert.equal(treeToText(tree), 'a +.  f\n');

tree = mdParse('[img=foo] *bar*');
assert.equal(treeToText(tree), '[img=foo] <em>bar</em>\n');

mdParseSetValidRenderables({ img: true });
tree = mdParse('[img=foo] *bar*');
assert.equal(treeToText(tree), '<img=foo> <em>bar</em>\n');
