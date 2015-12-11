
const worker = require('./glov/worker_thread.js');

worker.addHandler('test', function () {
  console.log('Worker Test!');
});
