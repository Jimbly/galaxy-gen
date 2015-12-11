/* eslint global-require:off */

// Startup code.

let called_once = false;
window.onload = function () {
  if (called_once) {
    return;
  }
  called_once = true;
  // require('./glov/worker_comm.js').startup(); // First, so it gets loading quickly (if workers required)
  require('./glov/bootstrap.js');
  if (window.glov_env === 'multiplayer') {
    require('./multiplayer.js').main();
  } else {
    require('./main.js').main();
  }
};
