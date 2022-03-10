const { transformFileSync } = require('@babel/core');
const path = require('path');
const TransformArrowFunctions = require('./plugin');

const { code } = transformFileSync(path.resolve(__dirname, './source.js'), {
  parserOpts: {
    sourceType: 'unambiguous',
  },
  plugins: [TransformArrowFunctions],
});

console.log(code);
