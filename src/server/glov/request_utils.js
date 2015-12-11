// Portions Copyright 2019 Jimb Esser (https://github.com/Jimbly/)
// Released under MIT License: https://opensource.org/licenses/MIT

const regex_ipv4 = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/;
export function ipFromRequest(req) {
  // See getRemoteAddressFromRequest() for more implementation details, possibilities, proxying options
  // console.log('Client connection headers ' + JSON.stringify(req.headers));

  if (req.glov_ip) {
    return req.glov_ip;
  }

  // Security note: must check x-forwarded-for *only* if we know this request came from a
  //   reverse proxy, should warn if missing x-forwarded-for.
  let ip = req.headers['x-forwarded-for'] || req.client.remoteAddress ||
    req.client.socket && req.client.socket.remoteAddress;
  // let port = req.headers['x-forwarded-port'] || req.client.remotePort ||
  //   req.client.socket && req.client.socket.remotePort;
  if (!ip) {
    // client already disconnected?
    return 'unknown';
  }
  ip = ip.split(',')[0]; // If forwarded through multiple proxies, use just the original client IP
  let m = ip.match(regex_ipv4);
  if (m) {
    ip = m[1];
  }
  req.glov_ip = ip;
  return ip;
  // return `${ip}${port ? `:${port}` : ''}`;
}

export function allowMapFromLocalhostOnly(app) {
  let debug_ips = /^(?:::1)|(?:127\.0\.0\.1)(?::\d+)?$/;
  let cache = {};
  app.use(function (req, res, next) {
    let ip = ipFromRequest(req);
    let cached = cache[ip];
    if (cached === undefined) {
      cache[ip] = cached = Boolean(ip.match(debug_ips));
      if (cached) {
        console.info(`Allowing dev access from ${ip}`);
      } else {
        console.debug(`NOT Allowing dev access from ${ip}`);
      }
    }
    req.glov_is_dev = cached;
    next();
  });
  app.all('*.map', function (req, res, next) {
    if (req.glov_is_dev) {
      return void next();
    }
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end(`Cannot ${req.method} ${req.url}`);
  });
}

export function safeString(str) {
  return str.replace(/["<>\\]/g, '');
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

export function setOriginHeaders(req, res, next) {
  if (req.headers.origin) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
  }
  next();
}
