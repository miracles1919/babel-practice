module.exports = function ({ types, template }, options, dirname) {
  return {
    visitor: {
      CallExpression(path) {
        if (path.node.isNew) return;

        const calleeName = path.get('callee').toString();
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
          } else if (
            path.findParent((path) => path.isJSXExpressionContainer())
          ) {
            path.replaceWith(types.arrayExpression([node, path.node]));
            path.skip();
          } else {
            path.insertBefore(node);
          }
        }
      },
    },
  };
};
