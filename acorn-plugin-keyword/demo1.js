const { Parser } = require('acorn');
const keyWordPlugin = require('./plugin');

const MyParser = Parser.extend(keyWordPlugin);

const ast = MyParser.parse(`
  miracles
  const a = 1
`);

console.log(ast);
