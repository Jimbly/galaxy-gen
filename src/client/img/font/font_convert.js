const fs = require('fs');
const parser = require('../../../../../../SRCSVN/GLOV/libUtil/utilParser.js');

let file_in = process.argv.slice(-1)[0];
console.log(`Reading ${file_in}...`);
let data_in = fs.readFileSync(file_in, 'utf8');
let data = parser.parserLoad(data_in);
data.char_infos = data.CharInfo;
delete data.CharInfo;
let file_out = file_in.replace(/\.txt/u, '.json');
if (file_in === file_out) {
  throw new Error('Invalid filename');
}
console.log(`Writing ${file_out}...`);
fs.writeFileSync(file_out, JSON.stringify(data));
console.log('Done.');
