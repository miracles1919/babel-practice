const { transformSync } = require('@babel/core');
const path = require('path');
const TransformArrowFunctions = require('./plugin');

const sourceCode = `
  const func = () => {
    console.log(111)
    console.log(this)
  }
`;

const { code } = transformSync(sourceCode, {
  parserOpts: {
    sourceType: 'unambiguous',
  },
  plugins: [TransformArrowFunctions],
});

console.log(code);
