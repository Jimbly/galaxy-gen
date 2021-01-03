// TODO:
//   Maybe we don't use browserify/watchify on app or worker code, but just the simple glov/require system and concat?

/* eslint no-invalid-this:off */
const args = require('yargs').argv;
const assert = require('assert');
const babel = require('gulp-babel');
const babelify = require('babelify');
const browser_sync = require('browser-sync');
const browserify = require('browserify');
const chalk = require('chalk');
const clean = require('gulp-clean');
const concat = require('gulp-concat');
const console_api = require('console-api');
const eslint = require('gulp-eslint');
const fs = require('fs');
const gulp = require('gulp');
const gulpif = require('gulp-if');
const ifdef = require('gulp-ifdef');
const ignore = require('gulp-ignore');
const json5 = require('./gulp/json5.js');
const JSON5 = require('json5');
const lazypipe = require('lazypipe');
const ll = require('./gulp/ll.js');
const log = require('fancy-log');
const newer = require('gulp-newer');
const nodemon = require('gulp-nodemon');
const rename = require('gulp-rename');
const replace = require('gulp-replace');
const sourcemaps = require('gulp-sourcemaps');
const taskLog = require('./gulp/task-log.js');
const through = require('through2');
const uglify = require('@jimbly/gulp-uglify');
const useref = require('gulp-useref');
const vinyl_buffer = require('vinyl-buffer');
const vinyl_source_stream = require('vinyl-source-stream');
const warn_match = require('./gulp/warn-match.js');
const watch = require('./gulp/watch.js');
const watchify = require('watchify');
const web_compress = require('gulp-web-compress');
const webfs = require('./gulp/webfs_build.js');
const zip = require('gulp-zip');

if (fs.readFileSync(__filename, 'utf8').indexOf('\r\n') !== -1) {
  // CRLF Line endings currently break gulp-ifdef, mess up with git diff/log/blame, and
  //   cause unnecessary diffs when pushing builds to production servers.
  console.error('ERROR: Windows line endings detected');
  console.error('Check your git config and make sure core.autocrlf is false:\n' +
    '  git config --get core.autocrlf\n' +
    '  git config --global --add core.autocrlf false\n' +
    '    (or --local if you want it on for other projects)');
  // eslint-disable-next-line no-throw-literal
  process.exit(-1);
}

function prettyInterface() {
  console_api.setPalette(console_api.palettes.desaturated);
  let project_name = 'glov';
  try {
    let pkg = JSON5.parse(fs.readFileSync('./package.json', 'utf8'));
    if (pkg && pkg.name) {
      project_name = pkg.name;
    }
  } catch (e) {
    // ignored, use default
  }
  console_api.setTitle(args.title || `gulp ${__filename} | ${project_name}`);
}
prettyInterface();

ll.tasks(['eslint']);

if (args.ll === false && !args.noserial) {
  // With --no-ll, absolutely no parallelism, for profiling
  gulp.reallyparallel = gulp.series;
} else {
  gulp.reallyparallel = gulp.parallel;
}
if (!args.noserial) {
  // Since this process is primarily parsing/CPU-bound, using gulp.parallel only confuses
  //   the output without any speed increase (possibly speed decrease)
  gulp.parallel = gulp.series;
}

const is_prod = args.prod;

