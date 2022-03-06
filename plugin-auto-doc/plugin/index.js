const { declare } = require('@babel/helper-plugin-utils');
const doctrine = require('doctrine');
const renderer = require('./renderer');
const fs = require('fs');
const path = require('path');

function parseComments(comments) {
  if (!comments) return '';

  return doctrine.parse(comments, {
    unwrap: true,
  });
}

function parseReturnType(type) {
  const typeAnnotation = type.typeAnnotation;
  if (!typeAnnotation) return;

  switch (typeAnnotation.type) {
    case 'TSStringKeyword':
      return 'string';
    case 'TSNumberKeyword':
      return 'number';
  }
}

function generateDoc(doc, format = 'json') {
  if (format === 'md') {
    return {
      ext: '.md',
      content: renderer.md(doc),
    };
  }

  return {
    ext: '.json',
    content: renderer.json(doc),
  };
}

const autoDocPlugin = declare((api, options) => {
  api.assertVersion(7);

  if (!options.output) {
    throw new Error('output is empty');
  }

  function getItem(path, rest = () => {}) {
    return {
      name: path.get('id').toString() || path.get('key').toString(),
      params: path.get('params').map((path) => {
        return {
          name: path.toString(),
          type: parseReturnType(path.getTypeAnnotation()),
          ...rest(path),
        };
      }),
      return: parseReturnType(path.get('returnType').getTypeAnnotation()),
      comments:
        path.node.leadingComments &&
        parseComments(path.node.leadingComments[0].value),
    };
  }

  return {
    pre(file) {
      file.set('doc', []);
    },
    visitor: {
      FunctionDeclaration(path, state) {
        const item = getItem(path);

        const doc = state.file.get('doc');
        doc.push({
          type: 'function',
          ...item,
        });

        state.file.set('doc', doc);
      },
      ClassDeclaration(path, state) {
        const data = {
          type: 'class',
          name: path.get('id').toString(),
          constructor: {},
          methods: [],
          properties: [],
        };

        if (path.node.leadingComments) {
          data.doc = parseComments(path.node.leadingComments[0].value);
        }

        path.traverse({
          ClassMethod(path) {
            if (path.node.kind === 'constructor') {
              data.constructor = getItem(path, (paramPath) => ({
                doc:
                  paramPath.node.leadingComments &&
                  parseComments(paramPath.node.leadingComments[0].value),
              }));
            } else {
              data.methods.push(getItem(path));
            }
          },
        });

        const doc = state.file.get('doc');
        doc.push(data);
        state.file.set('doc', doc);
      },
    },

    post(file) {
      const doc = file.get('doc');

      const title = options.title || 'doc';
      const format = options.format || 'json';
      const { ext, content } = generateDoc(doc, format);
      const outputPath = path.join(__dirname, options.output);

      if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath);
      }

      fs.writeFileSync(path.join(outputPath, title + ext), content);
    },
  };
});

module.exports = autoDocPlugin;
