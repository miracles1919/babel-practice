function getCalleeName(callee) {
  if (!callee) return;
  if (callee.computed) {
    // a['b']
    return callee.property.value;
  } else {
    // a.b
    return (callee.property || {}).name;
  }
}

// 插件思路来自：https://juejin.cn/post/6985453748248133645
module.exports = function ({ types: t, template }, options) {
  function isMatchComments(path) {
    const { disabledComments = 'pac-disabled' } = options;
    return (
      path &&
      path.node.leadingComments.some((item) =>
        item.value.includes(disabledComments)
      )
    );
  }

  return {
    visitor: {
      CallExpression(path) {
        const { node } = path;

        const { names, catchTemplate } = options;

        if (catchTemplate && typeof catchTemplate !== 'string') {
          throw new Error('catchTemplate must be String');
        }

        if (names) {
          if (!Array.isArray(names)) {
            throw new Error('names must be Array<string>');
          }

          if (!names.length) return;

          let isMatch = false;

          if (t.isMemberExpression(node.callee)) {
            const calleeName = getCalleeName(node.callee);
            // Dialog.confirm() Dialog['confirm']()
            isMatch = names.some((name) => calleeName === name);

            if (!isMatch && calleeName === 'then') {
              if (t.isIdentifier(node.callee.object)) {
                // p.then()
                isMatch = names.some(
                  (name) => node.callee.object.name === name
                );
              } else if (t.isCallExpression(node.callee.object)) {
                // confirm().then()
                isMatch = names.some(
                  (name) => node.callee.object.callee.name === name
                );
              }
            }
          }

          // 不需要加catch的注释
          const expressionPath = path.findParent(
            (p) => p.isExpressionStatement() && p.node.leadingComments
          );

          if (isMatchComments(expressionPath)) {
            isMatch = false;
            expressionPath.skip();
          }

          const variableDeclarationPath = path.findParent(
            (p) => p.isVariableDeclaration() && p.node.leadingComments
          );

          if (isMatchComments(variableDeclarationPath)) {
            isMatch = false;
            variableDeclarationPath.skip();
          }

          if (!isMatch) return;
        } else if (getCalleeName(node.callee) !== 'then') {
          return;
        }

        const catchPath = path.findParent(
          (p) => p.isMemberExpression() && getCalleeName(p.node) === 'catch'
        );

        if (catchPath) {
          // 存在catch 跳过
          return;
        }

        // 获取父级path最外层then
        const outerMostParentThenPath = path.findParent(
          (p) =>
            p.isCallExpression() &&
            getCalleeName(p.node.callee) === 'then' &&
            !p.parentPath.isMemberExpression()
        );

        // 最外层then
        const outerMostThenPath = outerMostParentThenPath || path;

        const catchFuncNode = t.arrowFunctionExpression(
          [t.identifier('err')],
          options.catchTemplate
            ? t.BlockStatement([template.ast(options.catchTemplate)])
            : template.ast(`err`).expression
        );

        const newNode = t.callExpression(
          t.memberExpression(outerMostThenPath.node, t.identifier('catch')),
          [catchFuncNode]
        );

        outerMostThenPath.replaceWith(newNode);
        outerMostThenPath.skip();
      },
    },
  };
};