//////////////////////////////////////////////////////////////////////////
// Server tasks
const config = {
  server_js_files: ['src/**/*.js', '!src/client/**/*.js'],
  server_static: ['src/**/common/words/*.gkg'],
  all_js_files: ['src/**/*.js', '!src/client/vendor/**/*.js'],
  client_js_files: ['src/**/*.js', '!src/server/**/*.js', '!src/client/vendor/**/*.js'],
  client_json_files: ['src/client/**/*.json', '!src/client/vendor/**/*.json'],
  server_json_files: ['src/server/**/*.json'],
  client_html: ['src/client/**/*.html'],
  client_html_index: ['src/client/**/index.html'],
  client_css: ['src/client/**/*.css', '!src/client/sounds/Bfxr/**'],
  client_static: [
    'src/client/**/*.webm',
    'src/client/**/*.mp3',
    'src/client/**/*.wav',
    'src/client/**/*.ogg',
    'src/client/**/*.png',
    'src/client/**/*.jpg',
    'src/client/**/*.glb',
    'src/client/**/*.ico',
    'src/client/**/*.gif',
    '!**/unused/**',
    '!src/client/sounds/Bfxr/**',
    // 'src/client/**/vendor/**',
    // 'src/client/manifest.json',
  ],
  client_vendor: ['src/client/**/vendor/**'],
  compress_files: [
    'client/**/*.js',
    'client/**/*.html',
    'client/**/*.css',
    'client/**/*.glb',
    'client/**/manifest.json',
  ],
  client_fsdata: [
    'src/client/autogen/**',
    'src/client/shaders/**',
    'src/client/glov/shaders/**',
    'src/client/glov/models/box_textured_embed.glb',
    'src/client/glov/words/*.txt',
    'src/common/words/*.gkg',
    '!src/client/autogen/placeholder.txt',
    '!src/client/autogen/*.js',
  ],
};

// Currently, do no significant minification to make debugging easier, better error reports
// But, at least keep function names to get good callstacks
// TODO: One, global-scoped uglify pass on bundled file just for prod builds?
const uglify_options = { compress: false, keep_fnames: true, mangle: false };
// Different options for external (node_modules / deps.js):
const uglify_options_ext = { compress: true, keep_fnames: false, mangle: true };

// if (args.debug) {
//   const node_inspector = require('gulp-node-inspector'); // eslint-disable-line global-require
//   gulp.task('inspect', function () {
//     gulp.src([]).pipe(node_inspector({
//       debugPort: 5858,
//       webHost: '0.0.0.0',
//       webPort: '8080',
//       preload: false
//     }));
//   });
// }

gulp.task('server_static', function () {
  return gulp.src(config.server_static)
    .pipe(newer('./dist/game/build.dev'))
    .pipe(gulp.dest('./dist/game/build.dev'));
});

function targetedStream(options, body) {
  let start = Date.now();
  let { label, obj, output, src } = options;
  if (typeof obj === 'function') { // Called as a task, not a 'change' event
    obj = null;
  }
  let stream = gulp.src(obj ? obj : src, { base: 'src/' });
  if (!obj) {
    // on startup only
    if (output) {
      stream = stream.pipe(newer(output));
      stream = stream.pipe(taskLog(`  ${label}`));
    }
  } else {
    label = `${label}:${obj.slice(4).replace(/\\/g, '/')}`;
    log(`Reprocessing '${chalk.cyan(`${label}`)}'...`);
  }
  stream = body(stream);
  if (output) {
    stream = stream.pipe(gulp.dest(output));
  }
  if (obj) {
    stream = stream.pipe(through.obj((file, enc, callback) => {
      callback(null, file);
    }, () => {
      log(`Reprocessed  '${chalk.cyan(`${label}`)}' in ${chalk.magenta(`${Date.now() - start} ms`)}`);
    }));
  }
  return stream;
}

function serverJS(obj) {
  return targetedStream({
    label: 'server_js',
    obj,
    output: './dist/game/build.dev',
    src: config.server_js_files,
  }, function (stream) {
    return stream.pipe(sourcemaps.init())
      .pipe(babel())
      .pipe(sourcemaps.write('.'));
  });
}
gulp.task('server_js', serverJS);

function eslintTask(obj) {
  // TODO: Cache results, on reprocess display all previous errors for all files (need to catch removed files?)
  return targetedStream({
    label: 'eslint',
    obj,
    src: ['src/**/*.js', '!src/client/vendor/**/*.js']
  }, function (stream) {
    return stream.pipe(eslint())
      .pipe(eslint.format());
  });
}

