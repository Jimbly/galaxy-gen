/**
 * Copyright (c) 2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * Modified for GLOV.js to convert to TypeScript and to fit API and style requirements.
 *
 */

// Reasonable defaults
const PIXEL_STEP = 10;
const LINE_HEIGHT = 40;
const PAGE_HEIGHT = 800;

/*
 * Mouse wheel (and 2-finger trackpad) support on the web sucks.  It is
 * complicated, thus this doc is long and (hopefully) detailed enough to answer
 * your questions.
 *
 * If you need to react to the mouse wheel in a predictable way, this code is
 * like your bestest friend. * hugs *
 *
 * As of today, there are 4 DOM event types you can listen to:
 *
 *   'wheel'                -- Chrome(31+), FF(17+), IE(9+)
 *   'mousewheel'           -- Chrome, IE(6+), Opera, Safari
 *   'MozMousePixelScroll'  -- FF(3.5 only!) (2010-2013) -- don't bother!
 *   'DOMMouseScroll'       -- FF(0.9.7+) since 2003
 *
 * So what to do?  The is the best:
 *
 *   normalizeWheel.getEventType();
 *
 * In your event callback, use this code to get sane interpretation of the
 * deltas.  This code will return an object with properties:
 *
 *   spin_x   -- normalized spin speed (use for zoom) - x plane
 *   spin_y   -- " - y plane
 *   pixel_x  -- normalized distance (to pixels) - x plane
 *   pixel_y  -- " - y plane
 *
 * Wheel values are provided by the browser assuming you are using the wheel to
 * scroll a web page by a number of lines or pixels (or pages).  Values can vary
 * significantly on different platforms and browsers, forgetting that you can
 * scroll at different speeds.  Some devices (like trackpads) emit more events
 * at smaller increments with fine granularity, and some emit massive jumps with
 * linear speed or acceleration.
 *
 * This code does its best to normalize the deltas for you:
 *
 *   - spin is trying to normalize how far the wheel was spun (or trackpad
 *     dragged).  This is super useful for zoom support where you want to
 *     throw away the chunky scroll steps on the PC and make those equal to
 *     the slow and smooth tiny steps on the Mac. Key data: This code tries to
 *     resolve a single slow step on a wheel to 1.
 *
 *   - pixel is normalizing the desired scroll delta in pixel units.  You'll
 *     get the crazy differences between browsers, but at least it'll be in
 *     pixels!
 *
 *   - positive value indicates scrolling DOWN/RIGHT, negative UP/LEFT.  This
 *     should translate to positive value zooming IN, negative zooming OUT.
 *     This matches the newer 'wheel' event.
 *
 * Why are there spin_x, spin_y (or pixels)?
 *
 *   - spin_x is a 2-finger side drag on the trackpad, and a shift + wheel turn
 *     with a mouse.  It results in side-scrolling in the browser by default.
 *
 *   - spin_y is what you expect -- it's the classic axis of a mouse wheel.
 *
 *   - I dropped spinZ/pixelZ.  It is supported by the DOM 3 'wheel' event and
 *     probably is by browsers in conjunction with fancy 3D controllers .. but
 *     you know.
 *
 * Implementation info:
 *
 * Examples of 'wheel' event if you scroll slowly (down) by one step with an
 * average mouse:
 *
 *   OS X + Chrome  (mouse)     -    4   pixel delta  (wheelDelta -120)
 *   OS X + Safari  (mouse)     -  N/A   pixel delta  (wheelDelta  -12)
 *   OS X + Firefox (mouse)     -    0.1 line  delta  (wheelDelta  N/A)
 *   Win8 + Chrome  (mouse)     -  100   pixel delta  (wheelDelta -120)
 *   Win8 + Firefox (mouse)     -    3   line  delta  (wheelDelta -120)
 *
 * On the trackpad:
 *
 *   OS X + Chrome  (trackpad)  -    2   pixel delta  (wheelDelta   -6)
 *   OS X + Firefox (trackpad)  -    1   pixel delta  (wheelDelta  N/A)
 *
 * On other/older browsers.. it's more complicated as there can be multiple and
 * also missing delta values.
 *
 * The 'wheel' event is more standard:
 *
 * http://www.w3.org/TR/DOM-Level-3-Events/#events-wheelevents
 *
 * The basics is that it includes a unit, deltaMode (pixels, lines, pages), and
 * deltaX, deltaY and deltaZ.  Some browsers provide other values to maintain
 * backward compatibility with older events.  Those other values help us
 * better normalize spin speed.  Example of what the browsers provide:
 *
 *                          | event.wheelDelta | event.detail
 *        ------------------+------------------+--------------
 *          Safari v5/OS X  |       -120       |       0
 *          Safari v5/Win7  |       -120       |       0
 *         Chrome v17/OS X  |       -120       |       0
 *         Chrome v17/Win7  |       -120       |       0
 *                IE9/Win7  |       -120       |   undefined
 *         Firefox v4/OS X  |     undefined    |       1
 *         Firefox v4/Win7  |     undefined    |       3
 *
 */
