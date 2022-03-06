const { transformFileSync } = require('@babel/core');
const path = require('path');
const ForDirectionLint = require('./plugin/for-direction-lint');

const { code } = transformFileSync(
  path.join(__dirname, './source/for-direction.js'),
  {
    parserOpts: {
      sourceType: 'unambiguous',
    },
    plugins: [ForDirectionLint],
  }
);

