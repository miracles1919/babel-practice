const fs = require('fs');
const path = require('path');
const pluginTester = require('babel-plugin-tester').default;

const PluginTransformArrowFunctions = require('../plugin');

const source = fs.readFileSync(path.join(__dirname, '../source.js')).toString();

pluginTester({
  plugin: PluginTransformArrowFunctions,
  pluginName: 'PluginTransformArrowFunctions',
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
  },
});
