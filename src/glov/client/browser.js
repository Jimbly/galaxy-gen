let ua = window.navigator.userAgent;
export let is_mac_osx = ua.match(/Mac OS X/);
export let is_ios = !window.MSStream && ua.match(/iPad|iPhone|iPod/);
export let is_ipad = Boolean(ua.match(/iPad/));
export let is_webkit = ua.match(/WebKit/i);
export let is_ios_safari = is_ios && is_webkit && !ua.match(/CriOS/i);
export let is_ios_chrome = is_ios && is_webkit && ua.match(/CriOS/i);
let m = ua.match(/OS (\d+)(_\d+)?(_\d+)?\s/);
// Note: also set on Chrome on iOS
export let safari_version_major = (is_ios && m) ? Number(m[1] || '0') : 0;
export let safari_version_minor = (is_ios && m) ? Number(m[2] && m[2].slice(1) || '0') : 0;
export let is_windows_phone = ua.match(/windows phone/i);
export let is_android = !is_windows_phone && ua.match(/android/i);
export let is_firefox = ua.match(/Firefox/i);
export let is_itch_app = String(window.location.protocol).indexOf('itch') !== -1; // Note: itch.io APP, not web site

export let is_discrete_gpu = false;

function init() {
  try {
    let canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 4;
    let gltest = canvas.getContext('webgl');
    if (gltest) {
      let debug_info = gltest.getExtension('WEBGL_debug_renderer_info');
      if (debug_info) {
        let renderer_unmasked = gltest.getParameter(debug_info.UNMASKED_RENDERER_WEBGL);
        is_discrete_gpu = Boolean(renderer_unmasked && (
          renderer_unmasked.match(/nvidia|radeon/i) ||
          renderer_unmasked.match(/apple gpu/i) && is_mac_osx && !is_ios
        ));
      }
    }
  } catch (e) {
    // ignored
  }
}
init();
