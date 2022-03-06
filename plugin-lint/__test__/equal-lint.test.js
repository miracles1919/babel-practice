const fs = require('fs');
const path = require('path');
const pluginTester = require('babel-plugin-tester').default;

const EqualLint = require('../plugin/equal-lint');

const source = fs
  .readFileSync(path.join(__dirname, '../source/equal.js'))
  .toString();

pluginTester({
  plugin: EqualLint,
  pluginName: 'EqualLint',
  babelOptions: {
    parserOpts: {
      sourceType: 'unambiguous',
    },
  },
  tests: {
    default: {
      code: source,
      snapshot: true,
    },

    'auto fix': {
      code: source,
      snapshot: true,
      pluginOptions: {
        fix: true,
      },
    },
  },
});
