const fs = require('fs');
const path = require('path');
const pluginTester = require('babel-plugin-tester').default;

const AutoI18nPlugin = require('../plugin/index');

const source = fs
  .readFileSync(path.join(__dirname, '../source.jsx'))
  .toString();

pluginTester({
  plugin: AutoI18nPlugin,
  pluginName: 'AutoI18nPlugin',
  pluginOptions: {
    output: '../locale',
  },
  babelOptions: {
    parserOpts: {
      sourceType: 'unambiguous',
      plugins: ['jsx'],
    },
  },
  tests: {
    demo1: {
      code: source,
      snapshot: true,
    },
  },
});
