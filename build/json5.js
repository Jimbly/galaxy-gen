const gb = require('glov-build');
const JSON5 = require('json5');

module.exports = function (options) {
  options = options || {};
  options.beautify = options.beautify === undefined ? true : options.beautify;

  function parseJSON5(job, done) {
    let file = job.getFile();
    let obj;
    try {
      obj = JSON5.parse(String(file.contents));
    } catch (err) {
      return void done(err);
    }
    if (options.filter_obj) {
      obj = options.filter_obj(obj, job, file);
    }
    let text = JSON.stringify(obj, null, options.beautify ? 2 : null);
    if (options.filter_text) {
      text = options.filter_text(text, job, file, obj);
    }
    job.out({
      relative: file.relative.replace(/\.json5$/, '.json'),
      contents: Buffer.from(text),
    });
    done();
  }

  return {
    type: gb.SINGLE,
    func: parseJSON5,
    version: [
      parseJSON5,
      options.filter_obj,
      options.filter_text,
    ],
  };
};