type WheelEvent = {
  detail?: number;
  wheelDelta?: number;
  wheelDeltaX?: number;
  wheelDeltaY?: number;
  axis?: number;
  HORIZONTAL_AXIS: number;
  deltaX?: number;
  deltaY?: number;
  deltaMode?: number;
};
export function normalizeWheel(event: WheelEvent): {
  spin_x: number;
  spin_y: number;
  pixel_x: number;
  pixel_y: number;
} {
  let spin_x = 0;
  let spin_y = 0;
  let pixel_x = 0;
  let pixel_y = 0;

  // Legacy
  if (event.detail) {
    spin_y = event.detail;
  }
  if (event.wheelDelta) {
    spin_y = -event.wheelDelta / 120;
  }
  if (event.wheelDeltaY) {
    spin_y = -event.wheelDeltaY / 120;
  }
  if (event.wheelDeltaX) {
    spin_x = -event.wheelDeltaX / 120;
  }

  // side scrolling on FF with DOMMouseScroll
  if ('axis' in event && event.axis === event.HORIZONTAL_AXIS) {
    spin_x = spin_y;
    spin_y = 0;
  }

  pixel_x = spin_x * PIXEL_STEP;
  pixel_y = spin_y * PIXEL_STEP;

  if (typeof event.deltaY === 'number') {
    pixel_y = event.deltaY;
  }
  if (typeof event.deltaX === 'number') {
    pixel_x = event.deltaX;
  }

  if ((pixel_x || pixel_y) && event.deltaMode) {
    if (event.deltaMode === 1) {          // delta in LINE units
      pixel_x *= LINE_HEIGHT;
      pixel_y *= LINE_HEIGHT;
    } else {                             // delta in PAGE units
      pixel_x *= PAGE_HEIGHT;
      pixel_y *= PAGE_HEIGHT;
    }
  }

  // Fall-back if spin cannot be determined
  if (pixel_x && !spin_x) {
    spin_x = (pixel_x < 1) ? -1 : 1;
  }
  if (pixel_y && !spin_y) {
    spin_y = (pixel_y < 1) ? -1 : 1;
  }

  return {
    spin_x,
    spin_y,
    pixel_x,
    pixel_y,
  };
}


// import { is_firefox } from './browser';
// /*
//  * The best combination if you prefer spin_x + spin_y normalization.  It favors
//  * the older DOMMouseScroll for Firefox, as FF does not include wheelDelta with
//  * 'wheel' event, making spin speed determination impossible.
//  */
// export function getEventType(): string {
//   return is_firefox ?
//     'DOMMouseScroll' :
//     (window.WheelEvent) ?
//       'wheel' :
//       'mousewheel';
// }
