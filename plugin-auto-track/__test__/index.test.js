const fs = require('fs');
const path = require('path');
const pluginTester = require('babel-plugin-tester').default;

const AutoTrackPlugin = require('../plugin/index');

const source = fs.readFileSync(path.join(__dirname, '../source.jsx')).toString();
const source2 = fs.readFileSync(path.join(__dirname, '../source2.jsx')).toString();

pluginTester({
  plugin: AutoTrackPlugin,
  pluginName: 'AutoTrackPlugin',
  pluginOptions: {
    alias: '@/track-sdk',
  },
  babelOptions: {
    parserOpts: {
      sourceType: 'unambiguous',
      plugins: ['jsx'],
    },
  },
  tests: {
    'class component': {
      code: source,
      snapshot: true,
    },

    'function component': {
      code: source2,
      snapshot: true,
    },
  },
});
