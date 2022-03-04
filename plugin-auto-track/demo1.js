const { transformFileSync } = require('@babel/core');
const path = require('path');
const AutoTrackPlugin = require('./plugin');

const { code } = transformFileSync(path.join(__dirname, './source.jsx'), {
  parserOpts: {
    sourceType: 'unambiguous',
    plugins: ['jsx'],
  },
  plugins: [
    [
      AutoTrackPlugin,
      {
        alias: '@/track-sdk',
      },
    ],
  ],
});

console.log(code);
