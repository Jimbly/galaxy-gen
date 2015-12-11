// Portions Copyright 2019 Jimb Esser (https://github.com/Jimbly/)
// Released under MIT License: https://opensource.org/licenses/MIT

// Things that should be done before requiring or running any user-level code or other engine code

require('./polyfill.js');

let debug = document.getElementById('debug');
window.onerror = function (e, file, line, col, errorobj) {
  let msg = `${e}\n  at ${file}(${line}:${col})`;
  if (errorobj && errorobj.stack) {
    msg = `${errorobj.stack}`;
    if (errorobj.message) {
      if (msg.indexOf(errorobj.message) === -1) {
        msg = `${errorobj.message}\n${msg}`;
      }
    }
    let origin = document.location.origin || '';
    if (origin) {
      if (origin.slice(-1) !== '/') {
        origin += '/';
      }
      msg = msg.split(origin).join(''); // replace
    }
    // fixup weird Firefox weirdness
    msg = msg.replace(/\[\d+\]</g, '') // remove funny [123] at start of stack lines
      .replace(/<?\/<?/g, '/') // remove funny <s, they mess up people's copy and paste
      .replace(/\n([^ ])/g, '\n  $1'); // add indentation if missing
  }
  let show = true;
  if (window.glov_error_report) {
    show = window.glov_error_report(msg, file, line, col);
  }
  if (show) {
    debug.innerText = `${msg}\n\nPlease report this error to the developer, and then reload this page.`;
  }
};
window.debugmsg = function (msg, clear) {
  if (clear) {
    debug.innerText = msg;
  } else {
    debug.innerText += `${msg}\n`;
  }
};