// This task runs in a parallel process
gulp.task('eslint', eslintTask);

//////////////////////////////////////////////////////////////////////////
// client tasks
const default_defines = {
  FACEBOOK: false,
  ENV: 'default',
};
gulp.task('client_html_default', function () {
  return gulp.src(config.client_html)
    .pipe(useref({}, lazypipe().pipe(sourcemaps.init, { loadMaps: true })))
    .on('error', log.error.bind(log, 'client_html Error'))
    .pipe(ifdef(default_defines, { extname: ['html'] }))
    .pipe(sourcemaps.write('./')) // writes .map file
    .pipe(gulp.dest('./dist/game/build.dev/client'));
});

const extra_index = [
  {
    name: 'multiplayer',
    defines: {
      FACEBOOK: false,
      ENV: 'multiplayer',
    },
    zip: false,
  },
];

let client_html_tasks = ['client_html_default'];
extra_index.forEach(function (elem) {
  let name = `client_html_${elem.name}`;
  client_html_tasks.push(name);
  gulp.task(name, function () {
    return gulp.src(config.client_html_index)
      //.pipe(useref({}, lazypipe().pipe(sourcemaps.init, { loadMaps: true })))
      .on('error', log.error.bind(log, 'client_html Error'))
      .pipe(ifdef(elem.defines, { extname: ['html'] }))
      .pipe(rename(`index_${elem.name}.html`))
      .pipe(replace(/<!-- build:js ([^.]+\.js) -->[^!]+<!-- endbuild -->/g, function (a, b) {
        // already bundled in client_html_default, just export filename reference
        return `<script src="${b}"></script>`;
      }))
      //.pipe(sourcemaps.write('./')) // writes .map file
      .pipe(gulp.dest('./dist/game/build.dev/client'));
  });
});

gulp.task('client_html', gulp.parallel(...client_html_tasks));

gulp.task('client_css', function () {
  return gulp.src(config.client_css)
    .pipe(gulp.dest('./dist/game/build.dev/client'))
    .pipe(browser_sync.reload({ stream: true }));
});

gulp.task('client_static', function () {
  return gulp.src(config.client_static)
    .pipe(newer('./dist/game/build.dev/client'))
    .pipe(gulp.dest('./dist/game/build.dev/client'));
});

gulp.task('client_fsdata', function () {
  return gulp.src(config.client_fsdata, { base: 'src/client', allowEmpty: true })
    .pipe(webfs())
    .pipe(gulp.dest('./dist/game/build.dev/client'));
});

gulp.task('build.prod.compress', function () {
  return gulp.src('dist/game/build.dev/**')
    .pipe(newer('./dist/game/build.prod'))
    .pipe(gulp.dest('./dist/game/build.prod'))
    // skipLarger so we don't end up with orphaned old compressed files
    .pipe(gulpif(config.compress_files, web_compress({ skipLarger: false })))
    .pipe(gulp.dest('./dist/game/build.prod'));
});
gulp.task('nop', function (next) {
  next();
});
let zip_tasks = [];
extra_index.forEach(function (elem) {
  if (!elem.zip) {
    return;
  }
  let name = `build.zip.${elem.name}`;
  zip_tasks.push(name);
  gulp.task(name, function () {
    return gulp.src('dist/game/build.dev/client/**')
      .pipe(ignore.exclude('index.html'))
      .pipe(ignore.exclude('*.map'))
      .pipe(gulpif(`index_${elem.name}.html`, rename('index.html')))
      .pipe(ignore.exclude('index_*.html'))
      .pipe(zip(`${elem.name}.zip`))
      .pipe(gulp.dest('./dist/game/build.prod/client'));
  });
});
if (!zip_tasks.length) {
  zip_tasks.push('nop');
}
gulp.task('build.zip', gulp.parallel(...zip_tasks));
gulp.task('build.prod.package', function () {
  return gulp.src('package*.json')
    .pipe(newer('./dist/game/build.prod'))
    .pipe(gulp.dest('./dist/game/build.prod'));
});
gulp.task('build.prod', gulp.parallel('build.prod.package', 'build.prod.compress', 'build.zip'));
gulp.task('build.prod.client', gulp.parallel('build.prod.compress', 'build.zip'));
gulp.task('build.prod.server', gulp.parallel('build.prod.compress'));


