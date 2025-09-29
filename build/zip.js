const gb = require('glov-build');
const streamToArray = require('stream-to-array');
const { ZipFile } = require('yazl');

module.exports = function (params) {
  let { name } = params;

  function zip(job, done) {
    let zipfile = new ZipFile();
    let files = job.getFiles();
    for (let ii = 0; ii < files.length; ++ii) {
      let { relative, contents } = files[ii];
      zipfile.addBuffer(contents, relative, {
        forceDosTimestamp: true,
      });
    }
    streamToArray(zipfile.outputStream, function (err, parts) {
      if (err) {
        return void done(err);
      }
      job.out({
        relative: name,
        contents: Buffer.concat(parts),
      });
      done();
    });
    zipfile.end();
  }
  return {
    type: gb.ALL,
    func: zip,
    version: [
      zip,
      params,
    ],
  };
};
