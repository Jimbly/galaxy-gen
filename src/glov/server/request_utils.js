// Portions Copyright 2019 Jimb Esser (https://github.com/Jimbly/)
// Released under MIT License: https://opensource.org/licenses/MIT

import querystring from 'querystring';
import url from 'url';
import { serverConfig } from './server_config';

// Options pulled in from serverConfig
// how far behind proxies that reliably add x-forwarded-for headers are we?
const forward_depth = serverConfig().forward_depth || 0;
const forward_loose = serverConfig().forward_loose || false;
const forward_depth_override = serverConfig().forward_depth_override || [];

function skipWarn(req) {
  if (forward_loose) {
    return true;
  }
  if (req.url === '/' || req.url === '/status') {
    // skipping warning on '/' because lots of internal health checks or
    // something on GCP seem to hit this, and / is not an endpoint that could
    // have anything interesting on its own.
    return true;
  }
  return false;
}

let debug_ips = /^(?:(?:::1)|(?:::ffff:)?(?:127\.0\.0\.1))$/;
function isLocalHostRaw(ip) {
  return Boolean(ip.match(debug_ips));
}

const regex_ipv4 = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/;
const regex_is_ipv4 = /^\d+\.\d+\.\d+\.\d+$/;
let inaccurate_log = {};
export function ipFromRequest(req) {
  // See getRemoteAddressFromRequest() for more implementation details, possibilities, proxying options
  // console.log('Client connection headers ' + JSON.stringify(req.headers));

  if (req.glov_ip) {
    return req.glov_ip;
  }

  let raw_ip = req.client.remoteAddress || req.client.socket && req.client.socket.remoteAddress;
  let last_ip = raw_ip;
  let ip = raw_ip;
  let header = req.headers['x-forwarded-for'];
  let forward_list = (header || '').split(',');
  if (forward_depth) {
    // Security note: must check x-forwarded-for *only* if we know this request came from a
    //   reverse proxy, should warn if missing x-forwarded-for.
    // If forwarded through multiple proxies, want to get just the original client IP,
    //   but the configuration must specify how many trusted proxies we passed through.
    if (!header) {
      if (!skipWarn(req)) {
        console.warn('Received request missing any x-forwarded-for header from ' +
          `${raw_ip} for ${req.url}, assuming trusted local`);
      }
      // Use raw IP
    } else {
      let forward_ip = (forward_list[forward_list.length - forward_depth] || '').trim();
      if (!forward_ip) {
        // forward_depth is incorrect, or someone is not getting the appropriate headers
        // Best guess: leftmost or raw IP
        ip = forward_list[0].trim() || raw_ip;
        if (forward_loose) {
          // don't warn, just use best guess
        } else {
          if (!skipWarn(req)) {
            console.warn(`Received request missing expected x-forwarded-for header from ${raw_ip} for ${req.url}`);
          }
          // use a malformed IP so that it does not pass "is local" IP checks, etc
          ip = `untrusted:${ip}`;
        }
      } else {
        ip = forward_ip;
      }
      let m = ip.match(regex_ipv4);
      if (m) {
        ip = m[1];
      }
      if (isLocalHostRaw(ip)) {
        if (!skipWarn(req)) {
          console.warn(`Received request with (likely spoofed) x-forwarded-for header "${header}"` +
            ` from ${raw_ip} for ${req.url}`);
        }
        ip = `untrusted:${raw_ip}`;
      }
      if (!ip.startsWith('untrusted')) {
        last_ip = ip;
      }
    }
  }

  let eff_depth = forward_depth;
  let untrusted_source = null;
  for (let ii = 0; ii < forward_depth_override.length; ++ii) {
    let entry = forward_depth_override[ii];
    let type = ip.startsWith('untrusted') ? 'untrusted' : ip.match(regex_is_ipv4) ? 'ipv4' : 'ipv6';
    if (type !== 'untrusted' && entry.blocklist.check(ip, type)) {
      eff_depth += entry.add;
      let forward_ip = (forward_list[forward_list.length - eff_depth] || '').trim();
      if (!forward_ip) {
        // forward_dpeth_override is incorrect; or, someone with access to
        //   those IPs spoofed traffic (e.g. using Cloudflare Workers)
        // Use existing IP (of the proxy), as we have no additional data
        console.warn(`Received request with insufficient x-forwarded-for header "${header}"` +
          ` from ${raw_ip} for ${req.url}`);
      } else {
        ip = forward_ip;
        let m = ip.match(regex_ipv4);
        if (m) {
          ip = m[1];
        }
        if (isLocalHostRaw(ip)) {
          if (!skipWarn(req)) {
            console.warn(`Received request with (likely spoofed) x-forwarded-for header "${header}"` +
              ` from ${raw_ip} for ${req.url}`);
          }
          ip = `untrusted:${last_ip}`;
        } else {
          if (entry.untrusted && !untrusted_source) {
            untrusted_source = last_ip;
          }
          last_ip = ip;
        }
      }
    }
  }

  if (untrusted_source && !ip.startsWith('untrusted')) {
    let key = `${untrusted_source}->${ip}`;
    ip = `${ip},${untrusted_source}`;
    if (!inaccurate_log[key]) {
      inaccurate_log[key] = true;
      console.debug(`Received request from potentially untrustworthy proxy ${untrusted_source},` +
        ` using combined IP of ${ip}`);
    }
  }

  if (eff_depth === 0 && header) {
    // No forward_depth specified, so, if we do see a x-forwarded-for header, then
    // this is either someone spoofing, or a forwarded request (e.g. from
    // browser-sync). Either way, do not trust it.
    if (header) {
      if (!skipWarn(req)) {
        console.warn('Received request with unexpected x-forwarded-for header '+
          `(${header}) from ${raw_ip} for ${req.url}`);
      }
      // use a malformed IP so that it does not pass "is local" IP checks, etc
      ip = `untrusted:${ip}`;
    }
  }
  if (!ip) {
    // client already disconnected?
    return 'unknown';
  }
  let m = ip.match(regex_ipv4);
  if (m) {
    ip = m[1];
  }
  req.glov_ip = ip;
  return ip;
  // return `${ip}${port ? `:${port}` : ''}`;
}

