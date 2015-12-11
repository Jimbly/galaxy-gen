/* globals deps */
require('./glov/require.js');

// Node built-in replacements
deps.assert = require('assert');
deps.buffer = require('buffer');
deps.not_worker = require('not_worker');
deps['dot-prop'] = require('dot-prop');
deps['gl-mat3/create'] = require('gl-mat3/create');
deps['gl-mat3/fromMat4'] = require('gl-mat3/fromMat4');
deps['gl-mat4/copy'] = require('gl-mat4/copy');
deps['gl-mat4/create'] = require('gl-mat4/create');
deps['gl-mat4/invert'] = require('gl-mat4/invert');
deps['gl-mat4/lookat'] = require('gl-mat4/lookat');
deps['gl-mat4/multiply'] = require('gl-mat4/multiply');
deps['gl-mat4/perspective'] = require('gl-mat4/perspective');
deps['gl-mat4/transpose'] = require('gl-mat4/transpose');
deps['@jimbly/howler/src/howler.core.js'] = require('@jimbly/howler/src/howler.core.js');