let client_js_deps = [];
client_js_deps.push('client_json');
client_js_deps.push('client_js_babel');
let client_js_watch_deps = client_js_deps.slice(0);

function bundleJS(filename, is_worker) {
  let bundle_name = filename.replace('.js', is_worker ? '.bundle.int.js' : '.bundle.js');
  let do_version = !is_worker;
  const browserify_opts = {
    entries: [
      `./dist/game/build.intermediate/client/${filename}`,
    ],
    cache: {}, // required for watchify
    packageCache: {}, // required for watchify
    debug: true,
    transform: [],
    bundleExternal: false,
  };

  let build_timestamp = Date.now();
  function buildTimestampReplace() {
    // Must be exactly 'BUILD_TIMESTAMP'.length (15) characters long
    let ret = `'${build_timestamp}'`;
    assert.equal(ret.length, 15);
    return ret;
  }
  function dobundle(b) {
    build_timestamp = Date.now();
    log(`Using BUILD_TIMESTAMP=${build_timestamp} for ${filename}`);
    // These only log anything useful on the first run, do not catch newly added dependencies:
    // let external_deps = {};
    // b.pipeline.get('deps').push(through2.obj(function (entry, enc, next) {
    //   console.log(entry.deps);
    //   for (let key in entry.deps) {
    //     if (key[0] !== '.') {
    //       external_deps[key] = true;
    //       entry.deps[key] = false;
    //     }
    //   }
    //   next(null, entry);
    // }, function (next) {
    //   console.log('External deps', external_deps);
    //   next();
    // }));
    // b.pipeline.get('emit-deps').push(through2.obj(function (entry, enc, next) {
    //   console.log(entry.file, entry.deps);
    //   next(null, entry);
    // }, function (next) {
    //   next();
    // }));
    let stream = b
      .bundle()
      // log errors if they happen
      .on('error', log.error.bind(log, 'Browserify Error'))
      .pipe(vinyl_source_stream(bundle_name))
      .pipe(vinyl_buffer())
      .pipe(sourcemaps.init({ loadMaps: true })); // loads map from browserify file
    if (do_version) {
      stream = stream.pipe(replace('BUILD_TIMESTAMP', buildTimestampReplace));
    }
    if (is_worker) {
      // Not as useful as old method of browserify hard-stop, but better than nothing?
      stream = stream.pipe(warn_match({
        'Worker requiring not_worker': /not_worker/,
      }));
    }
    stream = stream
      .pipe(sourcemaps.write(is_worker ? undefined : './')) // embeds or writes .map file
      .pipe(gulp.dest(is_worker ? './dist/game/build.intermediate/worker/' : './dist/game/build.dev/client/'));
    return stream;
  }

  function writeVersion(done) {
    let ver_filename = `${filename.slice(0, -3)}.ver.json`;
    fs.writeFile(`./dist/game/build.dev/client/${ver_filename}`, `{"ver":"${build_timestamp}"}`, done);
  }
  let version_task = `client_js_${filename}_version`;
  if (do_version) {
    gulp.task(version_task, writeVersion);
  }

  function registerTasks(b, is_watch) {
    let task_base = `client_js${is_watch ? '_watch' : ''}_${filename}`;
    b.on('log', log); // output build logs to terminal
    if (is_watch) {
      client_js_watch_deps.push(task_base);
    } else {
      client_js_deps.push(task_base);
    }
    gulp.task(`${task_base}_bundle`, function () {
      let ret = dobundle(b);
      if (is_watch) {
        ret = ret.pipe(browser_sync.stream({ once: true }));
      }
      return ret;
    });
    let task_list = [];
    task_list.push(`${task_base}_bundle`);
    if (do_version) {
      task_list.push(version_task);
    }
    gulp.task(task_base, gulp.series(...task_list));
  }
  const watched = watchify(browserify(browserify_opts));
  registerTasks(watched, true);
  // on any dep update, runs the bundler
  let on_update = [`client_js_watch_${filename}_bundle`];
  if (do_version) {
    on_update.push(writeVersion);
  }
  if (is_prod) {
    on_update.push('build.prod.client');
  }
  watched.on('update', gulp.series(...on_update));

  const nonwatched = browserify(browserify_opts);
  registerTasks(nonwatched, false);
}

