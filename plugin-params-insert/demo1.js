const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const types = require('@babel/types');

const sourceCode = `
  console.log('hello world')

  function fun() {
    console.log('foo')
  }

  export default class App {

    say() {
      console.log('what');
    }

    render() {
      return <div onClick={() => console.log('click')}>app</div>
    }
  }

`;

const ast = parser.parse(sourceCode, {
  sourceType: 'unambiguous',
  plugins: ['jsx'],
});

traverse(ast, {
  CallExpression(path, state) {
    const calleeName = generate(path.node.callee).code;

    if (calleeName === 'console.log') {
      // 等同于 types.isMemberExpression(path.node.callee) && path.node.callee.object.name === 'console';
      const { line, column } = path.node.loc.start;
      path.node.arguments.push(
        types.stringLiteral(`(line: ${line}, column: ${column})`)
      );
    }
  },
});

const { code } = generate(ast);

console.log(code);
