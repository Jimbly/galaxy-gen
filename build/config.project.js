const spritesheetpad = require('./spritesheetpad');

module.exports = function (config, gb) {

  config.client_json_files.push(
    'spritesheets/*.json',
  );

  gb.task({
    name: 'client_spritesheetpad',
    input: ['spritesheets/*.png'],
    deps: ['client_json'],
    ...spritesheetpad('client_json:spritesheets/atlas_params.json'),
  });

  gb.task({
    name: 'client_spritesheetout',
    input: ['client_spritesheetpad:**.png'],
    type: gb.SINGLE,
    func: function (job, done) {
      let file = job.getFile();
      job.out({
        relative: file.relative.replace(/^spritesheets\//, 'client/img/').replace('.atlas.', '.'),
        contents: file.contents,
      });
      done();
    }
  });
  config.client_png.push('client_spritesheetpad:**.png');
  config.client_fsdata.push('client_spritesheetpad:**.auat');
};
