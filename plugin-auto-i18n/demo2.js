const { transformFileSync } = require('@babel/core');
const path = require('path');
const fs = require('fs');
const AutoI18nPlugin = require('./plugin/index2');

const { code } = transformFileSync(path.join(__dirname, './source2.jsx'), {
  parserOpts: {
    sourceType: 'unambiguous',
    plugins: ['jsx'],
  },
  plugins: [
    [
      AutoI18nPlugin,
      {
        output: '../locale/demo2',
      },
    ],
  ],
});

fs.writeFileSync(path.join(__dirname, './demo2-output.jsx'), code);

console.log(code);
