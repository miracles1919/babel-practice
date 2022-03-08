const { transformFileSync } = require('@babel/core');
const path = require('path');
const PromiseAddCatchPlugin = require('./plugin');

const { code } = transformFileSync(path.join(__dirname, './source2.js'), {
  parserOpts: {
    sourceType: 'unambiguous',
  },
  plugins: [
    [
      PromiseAddCatchPlugin,
      {
        names: ['confirm', 'p'],
        catchTemplate: 'console.log(err)',
        disabledComments: 'catch-disabled'
      },
    ],
  ],
});

console.log(code);
