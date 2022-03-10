const { declare } = require('@babel/helper-plugin-utils');

const transformArrowFunctions = declare((api, options) => {
  api.assertVersion(7);

  const { types: t } = api;

  // 获取当前作用域内的this
  function getThisInCurrScope(path) {
    const thisPaths = [];

    // 遍历
    path.traverse({
      ThisExpression(thisPath) {
        thisPaths.push(thisPath);
      },
    });

    return thisPaths;
  }

  return {
    visitor: {
      // ArrowFunctionExpression(path) {
      //   path.arrowFunctionToExpression()
      // }

      ArrowFunctionExpression(path) {
        const node = path.node;

        // 向上找到最近函数（非箭头函数）的path 或者根节点path
        const hoistPath = path.findParent(
          (p) =>
            (p.isFunction() && !p.isArrowFunctionExpression()) || p.isProgram()
        );

        // 获取当前作用域内的this
        const thisPaths = getThisInCurrScope(path);

        if (!thisPaths.length) return;

        // 生成一个字符串，不会与任何本地定义的变量相冲突
        const thisName = hoistPath.scope.generateUid('_this');
        const thisAst = t.identifier(thisName);

        // 提升变量声明至 hoistPath 作用域
        hoistPath.scope.push({
          id: thisAst,
          init: t.thisExpression(),
        });

        // 替换this节点
        thisPaths.forEach((thisPath) => {
          thisPath.replaceWith(thisAst);
        });

        if (!path.get('body').isBlockStatement()) {
          const blockAst = t.blockStatement([
            t.expressionStatement(path.node.body),
          ]);
          path.get('body').replaceWith(blockAst);
        }

        node.type = 'FunctionDeclaration';
      },
    },
  };
});

module.exports = transformArrowFunctions;
