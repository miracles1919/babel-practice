const { transformFileSync } = require('@babel/core');
const path = require('path');
const fs = require('fs');
const AutoI18nPlugin = require('./plugin');

const { code } = transformFileSync(path.join(__dirname, './source.jsx'), {
  parserOpts: {
    sourceType: 'unambiguous',
    plugins: ['jsx'],
  },
  plugins: [
    [
      AutoI18nPlugin,
      {
        output: '../locale',
      },
    ],
  ],
});

fs.writeFileSync(path.join(__dirname, './demo1-output.jsx'), code);

console.log(code);
