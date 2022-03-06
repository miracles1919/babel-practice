const { transformFileSync } = require('@babel/core');
const path = require('path');
const AutoDocPlugin = require('./plugin');

const { code } = transformFileSync(path.join(__dirname, './source.js'), {
  parserOpts: {
    sourceType: 'unambiguous',
  },
  plugins: [
    [
      AutoDocPlugin,
      {
        output: '../doc',
        title: 'demo1',
        format: 'md'
      },
    ],
  ],
});

// console.log(code);
