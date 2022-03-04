const { declare } = require('@babel/helper-plugin-utils');
const importModule = require('@babel/helper-module-imports');

const funcPathMap = {};

const autoTrackPlugin = declare((api, options, dirname) => {
  api.assertVersion(7);

  function assertTrack(path, state) {
    if (path.isBlockStatement()) {
      path.node.body.unshift(state.trackAST);
    } else {
      const ast = api.template(
        `{${state.trackImportedId}();return PREV_BODY;}`
      )({
        PREV_BODY: path.node,
      });
      path.replaceWith(ast);
    }
  }

  return {
    visitor: {
      Program: {
        enter(path, state) {
          path.traverse({
            ImportDeclaration(currPath) {
              const importPath = currPath.get('source').node.value;

              if (importPath === options.alias) {
                // 已经引入
                const specifierPath = currPath.get('specifiers.0');

                if (specifierPath.isImportSpecifier()) {
                  // import { track } from 'xx'
                  state.trackImportedId = specifierPath.toString();
                } else if (specifierPath.isImportDefaultSpecifier()) {
                  // import track from 'xx'

                  state.trackImportedId = specifierPath.toString();
                } else {
                  // ...
                }

                state.trackAST = api.template.statement(
                  `${state.trackImportedId}()`
                )();
                currPath.stop();
              }
            },
          });

          if (!state.trackImportedId) {
            const trackImportedId = importModule.addDefault(
              path,
              options.alias,
              {
                // nameHint: path.scope.generateUid('track')
                nameHint: 'track',
              }
            ).name;

            state.trackImportedId = trackImportedId;
            state.trackAST = api.template.statement(`${trackImportedId}()`)();
          }
        },
      },

      JSXIdentifier(path, state) {
        if (path.node.name === 'onClick') {
          console.log(path.parent.value.expression.type);

          const nodeType = path.parent.value.expression.type;
          if (nodeType === 'ArrowFunctionExpression') {
            const bodyPath = path.parentPath
              .get('value')
              .get('expression')
              .get('body');

            assertTrack(bodyPath, state);
          } else if (nodeType === 'Identifier') {
            const name = path.parent.value.expression.name;

            const funcPath = funcPathMap[name];
            if (funcPath) {
              assertTrack(funcPath.get('body'), state);
            }
          }
        }
      },

      FunctionDeclaration(path) {
        const name = path.get('id').toString();

        if (name) {
          funcPathMap[name] = path;
        }
      },

      ArrowFunctionExpression(path) {
        const name = path.parentPath.get('id').toString();

        if (name) {
          funcPathMap[name] = path;
        }
      },
    },
  };
});

module.exports = autoTrackPlugin;
