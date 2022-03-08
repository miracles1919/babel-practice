const fs = require('fs');
const path = require('path');
const pluginTester = require('babel-plugin-tester').default;

const PromiseAddCatchPlugin = require('../plugin/index');

const source = fs
  .readFileSync(path.join(__dirname, '../source2.js'))
  .toString();

pluginTester({
  plugin: PromiseAddCatchPlugin,
  pluginName: 'PromiseAddCatchPlugin',
  babelOptions: {
    parserOpts: {
      sourceType: 'unambiguous',
    },
  },
  tests: {
    'names': {
      code: source,
      snapshot: true,
      pluginOptions: {
        names: ['confirm'],
      },
    },
    catchTemplate: {
      code: source,
      snapshot: true,
      pluginOptions: {
        names: ['confirm', 'p'],
        catchTemplate: `console.log(err)`,
      },
    },
    disabledComments: {
      code: source,
      snapshot: true,
      pluginOptions: {
        names: ['confirm', 'p'],
        disabledComments: 'catch-disabled',
      },
    },
  },
});
