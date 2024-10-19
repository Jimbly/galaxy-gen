// Portions Copyright 2019 Jimb Esser (https://github.com/Jimbly/)
// Released under MIT License: https://opensource.org/licenses/MIT

/*
  API usage:
  engine.defines = urlhash.register({
    key: 'D',
    type: SET,
  });
  urlhash.register({
    key: 'pos',
    // type: TYPE_STRING,
    change: (newvalue) => {},
    title: (value) => 'string',
    def: '1,2',
    hides: { otherfield: true },
    push: true, // do a pushState instead of replaceState when this changes
    hide_values: { foo: true }, // do not add to URL if values is in the provided set
    route_only: true, // never show this value, but still use it to influence routes - use with routeFixed()
    clear_on_route_change: true, // clear this value if a route-based URL is pushed, e.g. treat as part of a route
  });
  urlhash.set('pos', '3,4');
  urlhash.get('pos')

  urlhash.route('w/:w')     // use URLs like foo.com/w/1   instead of foo.com/?w=1
  urlhash.route('w/:w/:wg')  // use URLs like foo.com/w/1/2 instead of foo.com/?w=1&wg=2

  // Called whenever the URL state is pushed, even if to exactly the same URL (e.g. on link click)
  urlhash.onChange(cb)
*/

const assert = require('assert');
const { callEach } = require('glov/common/util.js');

const HISTORY_UPDATE_TIME = 1000;

export let TYPE_SET = 'set';
export let TYPE_STRING = 'string';

let params = {};

let title_transformer;

