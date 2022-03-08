const generate = require('@babel/generator').default;

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

module.exports = function ({ types: t, template }, options) {
  return {
    visitor: {
      CallExpression(path) {
        const { node } = path;

        // console.log(getCalleeName(node.callee))
        const res =
          t.isMemberExpression(node.callee) &&
          t.isIdentifier(node.callee.object, { name: 'Dialog' }) &&
          t.isIdentifier(node.callee.property, { name: 'confirm' });

        if (!res) {
          return;
        }

        const catchPath = path.findParent(
          (p) => p.isMemberExpression() && getCalleeName(p.node) === 'catch'
        );

        // 两种写法
        // const catchPath = path.findParent(
        //   (p) =>
        //     t.isMemberExpression(p.node) && getCalleeName(p.node) === 'catch'
        // );

        if (catchPath) {
          // 存在catch 跳过
          return;
        }

        // 判断最外层then
        // 当前then的parentPath是否为MemberExpression，如果不是则为最外层then
        const outerMostThenPath = path.findParent(
          (p) =>
            p.isCallExpression() &&
            getCalleeName(p.node.callee) === 'then' &&
            !p.parentPath.isMemberExpression()
        );

        const catchFuncNode = t.arrowFunctionExpression(
          [t.identifier('err')],
          t.identifier('err')
        );

        // 另一种写法
        // const catchFuncNode = template.ast(`err => err`).expression

        const newNode = t.callExpression(
          t.memberExpression(outerMostThenPath.node, t.identifier('catch')),
          [catchFuncNode]
        );

        outerMostThenPath.replaceWith(newNode);

        // 另一种写法
        // const code = generate(outerMostThenPath.node).code
        // const ast = template.ast(`${code}.catch(err => err)`).expression
        // outerMostThenPath.replaceWith(ast)
      },
    },
  };
};
