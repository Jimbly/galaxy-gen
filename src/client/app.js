/* eslint n/global-require:off */

// For debug and used internally in the build/bundling pipeline
window.glov_build_version=BUILD_TIMESTAMP;

// Startup code.

let called_once = false;
function onLoad() {
  if (called_once) {
    return;
  }
  called_once = true;
  window.time_load_onload = Date.now();
  require('glov/client/bootstrap.js');
  // require('glov/client/worker_comm.js').startup(); // First, so it gets loading quickly (if workers required)
  if (window.conf_env === 'multiplayer') {
    //require('./multiplayer.js').main();
  } else if (window.conf_env === 'entity') {
    //require('./enttest.js').main();
  } else {
    require('./main.js').main();
  }
  window.time_load_init = Date.now();
}

window.addEventListener('DOMContentLoaded', onLoad);

window.onload = onLoad;
