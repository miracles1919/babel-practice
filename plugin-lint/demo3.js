const { transformFileSync } = require('@babel/core');
const path = require('path');
const EqualLint = require('./plugin/equal-lint');

const { code } = transformFileSync(
  path.join(__dirname, './source/equal.js'),
  {
    parserOpts: {
      sourceType: 'unambiguous',
    },
    plugins: [[EqualLint, {
      fix: true
    }]],
  }
);

console.log(code)

