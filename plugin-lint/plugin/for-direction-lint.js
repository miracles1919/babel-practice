const { declare } = require('@babel/helper-plugin-utils');

const forDirectionLint = declare((api, options, dirname) => {
  api.assertVersion(7);

  return {
    pre(file) {
      file.set('errors', []);
    },
    visitor: {
      ForStatement(path, state) {
        const errors = state.file.get('errors');
        const testOperator = path.node.test.operator;
        const updateOperator = path.node.update.operator;

        let shoudUpdateOperator;

        if (['<', '<='].includes(testOperator)) {
          shoudUpdateOperator = '++';
        } else if (['>', '>='].includes(testOperator)) {
          shoudUpdateOperator = '--';
        }

        if (shoudUpdateOperator !== updateOperator) {
          const stackTraceLimit = Error.stackTraceLimit;
          // 设置为0，可以去掉stack信息
          Error.stackTraceLimit = 0;
          errors.push(
            path.get('update').buildCodeFrameError('for direction err', Error)
          );

          Error.stackTraceLimit = stackTraceLimit;
        }
      },
    },
    post(file) {
      console.log(file.get('errors'))
    },
  };
});

module.exports = forDirectionLint;
