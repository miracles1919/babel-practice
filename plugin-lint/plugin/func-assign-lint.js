const { declare } = require('@babel/helper-plugin-utils');

const funcAssignLint = declare((api, options, dirname) => {
  api.assertVersion(7);

  return {
    pre(file) {
      file.set('errors', []);
    },
    visitor: {
      AssignmentExpression(path, state) {
        const errors = state.file.get('errors');

        const assignTarget = path.get('left').toString();
        const binding = path.scope.getBinding(assignTarget);

        if (binding) {
          if (
            binding.path.isFunctionDeclaration() ||
            binding.path.FunctionExpression()
          ) {
            const stackTraceLimit = Error.stackTraceLimit;
            // 设置为0，可以去掉stack信息
            Error.stackTraceLimit = 0;
            errors.push(
              path.buildCodeFrameError('can not reassign to funciont', Error)
            );

            Error.stackTraceLimit = stackTraceLimit;
          }
        }
      },
    },
    post(file) {
      console.log(file.get('errors'));
    },
  };
});

module.exports = funcAssignLint;