let page_base = (document.location.href || '').match(/^[^#?]+/)[0]; // remove search and anchor
// This used to be here, but doesn't make sense (why would it be `foo.com/file.html?` but not `foo.com/?`?
// if (!page_base.endsWith('/')) { // e.g. http://foo.bar/index.html
//   page_base += '?';
// }
// Removes index.html et all
let url_base = page_base.replace(/[^/]*$/,'');
if (url_base.endsWith('/a/')) {
  // Slightly hacky, if an index.html is stored forever in the hashed assets folder, adjust to deal with this
  url_base = url_base.slice(0, -2);
}
let on_change = [];

// e.g. http://site.com/ http://company.com/app/
export function getURLBase() {
  return url_base;
}

// e.g. http://site.com/ http://company.com/app/ http://site.com/page.html (for multi-page apps)
// Probably don't want this, call getLinkURL() instead
export function getURLPageBase() {
  return page_base;
}

// given something like w/1234 or ?foo=bar, return http://site.com/w/1234 or http://site.com/?foo=bar
//  or http://site.com/page.html?w/1234 or http://site.com/page.html?foo=bar appropriately
export function getLinkURL(suburl) {
  let mid = '';
  if (!page_base.endsWith('/') && suburl && !suburl.startsWith('?')) {
    // a page_base like `foo.com/index.html` and a route url like `user/foo`, delineate them
    mid = '?';
  }
  let url = `${page_base}${mid}${suburl}`;
  if (url.endsWith('?')) {
    url = url.slice(0, -1);
  }
  return url;
}

export function onChange(cb) {
  on_change.push(cb);
}

function cmpNumKeys(a, b) {
  let d = b.keys.length - a.keys.length;
  if (d) {
    return d;
  }
  // otherwise alphabetical for stability
  for (let ii = 0; ii < a.keys.length; ++ii) {
    if (a.keys[ii] < b.keys[ii]) {
      return -1;
    } else if (a.keys[ii] > b.keys[ii]) {
      return 1;
    }
  }
  assert(false); // two routes with identical keys
  return 0;
}

const route_param_regex = /:(\w+)/g;
let routes = [];

function queryString() {
  let href = String(document.location);
  href = href.slice(page_base.length);
  if (href.includes('#')) {
    href = href.slice(0, href.indexOf('#'));
  }
  return href;
}

const regex_value = /[^\w]\w+=([^&]+)/;
function getValue(query_string, opts) {
  if (opts.routes) {
    for (let ii = 0; ii < opts.routes.length; ++ii) {
      let r = opts.routes[ii];
      let m = query_string.match(r.regex);
      if (m) {
        if (r.value) {
          return r.value;
        }
        let idx = r.keys.indexOf(opts.key);
        return m[1 + idx];
      }
    }
  }
  let m = query_string.match(opts.regex) || [];
  if (opts.type === TYPE_SET) {
    let r = {};
    for (let ii = 0; ii < m.length; ++ii) {
      let m2 = m[ii].match(regex_value);
      assert(m2);
      r[m2[1]] = 1;
    }
    return r;
  } else {
    return m[1] || opts.def;
  }
}

let last_history_str = null; // always re-set it on the first update

// if `skip_apply` is set, we update the browser's URL/history, but do _not_ call any callbacks
function goInternal(query_string, for_init, skip_apply, route_only) {
  // Update all values, except those hidden by what is currently in the query string
  let hidden = {};
  for (let key in params) {
    let opts = params[key];
    if (opts.hides) {
      if (for_init ? opts.value : getValue(query_string, opts)) {
        for (let otherkey in opts.hides) {
          hidden[otherkey] = 1;
        }
      }
    }
  }

  let dirty = {};
  for (let key in params) {
    if (hidden[key]) {
      continue;
    }
    let opts = params[key];
    let new_value = for_init ? opts.value : getValue(query_string, opts);
    if (opts.type === TYPE_SET) {
      for (let v in new_value) {
        if (!opts.value[v] || for_init) {
          opts.value[v] = 1;
          dirty[key] = true;
        }
      }
      if (route_only && !(opts.routes || opts.clear_on_route_change)) {
        // do not clear any existing querystring values from a route_only operation
        continue;
      }
      for (let v in opts.value) {
        if (!new_value[v]) {
          delete opts.value[v];
          dirty[key] = true;
        }
      }
    } else {
      if (route_only && !(opts.routes || opts.clear_on_route_change) && !new_value) {
        // do not clear any existing querystring values from a route_only operation
        continue;
      }
      if (new_value !== opts.value || for_init) {
        dirty[key] = true;
        opts.value = new_value;
      }
    }
  }

  if (!skip_apply) {
    // Call all change callbacks
    for (let key in dirty) {
      let opts = params[key];
      if (opts.change) {
        opts.change(opts.value, for_init);
      }
    }
    callEach(on_change, for_init);
  }
}

let eff_title;
function toString(route_only) {
  eff_title = '';
  let hidden = {};
  for (let key in params) {
    let opts = params[key];
    if (opts.hides && opts.value) {
      for (let otherkey in opts.hides) {
        hidden[otherkey] = 1;
      }
    }
  }
  let root_value = '';
  outer: // eslint-disable-line no-labels
  for (let ii = 0; ii < routes.length; ++ii) {
    let r = routes[ii];
    let route_title = '';
    for (let jj = 0; jj < r.keys.length; ++jj) {
      let key = r.keys[jj];
      if (hidden[key]) {
        continue outer; // eslint-disable-line no-labels
      }
      let opts = params[key];
      if (opts.hide_values[opts.value]) {
        continue outer; // eslint-disable-line no-labels
      }
      // has a value, is not hidden, continue
      if (!route_title && opts.title) {
        route_title = opts.title(opts.value);
      }
    }
    for (let jj = 0; jj < r.keys.length; ++jj) {
      let key = r.keys[jj];
      if (params[key].route_only) {
        hidden[key] = true;
      }
    }
    // route is good!
    root_value = r.route_string.replace(route_param_regex, function (ignored, key) {
      hidden[key] = true;
      return String(params[key].value);
    });
    if (!eff_title && route_title) {
      eff_title = route_title;
    }
    break;
  }
  let values = [];
  for (let key in params) {
    if (hidden[key]) {
      continue;
    }
    let opts = params[key];
    if (opts.type === TYPE_SET) {
      for (let v in opts.value) {
        values.push(`${key}=${v}`);
      }
    } else {
      if (!opts.hide_values[opts.value]) {
        values.push(`${key}=${opts.value}`);
        if (!eff_title && opts.title) {
          eff_title = opts.title(opts.value);
        }
      }
    }
  }
  if (title_transformer) {
    eff_title = title_transformer(eff_title);
  }
  eff_title = String(eff_title);
  if (route_only) {
    values = [];
  }
  return `${root_value}${values.length ? '?' : ''}${values.join('&')}`;
}

export function refreshTitle() {
  toString(false);
  if (eff_title && eff_title !== document.title) {
    document.title = eff_title;
  }
}

function periodicRefreshTitle() {
  profilerStart('periodicRefreshTitle');
  refreshTitle();
  setTimeout(periodicRefreshTitle, 1000);
  profilerStop();
}

function onPopState() {
  let query_string = queryString();
  last_history_str = query_string;
  goInternal(query_string, false, false, false);
  refreshTitle();
}

let on_url_change;
export function onURLChange(cb) {
  on_url_change = cb;
}

let history_update_deferred = false;
export function historyDeferUpdate(defer) {
  history_update_deferred = defer;
}

let last_history_set_time = 0;
let scheduled = false;
let need_push_state = false;
function updateHistoryCommit() {
  profilerStart('updateHistoryCommit');
  if (history_update_deferred) {
    setTimeout(updateHistoryCommit, 1000);
    return void profilerStop();
  }
  scheduled = false;
  last_history_set_time = Date.now();
  let url = getLinkURL(last_history_str);
  if (url.endsWith('?')) {
    url = url.slice(0, -1);
  }
  try {
    if (need_push_state) {
      need_push_state = false;
      window.history.pushState(undefined, eff_title, url);
    } else {
      window.history.replaceState(undefined, eff_title, url);
    }
  } catch (e) {
    // ignore; some browsers disallow this, I guess
  }
  if (eff_title) {
    document.title = eff_title;
  }
  if (on_url_change) {
    on_url_change();
  }
  //window.history.replaceState(undefined, eff_title, `#${last_history_str}`);
  profilerStop();
}
function updateHistory(new_need_push_state) {
  let new_str = toString(false);
  if (last_history_str === new_str) {
    return;
  }
  need_push_state = need_push_state || new_need_push_state;
  last_history_str = new_str;
  if (scheduled) {
    // already queued up
    return;
  }
  let delay = HISTORY_UPDATE_TIME;
  if (Date.now() - last_history_set_time > HISTORY_UPDATE_TIME) {
    // Been awhile, apply "instantly" (but still wait until next tick to ensure
    //   any other immediate changes are registered)
    delay = 1;
  }
  scheduled = true;
  setTimeout(updateHistoryCommit, delay);
}

// Optional startup
export function startup(param) {
  assert(!title_transformer);
  title_transformer = param.title_transformer;
  if (!title_transformer && (param.title_suffix || param.title_default)) {
    const { title_suffix, title_default } = param;
    title_transformer = function (title) {
      if (title_suffix && title) {
        return `${title} | ${title_suffix}`;
      }
      return title || title_default || title_suffix;
    };
  }

  // Refresh the current URL, it might be in the non-route format
  updateHistory(false);

  if (title_transformer) {
    refreshTitle();
    setTimeout(periodicRefreshTitle, 1000);
  }
}

// Optional: fire all relevant `change` callbacks for any parameters with values
export function urlhashFireInitialChanges() {
  goInternal(null, true, false, false);
}

function routeEx(new_route) {
  let { keys } = new_route;
  for (let ii = 0; ii < keys.length; ++ii) {
    let opts = params[keys[ii]];
    // Must have already registered these keys
    assert(opts);
    opts.routes = opts.routes || [];
    opts.routes.push(new_route);
    // Update initial value
    opts.value = getValue(queryString(), opts);
  }
  routes.push(new_route);
  routes.sort(cmpNumKeys);
}

export function route(route_string) {
  let keys = [];
  // foo/:key/:bar => foo/([^/&?]+)/([^/&?]+)
  let base = route_string.replace(route_param_regex, function (ignored, match) {
    keys.push(match);
    return '([^/&?]+)';
  });
  let regex = new RegExp(`^\\??${base}(?:$|\\?|#)`);
  routeEx({
    route_string,
    regex,
    keys,
  });
}

// For a route that has no parameters, e.g. `foo.html`
// Needs an associated key already registered, then set(key, '1') and set(key, '') enter and leave this route
export function routeFixed(route_string, key) {
  let regex = new RegExp(`^\\??${route_string}(?:$|\\?|#)`);
  routeEx({
    route_string,
    regex,
    value: '1', // Just need something
    keys: [key],
  });
}

export function register(opts) {
  assert(opts.key);
  assert(!params[opts.key]);
  opts.type = opts.type || TYPE_STRING;
  let regex_search = `(?:[^\\w])${opts.key}=([^&#]+)`;
  let regex_type = '';
  if (opts.type === TYPE_SET) {
    regex_type = 'g';
  } else {
    opts.def = opts.def || '';
    opts.hide_values = opts.hide_values || {};
    opts.hide_values[opts.def] = true;
  }
  opts.regex = new RegExp(regex_search, regex_type);
  params[opts.key] = opts;
  // Get initial value
  opts.value = getValue(queryString(), opts);
  let ret = opts.value;
  if (opts.type === TYPE_SET && typeof Proxy === 'function') {
    // Auto-apply changes to URL if someone modifies the proxy
    ret = new Proxy(opts.value, {
      set: function (target, prop, value) {
        if (value) {
          target[prop] = 1;
        } else {
          delete target[prop];
        }
        updateHistory();
        return true;
      }
    });
  }

  if (!window.onpopstate) {
    window.onpopstate = onPopState;
  }

  return ret;
}

export function set(key, value, value2) {
  let opts = params[key];
  assert(opts);
  if (opts.type === TYPE_SET) {
    if (Boolean(opts.value[value]) !== Boolean(value2)) {
      opts.value[value] = value2 ? 1 : 0;
      updateHistory(opts.push);
    }
  } else {
    if (opts.value !== value) {
      opts.value = value;
      updateHistory(opts.push);
    }
  }
}

export function setMulti(values) {
  let any = false;
  let push = false;
  for (let key in values) {
    let value = values[key];
    let opts = params[key];
    assert(opts);
    assert(opts.type !== TYPE_SET);
    if (opts.value !== value) {
      opts.value = value;
      any = true;
      push = push || opts.push;
    }
  }
  if (any) {
    updateHistory(push);
  }
}

export function get(key) {
  let opts = params[key];
  assert(opts);
  return opts.value;
}

export function getRouteString() {
  return toString(true);
}

// query_string with the '?'
export function go(query_string, skip_apply) {
  goInternal(query_string, false, skip_apply, false);
  updateHistory(true);
}

// apply primarily the route-based parts of the URL, leaving all (existing)
// querystring-based ones alone, although this will also apply changes to
// querystring-based values if passed in.
export function goRoute(route_string, skip_apply) {
  goInternal(route_string, false, skip_apply, true);
  updateHistory(true);
}