function bundleDeps(filename, is_worker) {
  let bundle_name = filename.replace('.js', is_worker ? '.bundle.int.js' : '.bundle.js');
  const browserify_opts = {
    entries: [
      `./src/client/${filename}`,
    ],
    cache: {}, // required for watchify
    packageCache: {}, // required for watchify
    builtins: {
      // super-simple replacements, if needed
      assert: './src/client/shims/assert.js',
      buffer: './src/client/shims/buffer.js',
      not_worker: !is_worker && './src/client/shims/not_worker.js',
      // timers: './src/client/shims/timers.js',
      _process: './src/client/shims/empty.js',
    },
    debug: true,
    transform: [],
  };
  const babelify_opts = {
    global: true, // Required because some modules (e.g. dot-prop) have ES6 code in it
    // For some reason this is not getting picked up from .babelrc for modules!
    presets: [
      ['@babel/env', {
        'targets': {
          'ie': '10'
        },
        'loose': true,
      }]
    ],
  };

  function dobundle(b) {
    return b
      .bundle()
      // log errors if they happen
      .on('error', log.error.bind(log, 'Browserify Error'))
      .pipe(vinyl_source_stream(bundle_name))
      .pipe(vinyl_buffer())
      .pipe(sourcemaps.init({ loadMaps: true })) // loads map from browserify file
      .pipe(uglify(uglify_options_ext))
      .pipe(sourcemaps.write(is_worker ? undefined : './')) // embeds or writes .map file
      .pipe(gulp.dest(is_worker ? './dist/game/build.intermediate/worker/' : './dist/game/build.dev/client/'));
  }

  function registerTasks(b, is_watch) {
    let task_base = `client_js${is_watch ? '_watch' : ''}_${filename}`;
    b.transform(babelify, babelify_opts);
    b.on('log', log); // output build logs to terminal
    if (is_watch) {
      client_js_watch_deps.push(task_base);
    } else {
      client_js_deps.push(task_base);
    }
    gulp.task(task_base, function () {
      let ret = dobundle(b);
      if (is_watch) {
        ret = ret.pipe(browser_sync.stream({ once: true }));
      }
      return ret;
    });
  }
  const watched = watchify(browserify(browserify_opts));
  registerTasks(watched, true);
  // on any dep update, runs the bundler
  watched.on('update', gulp.series(`client_js_watch_${filename}`));

  const nonwatched = browserify(browserify_opts);
  registerTasks(nonwatched, false);
}

