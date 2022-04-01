const { declare } = require('@babel/helper-plugin-utils');
const fs = require('fs');
const path = require('path');

// 中文正则
const reg = /[\u4e00-\u9fa5]+/;

const autoI18nPlugin = declare((api, options, dirname) => {
  api.assertVersion(7);

  if (!options.output) {
    throw new Error('output is empty');
  }

  function save(file, key) {
    const map = file.get('textMap');

    let val = map[key];
    if (!val) {
      map[key] = key;
    }

    file.set('textMap', map);
    return key;
  }

  function replaceString(path, state) {
    if (path.node.skipTransform) return;

    const val = path.node.value.trim();
    if (!reg.test(val)) return;

    save(state.file, val);

    const intl = state.intlImportedId;
    const expressionAst = api.template.ast(`${intl}.t('${val}')`).expression;
    const ast = replaceInJsx(path, expressionAst);

    path.replaceWith(ast);
    path.skip();
  }

  // 模板字符串分成两个部分 expressions, quasis
  // 思路就是 expressions + quasis + quasis...
  function replaceTemplateLiteral(path, state) {
    if (path.node.skipTransform) return;

    const intlImport = state.intlImportedId;
    const expressions = path.node.expressions;
    const quasis = path.node.quasis;

    const newQuasis = [];
    const newExpressions = [];

    let needReplace = false;
    let i = 0;
    quasis.forEach((node) => {
      const val = node.value.raw;

      if (!reg.test(val)) {
        newQuasis.push(node);
        newExpressions.push(expressions[i++]);
      } else {
        needReplace = true;
        newQuasis.push(api.types.templateElement({ raw: '', cooked: '' }));
        const expression = api.template.ast(
          `${intlImport}.t('${val}')`
        ).expression;
        newExpressions.push(expression);

        let tail = false;
        if (i === quasis.length - 1) {
          tail = true;
        }
        newQuasis.push(
          api.types.templateElement({ raw: '', cooked: '' }, tail)
        );
      }
    });

    if (needReplace) {
      const ast = api.types.templateLiteral(newQuasis, newExpressions);
      path.replaceWith(ast);
    }

    path.skip();
  }

  function replaceInJsx(path, ast) {
    const parentPath = path.parentPath;
    if (parentPath.isJSXAttribute() || parentPath.isJSXElement()) {
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
        replaceString(path, state);
      },

      JSXText(path, state) {
        replaceString(path, state);
      },

      TemplateLiteral(path, state) {
        if (path.node.skipTransform) return;

        const ast = replaceTemplateLiteral(path, state);

        // path.replaceWith(ast);
        // path.skip();
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
