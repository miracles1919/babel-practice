const { transformFileSync } = require('@babel/core');
const path = require('path');
const AutoDocPlugin = require('./plugin');

const { code } = transformFileSync(path.join(__dirname, './source.ts'), {
  parserOpts: {
    sourceType: 'unambiguous',
    plugins: ['typescript'],
  },
  plugins: [
    [
      AutoDocPlugin,
      {
        output: '../doc',
        title: 'demo2',
        format: 'md'
      },
    ],
  ],
});

// console.log(code);
