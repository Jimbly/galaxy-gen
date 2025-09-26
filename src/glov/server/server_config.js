import assert from 'assert';
import fs from 'fs';
import { BlockList } from 'net';
import path from 'path';
import { defaultsDeep } from 'glov/common/util';
import json5 from 'json5';
const argv = require('minimist')(process.argv.slice(2));

let server_config;

export let default_config_options = {
  // How many servers must be connected to the master before it is considered ready
  master_ready_servers: 1,
  // How long after a new server connects before we consider it being stable/ready
  master_ready_server_time: 1000,
  // How long before triggering being ready, even if not enough servers are connected
  master_ready_timeout: 60000,
  // Flags that are propagated from a user's public.permissions onto their per-message identity
  permission_flags: ['sysadmin'],
  // What permission flags grant ability to use reserved words when renaming user and logging in
  display_name_bypass_flags: ['sysadmin'],
  // Modules to import before creating exchanges
  // Using string template so that glov-build-preresolve doesn't munge it
  exchange_providers: [`glov${'/server/exchange_gmx_client'}`],
  // How often to log and bucket perf_counters
  perf_counter_bucket_time: 10000,
  // How often to display channelserver STATUS message
  status_time: 5000,
  // Which log categories should be disabled from being shown by default
  log: {
    // Level shown to console / sent to Stackdriver / etc
    level: 'debug',
    cat: {
      ping: null,
      redundant: null,
      clientlist: false,
      entverbose: false,
      load: false,
      lifecycle: false,
      quiet: false, // do not show 'quiet' category messages by default
    },
  },
};

let default_env_options = {
  dev: {
    log: {
      format: 'dev',
      pad_levels: true,
    },
    // Always immediately "ready" in dev
    master_ready_timeout: 0,
  },
  prod: {
    log: {
      timestamp_format: 'long',
      pad_levels: true,
    },
  },
};

let process_uid;
export function processUID() {
  if (!process_uid) {
    if (process.env.PODNAME) {
      process_uid = `${process.env.PODNAME}${process.pid === 1 ? '' : `-${process.pid}`}`;
      // Add timestamp because failed pods restart with the same PODNAME
      // Timestamp mod 10m (approx 4 months), should be acceptably low chance for a collision
      process_uid += `-${Math.floor(Date.now()/1000) % 10000000}`;
    } else {
      process_uid = `local-${process.pid}`;
    }
  }
  return process_uid;
}

function determinEnv() {
  let env;
  if (argv.env || server_config.env) {
    // explicitly specified, use it
    env = argv.env || server_config.env;
  } else if (process.env.CONFIG_ENV) {
    env = process.env.CONFIG_ENV;
  } else if (process.env.GKE_PROJECTNAME) {
    env = process.env.GKE_PROJECTNAME;
  } else if (process.env.PODNAME) {
    if (process.env.LOCAL_GCP_CRED) {
      fs.writeFileSync('local-k8s.json', process.env.LOCAL_GCP_CRED);
    } else {
      console.log('Running in env:local-k8s, but no gcp.cred secret found.  You may need to add one with:');
      console.log('  kubectl create secret generic gcp.cred --from-file=json=my-gcp-cred.json');
    }
    env = 'local-k8s';
  } else if (argv.dev) {
    env = 'dev';
  } else {
    env = 'prod';
  }

  server_config.env = env;
  return env;
}

export function serverConfigStartup(code_defaults) {
  assert(!server_config);
  let config_file = 'config/server.json';
  if (argv.config) {
    config_file = argv.config;
  }
  // Highest priority: configuration file specified on command line
  let config_path = path.join(process.cwd(), config_file);
  if (fs.existsSync(config_path)) {
    console.log(`Using local server config from ${config_path}`);
    server_config = json5.parse(fs.readFileSync(config_path, 'utf8'));
  } else {
    server_config = {};
  }

  // Next priority: environment-based config
  let env = determinEnv(); // After getting explicit server_config

  let env_path = path.join(__dirname, '../../server/config/env.json');
  if (fs.existsSync(env_path)) {
    console.log(`Using config environment "${env}"`);
    let env_data = json5.parse(fs.readFileSync(env_path, 'utf8'));
    if (!env_data[env]) {
      console.error(`Invalid config environment specified: "${env}"`);
    } else {
      server_config = defaultsDeep(server_config, env_data[env]);
    }
    server_config = defaultsDeep(server_config, env_data.defaults);
  }

  // Lowest priority: hard-coded defaults
  if (default_env_options[env]) {
    server_config = defaultsDeep(server_config, default_env_options[env]);
  }
  server_config = defaultsDeep(server_config, code_defaults);

  if (server_config.forward_depth_override) {
    for (let jj = 0; jj < server_config.forward_depth_override.length; ++jj) {
      let override_config = server_config.forward_depth_override[jj];
      assert.equal(typeof override_config.add, 'number');
      assert(override_config.add >= 1);
      assert(override_config.config);
      let config_data;
      if (typeof override_config.config === 'string') {
        let override_path = path.join(__dirname, '../../server/config/', override_config.config);
        // console.debug(`Loading forward_depth_override data from "${override_path}"`);
        config_data = json5.parse(fs.readFileSync(override_path, 'utf8'));
      } else {
        config_data = override_config.config;
      }
      assert(config_data);
      assert(config_data.ipv4_cidrs && Array.isArray(config_data.ipv4_cidrs));
      assert(config_data.ipv6_cidrs && Array.isArray(config_data.ipv6_cidrs));
      let blocklist = override_config.blocklist = new BlockList();
      for (let ii = 0; ii < config_data.ipv4_cidrs.length; ++ii) {
        let entry = config_data.ipv4_cidrs[ii];
        let m = entry.match(/^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/);
        assert(m, entry);
        blocklist.addSubnet(m[1], Number(m[2]), 'ipv4');
      }
      for (let ii = 0; ii < config_data.ipv6_cidrs.length; ++ii) {
        let entry = config_data.ipv6_cidrs[ii];
        let m = entry.match(/^([\d:a-fA-F]+)\/(\d+)$/);
        assert(m, entry);
        blocklist.addSubnet(m[1], Number(m[2]), 'ipv6');
      }
    }
  }
}

export function serverConfig() {
  if (!server_config) {
    serverConfigStartup(default_config_options);
  }
  return server_config;
}