let cache = {};
export function isLocalHost(ip) {
  let cached = cache[ip];
  if (cached === undefined) {
    cache[ip] = cached = isLocalHostRaw(ip);
    if (cached) {
      console.info(`Allowing dev access from ${ip}`);
    } else {
      console.debug(`NOT Allowing dev access from ${ip}`);
    }
  }
  return cached;
}

export function requestIsLocalHost(req) {
  if (req.glov_is_dev === undefined) {
    let ip = ipFromRequest(req);
    req.glov_is_dev = isLocalHost(ip);
  }
  return req.glov_is_dev;
}

export function allowMapFromLocalhostOnly(app) {
  app.all('*.map', function (req, res, next) {
    if (requestIsLocalHost(req)) {
      if (req.method === 'OPTIONS') {
        // Attempt to support OPTIONS preflight requests for private network access
        //   Doesn't seem to fix the problem with debugging in Discord, though :(
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        return void setOriginHeaders(req, res, function () {
          if (req.headers['access-control-request-method']) {
            res.setHeader('Access-Control-Allow-Methods', req.headers['access-control-request-method']);
          }
          if (req.headers['access-control-request-private-network']) {
            res.setHeader('Access-Control-Allow-Private-Network', 'true');
          }
          res.writeHead(204);
          res.end();
        });
      }
      return void next();
    }
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end(`Cannot ${req.method} ${req.url}`);
  });
}

export function safeString(str) {
  return str.replace(/["<>\\]/g, '');
}

export function requestGetParsedURL(req) {
  // Note: `new URL('/')` throws an exception, `url.parse('/')` does what we need
  return req._parsedUrl || url.parse(req.url); //eslint-disable-line no-underscore-dangle, n/no-deprecated-api
}

// Gets a parsed, cached `query` from a request.  This is usually provided
//   by Express's default middleware, but useful to call manually if not
//   using Express or on low-level requests like `upgrade`s).
export function requestGetQuery(req) {
  if (!req.query) {
    req.query = querystring.parse(requestGetParsedURL(req).query);
  }
  return req.query;
}

export function respondArray(req, res, next, err, arr) {
  if (err) {
    return void next(err);
  }
  let text;
  if (req.query.format === 'csv' || req.query.format === 'tsv') {
    res.setHeader('Content-Type', 'text/plain');
    let delim = req.query.format === 'csv' ? ',' : '\t';
    let header = [];
    let keys = {};
    let lines = [];
    for (let ii = 0; ii < arr.length; ++ii) {
      let elem = arr[ii];
      for (let key in elem) {
        let idx = keys[key];
        if (idx === undefined) {
          keys[key] = header.length;
          header.push(key);
        }
      }
      lines.push(header.map((f) => `${elem[f]}`).join(delim));
    }
    text = `${header.join(delim)}\n${lines.join('\n')}`;
  } else {
    res.setHeader('Content-Type', 'application/json');
    text = JSON.stringify(arr);
  }
  res.end(text);
}

function setOriginHeaders(req, res, next) {
  if (req.headers.origin) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
  }
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  next();
}

function setCrossOriginHeadersAlways(req, res, next) {
  let pathname = requestGetParsedURL(req).pathname;
  if (pathname.endsWith('/') || pathname.endsWith('.html') || pathname.endsWith('.js')) {
    // For developers: Set as "cross-origin isolated", for access to high resolution timers
    // Disclaimer: I have no idea what this does, other than allows high resolution timers on Chrome/Firefox
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  }
  next();
}

function setCrossOriginHeadersUponRequest(req, res, next) {
  if (req.query.coop) {
    setCrossOriginHeadersAlways(req, res, next);
  } else {
    next();
  }
}

function disableCrossOriginHeadersUponRequest(req, res, next) {
  if (!req.query.nocoop) {
    setCrossOriginHeadersAlways(req, res, next);
  } else {
    next();
  }
}

export function setupRequestHeaders(app, { dev, allow_map }) {
  if (!allow_map) {
    allowMapFromLocalhostOnly(app);
  }
  if (dev) {
    app.use(disableCrossOriginHeadersUponRequest);
  } else {
    app.use(setCrossOriginHeadersUponRequest);
  }
  app.use(setOriginHeaders);
}

export function requestLogEverything(app) {
  let last_request_id = 0;
  app.use((req, res, next) => {
    let request_id = ++last_request_id;
    console.debug(`${request_id}: ${req.method}, ${req.originalUrl}, `, req.headers);
    res.on('close', () => {
      console.debug(`${request_id}: ${res.statusCode}, outbound headers: `, res.getHeaders());
    });
    next();
  });
}
