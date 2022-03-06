const { declare } = require('@babel/helper-plugin-utils');
const fs = require('fs');
const path = require('path');

let intlIndex = 0;
function generateIndex() {
  intlIndex++;
  return `intl${intlIndex}`;
}

const autoI18nPlugin = declare((api, options, dirname) => {
  api.assertVersion(7);

  if (!options.output) {
    throw new Error('output is empty');
  }

  function save(file, key) {
    const map = file.get('textMap');

    let val = map[key];
    if (!val) {
      val = generateIndex();
      map[key] = val;
    }

    file.set('textMap', map);
    return val;
  }

  function replaceString(path, val, intl) {
    const ast = api.template.ast(`${intl}.t('${val}')`).expression;

    return replaceInJsx(path, ast);
  }

  function replaceTemplateLiteral(path, state) {
    const expressions = path.node.expressions;
    let i = 0;
    const temp = path.node.quasis.reduce((a, b) => {
      const val = b.value.raw;
      if (val === '') {
        return a + '${' + expressions[i++].name + '}';
      }

      const index = save(state.file, val);

      const importStr = `${state.intlImportedId}.t('${index}')`;
      return a + '${' + importStr + '}';
    }, '');

    const ast = api.template.ast('`' + temp + '`').expression;

    return replaceInJsx(path, ast);
  }

  function replaceInJsx(path, ast) {
    if (
      path.findParent((p) => p.isJSXAttribute()) &&
      !path.findParent((p) => p.isJSXExpressionContainer())
    ) {
      return api.types.JSXExpressionContainer(ast);
    }
    return ast;
  }

  return {
    pre(file) {
      file.set('textMap', {});
    },
    visitor: {
      Program(path, state) {
        let imported = false;
        path.traverse({
          ImportDeclaration(currPath) {
            const importPath = currPath.get('source').node.value;
            if (importPath === 'intl') {
              imported = true;
              // state.intlImportedId = currPath.get('specifiers.0').toString();
              currPath.stop();
            }
          },
        });

        if (!imported) {
          const intlImportedId = path.scope.generateUid('intl');
          const intlImportedAST = api.template.ast(
            `import ${intlImportedId} from 'intl'`
          );

          path.node.body.unshift(intlImportedAST);
          state.intlImportedId = intlImportedId;
        }

        path.traverse({
          'StringLiteral|TemplateLiteral'(path) {
            if (path.node.leadingComments) {
              path.node.leadingComments = path.node.leadingComments.filter(
                (item) => {
                  if (item.value === 'i18n-disable') {
                    path.node.skipTransform = true;
                    return false;
                  }

                  return true;
                }
              );
            }

            if (path.findParent((p) => p.isImportDeclaration())) {
              path.node.skipTransform = true;
            }
          },
        });
      },

      StringLiteral(path, state) {
        if (path.node.skipTransform) return;

        const index = save(state.file, path.node.value);

        const ast = replaceString(path, index, state.intlImportedId);

        path.replaceWith(ast);
        path.skip();
      },

      TemplateLiteral(path, state) {
        if (path.node.skipTransform) return;

        const ast = replaceTemplateLiteral(path, state);

        path.replaceWith(ast);
        path.skip();
      },
    },
    // test时要注释
    post(file) {
      const map = file.get('textMap');
      const val = {};
      for (let key in map) {
        val[map[key]] = key;
      }
      const content = `const locale = ${JSON.stringify(
        val
      )}\n export default locale`;

      const outputPath = path.join(__dirname, options.output);
      const res = fs.existsSync(outputPath);

      if (!res) {
        fs.mkdirSync(outputPath);
      }

      fs.writeFileSync(path.join(outputPath, 'zh_CN.js'), content);
      fs.writeFileSync(path.join(outputPath, 'en_US.js'), content);
    },
  };
});

module.exports = autoI18nPlugin;