function registerBundle(entrypoint, deps, is_worker) {
  bundleJS(entrypoint, is_worker);
  if (deps) {
    bundleDeps(deps, is_worker);
  }
  // Just for workers, combine the deps and and entrypoint together (slower, but required)
  if (is_worker) {
    let task_name = `client_js_${entrypoint}_final`;
    client_js_deps.push(task_name);
    client_js_watch_deps.push(task_name);
    let src_files = [
      `./dist/game/build.intermediate/worker/${deps.replace('.js', '.bundle.int.js')}`,
      `./dist/game/build.intermediate/worker/${entrypoint.replace('.js', '.bundle.int.js')}`,
    ];
    gulp.task(task_name, function () {
      return gulp.src(src_files)
        .pipe(sourcemaps.init({ loadMaps: true }))
        .pipe(concat(entrypoint.replace('.js', '.bundle.js')))
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('./dist/game/build.dev/client/'));
    });
    let watch_task_name = `${task_name}_watch`;
    client_js_watch_deps.push(watch_task_name);
    gulp.task(watch_task_name, function (done) {
      gulp.watch(src_files, gulp.series(task_name));
      done();
    });
  }
}
registerBundle('app.js', 'app_deps.js', false);
registerBundle('worker.js', 'worker_deps.js', true);

function clientBabel(obj) {
  return targetedStream({
    label: 'client_js_babel',
    obj,
    output: './dist/game/build.intermediate',
    src: config.client_js_files,
  }, function (stream) {
    return stream
      .pipe(sourcemaps.init())
      .pipe(sourcemaps.identityMap())
      .pipe(babel({
        plugins: [
          // Note: Dependencies are not tracked from babel plugins, so use
          //   `webfs` instead of `static-fs` where possible
          ['static-fs', {}], // generates good code, but does not allow reloading/watchify
        ]
      }))
      .on('error', log.error.bind(log, 'Error'))
      // Remove extra Babel stuff that does not help anything
      .pipe(replace(/_classCallCheck\([^)]+\);\n|exports\.__esModule = true;|function _classCallCheck\((?:[^}]*\}){2}\n/g, ''))
      // Add filter that checks for "bad" transforms happening:
      .pipe(warn_match({
        'Spread constructor param': /isNativeReflectConstruct/,
        'Bad babel': /__esModule/,
      }))

      .pipe(uglify(uglify_options))
      .pipe(sourcemaps.write());
  });
}

gulp.task('client_js_babel', clientBabel);

gulp.task('client_json', function () {
  return gulp.src(config.client_json_files)
    .pipe(newer('./dist/game/build.intermediate/client'))
    // Minify, and convert from json5
    .pipe(json5({ beautify: false }))
    .pipe(gulp.dest('./dist/game/build.intermediate/client'));
});

gulp.task('server_json', function () {
  return gulp.src(config.server_json_files)
    .pipe(newer('./dist/game/build.dev/server'))
    // convert from json5, beautify
    .pipe(json5({ beautify: true }))
    .pipe(gulp.dest('./dist/game/build.dev/server'));
});

gulp.task('client_js', gulp.parallel(...client_js_deps));
gulp.task('client_js_watch', gulp.parallel(...client_js_watch_deps));

//////////////////////////////////////////////////////////////////////////
// Combined tasks

gulp.task('client_fsdata_wrap', gulp.series(
  'client_fsdata'));

const build_misc_nolint = [
  'server_static',
  'server_json',
  'server_js',
  'client_html',
  'client_css',
  'client_static',
  'client_fsdata_wrap',
];

if (args.nolint) {
  gulp.task('build_deps', gulp.parallel(...build_misc_nolint, 'client_js'));
  gulp.task('watch_deps', gulp.parallel(...build_misc_nolint, 'client_js_watch'));
} else {
  gulp.task('build_deps', gulp.reallyparallel('eslint', gulp.parallel(...build_misc_nolint, 'client_js')));
  gulp.task('watch_deps', gulp.reallyparallel('eslint', gulp.parallel(...build_misc_nolint, 'client_js_watch')));
}


gulp.task('build', gulp.series('build_deps', 'build.prod'));

gulp.task('bs-reload', (done) => {
  browser_sync.reload();
  done();
});

