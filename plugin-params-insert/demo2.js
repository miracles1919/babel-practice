const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const template = require('@babel/template');
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
      return (
        <>
          <div onClick={() => console.log('click')}>app</div>
          <div>{console.log('jsx')}</div>
        </>
        
      )
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

    if (path.node.isNew) return;

    if (calleeName === 'console.log') {
      const { line, column } = path.node.loc.start;

      const node = template.expression(
        `console.log("line: ${line}, column: ${column}")`
      )();

      node.isNew = true;

      if (path.findParent((path) => path.isArrowFunctionExpression())) {
        const blockNode = types.blockStatement([
          types.expressionStatement(node),
          types.expressionStatement(path.node),
        ]);
        path.replaceWith(blockNode);
        path.skip();
      } else if (path.findParent((path) => path.isJSXExpressionContainer())) {
        path.replaceWith(types.arrayExpression([node, path.node]));
        path.skip();
      } else {
        path.insertBefore(node);
      }
    }
  },
});

const { code } = generate(ast);

console.log(code);
