const { transformFileSync } = require('@babel/core');
const path = require('path');
const FuncAssignLint = require('./plugin/func-assign-lint');

const { code } = transformFileSync(
  path.join(__dirname, './source/func-assign.js'),
  {
    parserOpts: {
      sourceType: 'unambiguous',
    },
    plugins: [FuncAssignLint],
  }
);