function watchStart(done) {
  function maybeProdSeries(prod_task, ...params) {
    if (is_prod) {
      if (params[params.length-1] === 'bs-reload') {
        return gulp.series(params.slice(0, -1), prod_task);
      }
      return gulp.series(...params, prod_task);
    } else {
      return gulp.series(...params);
    }
  }
  // Simple reprocessing that targets everything:
  gulp.watch(config.server_static, maybeProdSeries('build.prod.server', 'server_static')); // Maybe force server reload?
  gulp.watch(config.client_html, maybeProdSeries('build.prod.client', 'client_html', 'bs-reload'));
  gulp.watch(config.client_vendor, maybeProdSeries('build.prod.client', 'client_html', 'bs-reload'));
  gulp.watch(config.client_css, maybeProdSeries('build.prod.client', 'client_css'));
  gulp.watch(config.client_static, maybeProdSeries('build.prod.client', 'client_static'));
  gulp.watch(config.client_fsdata, maybeProdSeries('build.prod.client', 'client_fsdata'));
  gulp.watch(config.client_json_files, maybeProdSeries('build.prod.client', 'client_json'));
  gulp.watch(config.server_json_files, maybeProdSeries('build.prod.server', 'server_json'));
  if (is_prod) {
    gulp.watch('package*.json', gulp.series('build.prod.package'));
  }

  // More efficient reprocessing watchers that only look at the file that changed:
  if (!args.nolint) {
    gulp.watch(config.all_js_files).on('change', eslintTask);
  }
  gulp.watch(config.server_js_files).on('change', is_prod ? gulp.series(serverJS, 'build.prod.server') : serverJS);
  gulp.watch(config.client_js_files).on('change', clientBabel);

  done();
}

gulp.task('watch_start', watchStart);

if (is_prod) {
  gulp.task('watch', gulp.series('watch_deps', 'build.prod', 'watch_start'));
} else {
  gulp.task('watch', gulp.series('watch_deps', 'watch_start'));
}

const deps = ['watch'];
if (args.debug) {
  deps.push('inspect');
}

gulp.task('nodemon-start', (done) => {
  const options = {
    script: 'dist/game/build.dev/server/index.js',
    nodeArgs: ['--inspect'],
    args: ['--dev', '--master'],
    watch: ['dist/game/build.dev/server/', 'dist/game/build.dev/common'],
  };

  if (args.debug) {
    options.nodeArgs.push('--debug');
  }

  if (args.env) {
    options.args.push(`--env=${args.env}`);
  }

  if (args.port) {
    options.args.push(`--port=${args.port}`);
    assert.equal(options.nodeArgs[0], '--inspect');
    options.nodeArgs[0] = `--inspect=${9229 + Number(args.port) - 3000}`;
  }

  nodemon(options);
  done();
});

// Depending on "watch" not because that implicitly triggers this, but
// just to start up the watcher and reprocessor, and nodemon restarts
// based on its own logic below.
gulp.task('nodemon', gulp.series(...deps, 'nodemon-start'));

gulp.task('browser-sync-start', (done) => {
  // for more browser-sync config options: http://www.browsersync.io/docs/options/
  browser_sync({

    // informs browser-sync to proxy our expressjs app which would run at the following location
    proxy: {
      target: `http://localhost:${args.port || process.env.port || 3000}`,
      ws: true,
    },

    // informs browser-sync to use the following port for the proxied app
    // notice that the default port is 3000, which would clash with our expressjs
    port: 4000,

    // // open the proxied app in chrome
    // browser: ['google-chrome'],

    // don't sync clicks/scrolls/forms/etc
    ghostMode: false,
  });
  done();
});

gulp.task('browser-sync', gulp.series('nodemon', 'browser-sync-start'));

gulp.task('clean', function () {
  return gulp.src([
    'dist/game/build.dev',
    'dist/game/build.intermediate',
    'dist/game/build.prod',
    'src/client/autogen/*.*',
    '!src/client/autogen/placeholder.txt',
  ], { read: false, allowEmpty: true })
    .pipe(clean());
});
