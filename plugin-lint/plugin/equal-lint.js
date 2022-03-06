const { declare } = require('@babel/helper-plugin-utils');

const equalLint = declare((api, options, dirname) => {
  api.assertVersion(7);

  return {
    pre(file) {
      file.set('errors', []);
    },
    visitor: {
      BinaryExpression(path, state) {
        const errors = state.file.get('errors');

        const operator = path.node.operator;
        if (['==', '!='].includes(operator)) {
          const left = path.get('left');
          const right = path.get('right');

          if (
            !(
              left.isLiteral() &&
              right.isLiteral() &&
              left.node.value === right.node.value
            )
          ) {
            const stackTraceLimit = Error.stackTraceLimit;
            // 设置为0，可以去掉stack信息
            Error.stackTraceLimit = 0;
            errors.push(
              path.buildCodeFrameError(
                `please replace ${operator} with ${operator}=`,
                Error
              )
            );
            Error.stackTraceLimit = stackTraceLimit;

            // auto fix
            if (options.fix) {
              path.node.operator += '=';
            }
          }
        }
      },
    },
    post(file) {
      console.log(file.get('errors'));
    },
  };
});

module.exports = equalLint;
