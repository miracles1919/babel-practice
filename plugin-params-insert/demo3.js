const { transformFileSync } = require('@babel/core');
const path = require('path');
const InsertParamsPlugin = require('./plugin');

const { code } = transformFileSync(path.join(__dirname, './source.jsx'), {
  parserOpts: {
    sourceType: 'unambiguous',
    plugins: ['jsx'],
  },
  plugins: [InsertParamsPlugin],
});

console.log(code);
