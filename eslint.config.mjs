let ignore_style = false; // Set to true when editing other people's code

import eslint from '@eslint/js';
import plugin_stylistic from '@stylistic/eslint-plugin';
import plugin_html from 'eslint-plugin-html';
import plugin_import from 'eslint-plugin-import';
import plugin_node from 'eslint-plugin-n';
import tseslint from 'typescript-eslint';

export default [
  {
    name: 'global ignores',
    ignores: ['src/client/vendor/**'],
  },
  eslint.configs.recommended, // 'eslint:recommended',
  ...tseslint.configs.recommended, // 'plugin:@typescript-eslint/recommended'
  ...tseslint.configs.stylistic,
  {
    name: 'general',
    files: [
      '**/*.js',
      '**/*.mjs',
      '**/*.ts',
      '**/*.html',
    ],
    ignores: [],
    rules: {
      'n/global-require': 'error',
      'n/handle-callback-err': 'error',
      'n/hashbang': 'error',
      'n/no-deprecated-api': [
        'error', {
          ignoreModuleItems: ['fs.exists'],
        }
      ],
      'n/no-exports-assign': 'error',
      'n/no-extraneous-import': 'off', // JE: false positives, also requires loading dependencies
      'n/no-extraneous-require': 'off', // JE: false positives, also requires loading dependencies
      'n/no-missing-import': 'off',
      'n/no-missing-require': 'off', // JE: confused by file extensions, and glov modules
      'n/no-mixed-requires': 'error',
      'n/no-new-require': 'error',
      'n/no-path-concat': 'off', // JE
      'n/no-process-exit': 'off', // JE
      'n/no-restricted-require': 'error',
      'n/no-unpublished-bin': 'off', // JE: lots of false positives, also requires loading dependencies
      'n/no-unpublished-import': 'off', // JE: lots of false positives, also requires loading dependencies
      'n/no-unpublished-require': 'off', // JE: lots of false positives, also requires loading dependencies
      'n/no-unsupported-features/es-builtins': 'error',
      'n/no-unsupported-features/es-syntax': ['error', { ignores: [] }],
      'n/no-unsupported-features/node-builtins': 'off', // JE: fires on client files with any global name overlap
      'n/process-exit-as-throw': 'error',

      'import/no-dynamic-require': 'error',
      'import/order': [
        'error', {
          groups: [
            'builtin',
            ['external', 'internal'],
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          pathGroups: [{
            pattern: 'glov/**',
            group: 'internal',
          },{  // group type-only imports appropriately
            pattern: '+([-_a-z])',
            group: 'external',
          },{
            pattern: '+([-_a-z@])/+([-_a-z])',
            group: 'external',
          },{
            pattern: '../**',
            group: 'parent',
          },{
            pattern: './**',
            group: 'sibling',
          }],
          pathGroupsExcludedImportTypes: ['builtin'],
          warnOnUnassignedImports: true,
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],

      '@typescript-eslint/adjacent-overload-signatures': 'error',
      '@typescript-eslint/array-type': 'off', // JE: no way to get the rule consistent with use of Readonly<>
      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/ban-tslint-comment': 'error',
      '@typescript-eslint/class-literal-property-style': 'error',
      '@typescript-eslint/consistent-generic-constructors': 'error',
      '@typescript-eslint/consistent-indexed-object-style': 'error',
      '@typescript-eslint/consistent-type-assertions': 'error',
      '@typescript-eslint/consistent-type-definitions': 'off', // JE
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'no-array-constructor': 'off',
      '@typescript-eslint/no-array-constructor': 'error',
      '@typescript-eslint/no-confusing-non-null-assertion': 'error',
      'no-dupe-class-members': 'off',
      '@typescript-eslint/no-dupe-class-members': 'error',
      '@typescript-eslint/no-duplicate-enum-values': 'error',
      'no-empty-function': 'off',
      '@typescript-eslint/no-empty-function': 'error',
      '@typescript-eslint/no-empty-object-type': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-extra-non-null-assertion': 'error',
      '@typescript-eslint/no-inferrable-types': 'off', // JE
      '@typescript-eslint/no-invalid-this': 'error',
      '@typescript-eslint/no-misused-new': 'error',
      '@typescript-eslint/no-namespace': 'error',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'error',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-redeclare': 'error',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-shadow': ['error', {
        allow: ['next', 'done', 'err', 'pak']
      }],
      '@typescript-eslint/no-this-alias': 'off',
      '@typescript-eslint/no-unnecessary-type-constraint': 'error',
      '@typescript-eslint/no-unsafe-declaration-merging': 'error',
      '@typescript-eslint/no-unsafe-function-type': 'error',
      'no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-expressions': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        args: 'none',
        caughtErrors: 'none',
      }],
      '@typescript-eslint/no-use-before-define': ['error', {
        classes: true,
        functions: true,
        variables: true,
      }],
      '@typescript-eslint/no-useless-constructor': 'error',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-wrapper-object-types': 'error',
      '@typescript-eslint/prefer-as-const': 'error',
      '@typescript-eslint/prefer-for-of': 'off', // JE: polyfills terribly
      '@typescript-eslint/prefer-function-type': 'error',
      '@typescript-eslint/prefer-namespace-keyword': 'error',
      '@typescript-eslint/triple-slash-reference': 'error',

      '@stylistic/array-bracket-newline': ['error', 'consistent'], // JE
      '@stylistic/array-bracket-spacing': ignore_style ? 'off' : [
        'error',
        'never'
      ],
      '@stylistic/array-element-newline': 'off',
      '@stylistic/arrow-parens': [
        'error',
        'always'
      ],
      '@stylistic/arrow-spacing': ignore_style ? 'off' : [
        'error',
        {
          'before': true,
          'after': true
        }
      ],
      '@stylistic/block-spacing': 'error',
      '@stylistic/brace-style': ignore_style ? 'off' : [
        'error',
        '1tbs',
        {
          'allowSingleLine': false
        }
      ],
      '@stylistic/comma-dangle': [
        'error',
        'only-multiline'
      ],
      '@stylistic/comma-spacing': 'off', // JE
      '@stylistic/comma-style': [
        'error',
        'last'
      ],
      '@stylistic/computed-property-spacing': [
        'error',
        'never'
      ],
      '@stylistic/dot-location': [
        'error',
        'property'
      ],
      '@stylistic/eol-last': ignore_style ? 'off' : 'error',
      '@stylistic/func-call-spacing': 'error',
      '@stylistic/function-call-spacing': 'error',
      '@stylistic/function-paren-newline': 'off', // JE
      '@stylistic/generator-star-spacing': 'error',
      '@stylistic/implicit-arrow-linebreak': [
        'error',
        'beside'
      ],
      '@stylistic/indent': [
        'error',
        2,
        {
          ArrayExpression: 'first', // default: 1
          CallExpression: {
            arguments: 1,
          },
          FunctionDeclaration: {
            parameters: 1,
            body: 1,
          },
          FunctionExpression: {
            parameters: 1,
            body: 1,
          },
          StaticBlock: {
            body: 1,
          },
          MemberExpression: 'off', // default: 1
          ObjectExpression: 1,
          SwitchCase: 1,
          VariableDeclarator: 1,
          outerIIFEBody: 1,
          flatTernaryExpressions: true, // default: false
          offsetTernaryExpressions: false,
          offsetTernaryExpressionsOffsetCallExpressions: true,
          ignoreComments: false,
          ImportDeclaration: 1,
          ignoredNodes: [
            // JE: ignore inconsistent application to ternaries in object properties / function parameters:
            'ObjectExpression > Property > ConditionalExpression',
            'CallExpression > ConditionalExpression',
            // JE: ignore inconsistent application to multi-line type literal return types on functions
            'FunctionDeclaration > TSTypeAnnotation > TSTypeLiteral',
            // JE: ignore inconsistent application when wrapping after a => on a type declaration; example:
            // type Foo = (a: string) =>
            //   (b: string) => string;
            'TSTypeAliasDeclaration > TSFunctionType > TSTypeAnnotation > TSFunctionType',
            // JE: ignore inconsistent application when wrapping after a : on a type declaration; example:
            // const FOO:
            //   string;
            'VariableDeclaration > VariableDeclarator > Identifier > TSTypeAnnotation',
          ],
        }
      ],
      '@stylistic/jsx-quotes': 'error',
      '@stylistic/key-spacing': ignore_style ? 'off' : [
        'error',
        {
          'mode': 'strict'
        }
      ],
      '@stylistic/keyword-spacing': [
        'error',
        {
          'after': true,
          'before': true
        }
      ],
      '@stylistic/line-comment-position': 'off',
      '@stylistic/linebreak-style': [
        'error',
        'unix'
      ],
      '@stylistic/lines-around-comment': 'off', // JE
      '@stylistic/lines-between-class-members': 'off', // JE
      '@stylistic/max-len': [
        'error',
        {
          'code': 120,
          'ignorePattern': '^// Flags:',
          'ignoreRegExpLiterals': true,
          'ignoreUrls': true,
          'tabWidth': 2
        }
      ],
      '@stylistic/max-statements-per-line': ignore_style ? 'off' : 'error',
      '@stylistic/member-delimiter-style': 'error',
      '@stylistic/multiline-comment-style': 'off', // JE
      '@stylistic/multiline-ternary': 'off',
      '@stylistic/new-parens': 'error',
      '@stylistic/newline-per-chained-call': 'off',
      '@stylistic/no-confusing-arrow': 'error',
      '@stylistic/no-extra-parens': ignore_style ? 'off' : [
        'error',
        'functions', // JE: Complains about useful parens for readability
      ],
      '@stylistic/no-extra-semi': 'error',
      '@stylistic/no-floating-decimal': 'error',
      '@stylistic/no-mixed-operators': [
        'error',
        {
          'groups': [
            ['+', '-', '|', '||'],
            ['*', '/', '&', '&&', '^', '<<', '>>', '>>>'],
            ['==', '!=', '===', '!==', '>', '>=', '<', '<='],
          ],
          'allowSamePrecedence': true,
        }
      ],
      '@stylistic/no-mixed-spaces-and-tabs': 'error',
      '@stylistic/no-multi-spaces': [
        'error',
        {
          'ignoreEOLComments': true
        }
      ],
      '@stylistic/no-multiple-empty-lines': [
        'error',
        {
          'max': 2,
          'maxEOF': 0,
          'maxBOF': 1
        }
      ],
      '@stylistic/no-tabs': 'error',
      '@stylistic/no-trailing-spaces': 'error',
      '@stylistic/no-whitespace-before-property': 'error',
      '@stylistic/nonblock-statement-body-position': 'error',
      '@stylistic/object-curly-newline': 'error',
      '@stylistic/object-curly-spacing': ignore_style ? 'off' : [
        'error',
        'always'
      ],
      '@stylistic/one-var-declaration-per-line': 'error',
      '@stylistic/operator-linebreak': [
        'error',
        'after',
        // { 'overrides': { '?': 'ignore', ':': 'ignore' } }
      ],
      '@stylistic/padded-blocks': 'off',
      '@stylistic/padding-line-between-statements': 'error',
      '@stylistic/quote-props': 'off', // JE
      '@stylistic/quotes': [
        'error',
        'single',
        {
          avoidEscape: true,
        }
      ],
      '@stylistic/rest-spread-spacing': 'error',
      '@stylistic/semi': 'error',
      '@stylistic/semi-spacing': 'error',
      '@stylistic/semi-style': [
        'error',
        'last'
      ],
      '@stylistic/space-before-blocks': [
        'error',
        'always'
      ],
      '@stylistic/space-before-function-paren': [
        'error',
        {
          'anonymous': 'always',
          'named': 'never',
          'asyncArrow': 'always'
        }
      ],
      '@stylistic/space-in-parens': [
        'error',
        'never'
      ],
      '@stylistic/space-infix-ops': 'off', // JE
      '@stylistic/space-unary-ops': 'error',
      '@stylistic/spaced-comment': 'off', // JE
      '@stylistic/switch-colon-spacing': 'error',
      '@stylistic/template-curly-spacing': [
        'error',
        'never'
      ],
      '@stylistic/template-tag-spacing': 'error',
      '@stylistic/wrap-iife': 'error',
      '@stylistic/wrap-regex': 'error',
      '@stylistic/yield-star-spacing': 'error',

      'accessor-pairs': 'error',
      'array-callback-return': 'error',
      'arrow-body-style': 'off', // JE
      'block-scoped-var': 'error',
      'callback-return': 'off', // JE
      'camelcase': 'off',
      'capitalized-comments': 'off',
      'class-methods-use-this': 'off', // JG
      'complexity': 'off',
      'consistent-this': 'off', // JE
      'constructor-super': 'error',
      'curly': 'error',
      'default-case': 'error',
      'dot-notation': 'error',
      'eqeqeq': [
        'error',
        'smart'
      ],
      'for-direction': 'error',
      'func-name-matching': 'error',
      'func-names': 'off', // JE
      'func-style': [
        'error',
        'declaration',
        {
          'allowArrowFunctions': true
        }
      ],
      'getter-return': 'error',
      'guard-for-in': 'off',
      'id-denylist': 'error',
      'id-length': 'off',
      'id-match': [
        'error',
        '^([a-z]+([A-Z][a-z]+))*|([a-z]([a-z_]*[a-z])?)$',
      ],
      'indent-legacy': 'off',
      'init-declarations': 'off', //['error', 'always'],
      'max-classes-per-file': 'off', // JE
      'max-depth': 'off', // JE
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      'max-nested-callbacks': 'error',
      'max-params': 'off',
      'max-statements': 'off',
      'new-cap': 'error',
      'newline-after-var': 'off',
      'newline-before-return': 'off',
      'no-alert': 'error',
      'no-async-promise-executor': 'error',
      'no-await-in-loop': 'error',
      'no-bitwise': 'off', // JE
      'no-caller': 'error',
      'no-case-declarations': 'error',
      'no-class-assign': 'error',
      'no-compare-neg-zero': 'error',
      'no-cond-assign': 'error',
      'no-console': 'off', // JE
      'no-const-assign': 'error',
      'no-constant-binary-expression': 'error',
      'no-constant-condition': 'off', // JE
      'no-constructor-return': 'error', // JE
      'no-continue': 'off', // JE
      'no-control-regex': 'error',
      'no-debugger': 'error',
      'no-delete-var': 'error',
      'no-div-regex': 'error',
      'no-dupe-args': 'error',
      'no-dupe-else-if': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-duplicate-imports': 'error',
      'no-else-return': 'off', // JE
      'no-empty': 'error',
      'no-empty-character-class': 'error',
      'no-empty-pattern': 'error',
      'no-empty-static-block': 'error',
      'no-eq-null': 'error',
      'no-eval': 'error',
      'no-ex-assign': 'error',
      'no-extend-native': 'error',
      'no-extra-bind': 'error',
      'no-extra-boolean-cast': 'error',
      'no-extra-label': 'error',
      'no-fallthrough': 'error',
      'no-func-assign': 'error',
      'no-global-assign': 'error',
      'no-implicit-coercion': 'error',
      'no-implicit-globals': 'error',
      'no-implied-eval': 'error',
      'no-import-assign': 'error',
      'no-inline-comments': 'off',
      'no-inner-declarations': 'off', // galaxygen
      'no-invalid-regexp': 'error',
      'no-irregular-whitespace': 'error',
      'no-iterator': 'error',
      'no-label-var': 'error',
      'no-labels': 'error',
      'no-lone-blocks': 'error',
      'no-lonely-if': 'off', // JE
      'no-loop-func': 'error',
      'no-loss-of-precision': 'error',
      'no-magic-numbers': 'off',
      'no-misleading-character-class': 'error',
      'no-multi-assign': 'off', // JE
      'no-multi-str': 'error',
      'no-negated-condition': 'off', // JE: Makes nested ternaries more readable
      'no-nested-ternary': 'off', // JE
      'no-new': 'error',
      'no-new-func': 'error',
      'no-new-native-nonconstructor': 'error',
      'no-new-wrappers': 'error',
      'no-nonoctal-decimal-escape': 'error',
      'no-obj-calls': 'error',
      'no-object-constructor': 'error',
      'no-octal': 'error',
      'no-octal-escape': 'error',
      'no-param-reassign': 'off',
      'no-plusplus': 'off', // JE
      'no-process-env': 'off', // JE
      'no-process-exit': 'off', // JE
      'no-proto': 'error',
      'no-prototype-builtins': 'error',
      'no-redeclare': 'off', // replaced by @typescript-eslint/no-redeclare
      'no-regex-spaces': 'error',
      'no-restricted-globals': 'error',
      'no-restricted-imports': 'error',
      'no-restricted-properties': 'error',
      'no-return-assign': 'error',
      'no-script-url': 'error',
      'no-self-assign': 'error',
      'no-self-compare': 'error',
      'no-sequences': 'error',
      'no-setter-return': 'error',
      'no-shadow-restricted-names': 'error',
      'no-sparse-arrays': 'error',
      'no-sync': 'off', // JE
      'no-template-curly-in-string': 'error',
      'no-ternary': 'off', // JE
      'no-this-before-super': 'error',
      'no-throw-literal': 'error',
      'no-undef': [
        'error',
        {
          'typeof': true
        }
      ],
      'no-undef-init': 'error',
      'no-undefined': 'off',
      'no-underscore-dangle': [
        'error',
        {
          'allowAfterThis': true,
          'enforceInMethodNames': false,
        }
      ],
      'no-unexpected-multiline': 'error',
      'no-unmodified-loop-condition': 'error',
      'no-unneeded-ternary': 'error',
      'no-unreachable': 'error',
      'no-unsafe-finally': 'error',
      'no-unsafe-negation': 'error',
      'no-unsafe-optional-chaining': 'error',
      'no-unused-labels': 'error',
      'no-unused-private-class-members': 'error',
      'no-useless-backreference': 'error',
      'no-useless-call': 'error',
      'no-useless-catch': 'error',
      'no-useless-computed-key': 'error',
      'no-useless-concat': 'error',
      'no-useless-escape': 'error',
      'no-useless-rename': 'error',
      'no-useless-return': 'error',
      'no-var': 'error',
      'no-void': 'off',
      'no-warning-comments': 'off', // JE: Allow TODO:
      'no-with': 'error',
      'object-shorthand': 'off',
      'one-var': [
        'error', {
          'var': 'never',
          'let': 'never',
          'const': 'never',
          'separateRequires': true,
        }
      ],
      'operator-assignment': 'error',
      'prefer-arrow-callback': 'off',
      'prefer-const': 'off', // JE
      'prefer-destructuring': 'off',
      'prefer-numeric-literals': 'error',
      'prefer-object-spread': 'error',
      'prefer-promise-reject-errors': 'error',
      'prefer-reflect': 'off', // JE
      'prefer-rest-params': 'error',
      'prefer-spread': 'off',
      'prefer-template': ignore_style ? 'off' : 'error',
      'radix': 'error',
      'require-atomic-updates': 'error',
      'require-await': 'error',
      'require-jsdoc': 'off',
      'require-unicode-regexp': 'off', // JE: Hasn't caught anything useful, generates bigger code
      'require-yield': 'error',
      'sort-imports': [
        'error', {
          ignoreCase: true,
          ignoreDeclarationSort: true,
          ignoreMemberSort: false,
        }
      ],
      'sort-keys': 'off',
      'sort-vars': 'off', // JE
      'strict': 'error',
      'symbol-description': 'error',
      'unicode-bom': [
        'error',
        'never'
      ],
      'use-isnan': 'error',
      // 'valid-jsdoc': 'error', // deprecated, use eslint-plugin-jsdoc if really desired
      'valid-typeof': 'error',
      'vars-on-top': 'off', // JE
      'yoda': [
        'error',
        'never'
      ],

    },
    plugins: {
      //'@typescript-eslint': tseslint.plugin, -- handled above
      html: plugin_html,
      import: plugin_import,
      '@stylistic': plugin_stylistic,
      n: plugin_node,
    },
    settings: {
      node: {
        version: '>=22.12.0 <24.0.0', // also in package.json
      },
    },

    languageOptions: {
      // parser: require('@typescript-eslint/parser'), -- handled above
      sourceType: 'module',
      ecmaVersion: 2020,
      globals: {
        // General globals on Node.js and browsers
        __dirname: 'readonly',
        __filename: 'readonly',
        atob: 'readonly',
        Blob: 'readonly',
        btoa: 'readonly',
        Buffer: 'readonly',
        clearImmediate: 'readonly',
        clearInterval: 'readonly',
        clearTimeout: 'readonly',
        console: 'readonly',
        exports: 'writable',
        // fetch: 'readonly',
        global: 'readonly',
        module: 'readonly',
        // navigator: 'readonly',
        performance: 'readonly',
        process: 'readonly',
        require: 'readonly',
        setImmediate: 'readonly',
        setInterval: 'readonly',
        setTimeout: 'readonly',
        WebSocket: 'readonly',
        Array: 'readonly',
        ArrayBuffer: 'readonly',
        BigInt: 'readonly',
        BigInt64Array: 'readonly',
        BigUint64Array: 'readonly',
        Boolean: 'readonly',
        DataView: 'readonly',
        Date: 'readonly',
        decodeURI: 'readonly',
        decodeURIComponent: 'readonly',
        encodeURI: 'readonly',
        encodeURIComponent: 'readonly',
        escape: 'readonly',
        eval: 'readonly',
        Float32Array: 'readonly',
        Float64Array: 'readonly',
        Function: 'readonly',
        globalThis: 'readonly',
        Infinity: 'readonly',
        Int16Array: 'readonly',
        Int32Array: 'readonly',
        Int8Array: 'readonly',
        Intl: 'readonly',
        isFinite: 'readonly',
        isNaN: 'readonly',
        JSON: 'readonly',
        // Map: 'readonly',
        Math: 'readonly',
        NaN: 'readonly',
        Number: 'readonly',
        Object: 'readonly',
        parseFloat: 'readonly',
        parseInt: 'readonly',
        Promise: 'readonly',
        Proxy: 'readonly',
        RegExp: 'readonly',
        SharedArrayBuffer: 'readonly',
        String: 'readonly',
        Symbol: 'readonly',
        SyntaxError: 'readonly',
        TypeError: 'readonly',
        Uint16Array: 'readonly',
        Uint32Array: 'readonly',
        Uint8Array: 'readonly',
        Uint8ClampedArray: 'readonly',
        URL: 'readonly',
        undefined: 'readonly',
        unescape: 'readonly',
        WebGLRenderingContext: 'readonly',
        WebGL2RenderingContext: 'readonly',

        // Just the super-common browser ones, don't mask undefined variables named 'status', etc
        window: 'readonly',
        document: 'readonly',
        Image: 'readonly',
        FileReader: 'readonly',
        // Our engine globals
        gl: 'readonly',
        Z: 'readonly',
        profilerStart: 'readonly',
        profilerStartFunc: 'readonly',
        profilerStop: 'readonly',
        profilerStopFunc: 'readonly',
        profilerStopStart: 'readonly',
        // Our pre-processor defines
        BUILD_TIMESTAMP: 'readonly',
        __funcname: 'readonly',
        // For Node types
        NodeJS: 'readonly',
        // Our global types
        Constructor: 'readonly',
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
      reportUnusedInlineConfigs: 'off',
    },
  }, {
    name: 'client-specific',
    files: ['src/client/**', 'src/common/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          'selector': 'ForOfStatement',
          'message': 'Use a different loop or method instead of for...of, it polyfills very poorly.'
        }
      ],
    },
  }, {
    name: 'js-specific',
    // Enable rules specifically for JavaScript files
    files: ['**/*.js', '**/*.mjs'],
    rules: {
      'consistent-return': [
        'error',
        {
          'treatUndefinedAsUnspecified': true,
        }
      ],
    }
  }, {
    name: 'ts-specific',
    // Enable rules specifically for TypeScript files
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': [
        'error', {
          'allowExpressions': true,
        }
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      // TODO: resolve issues on existing files, or disable, enforce this going forward:
      // '@typescript-eslint/naming-convention': [
      //   'error',
      //   // exceptions
      //   {
      //     selector: ['property'],
      //     format: ['snake_case'],
      //     leadingUnderscore: 'allow',
      //     trailingUnderscore: 'forbid',
      //     filter: {
      //       regex: '^_opaque$',
      //       match: true,
      //     },
      //   },
      //   // function parameters, variables: strictly snake_case
      //   {
      //     selector: ['default', 'parameter', 'parameterProperty', 'variable'],
      //     format: ['snake_case'],
      //     leadingUnderscore: 'forbid',
      //     trailingUnderscore: 'forbid',
      //   },
      //   // variables: unless const, then UPPER_CASE
      //   {
      //     selector: ['variable'],
      //     format: ['snake_case', 'UPPER_CASE'],
      //     modifiers: ['const'],
      //     leadingUnderscore: 'forbid',
      //     trailingUnderscore: 'forbid',
      //   },
      //   // properties, same as variables, but cannot tell if they're 'const', so allow both
      //   {
      //     selector: ['property'],
      //     format: ['snake_case', 'UPPER_CASE'],
      //     leadingUnderscore: 'forbid',
      //     trailingUnderscore: 'forbid',
      //   },
      //   {
      //     selector: ['function', 'method', 'classMethod', 'typeMethod'],
      //     format: ['camelCase'],
      //     leadingUnderscore: 'forbid',
      //     trailingUnderscore: 'forbid',
      //   },
      //   {
      //     selector: ['enumMember'],
      //     format: ['PascalCase', 'UPPER_CASE'],
      //     leadingUnderscore: 'forbid',
      //     trailingUnderscore: 'forbid',
      //   },
      //   {
      //     selector: ['class', 'enum', 'interface', 'typeAlias', 'typeParameter'],
      //     format: ['PascalCase'],
      //     leadingUnderscore: 'forbid',
      //     trailingUnderscore: 'forbid',
      //   },
      //   {
      //     selector: ['objectLiteralMethod'],
      //     format: ['snake_case', 'camelCase'],
      //     leadingUnderscore: 'forbid',
      //     trailingUnderscore: 'forbid',
      //   },
      // ],
    },
  }
];
