const { transformFileSync } = require('@babel/core');
const path = require('path');
const PromiseAddCatchPlugin = require('./plugin/demo');

const { code } = transformFileSync(path.join(__dirname, './source.js'), {
  parserOpts: {
    sourceType: 'unambiguous',
  },
  plugins: [[PromiseAddCatchPlugin]],
});

console.log(code);
