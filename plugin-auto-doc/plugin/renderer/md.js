module.exports = function (docs) {
  let str = '';

  function parseType(type) {
    return type ? ': ' + type : '';
  }

  function parseParam({ name, type }) {
    return `- ${name}${type ? '(' + type + ')' : ''}`;
  }

  docs.forEach((doc) => {
    if (doc.type === 'function') {
      str += `## ${doc.name}\n`;

      if (doc.comments) {
        str += `${doc.comments.description}\n\n`;

        doc.comments.tags.forEach(
          ({ name, description }) =>
            (str += `${name ? name + ' ' : ''}${description ? description : ''}\n\n`)
        );
      }

      str += `> ${doc.name}(`;

      if (doc.params) {
        str += doc.params
          .map(({ name, type }) => `${name}${parseType(type)}`)
          .join(', ');
      }

      str += ')\n';

      str += '#### Parameters:\n';
      if (doc.params) {
        str += doc.params.map((param) => parseParam(param)).join('\n');
      }
      str += '\n';
    } else if (doc.type === 'class') {
      str += `## ${doc.name}\n`;
      str += `${doc.doc.description}\n`;
      str += '> new ' + doc.name + '(';
      if (doc.constructor.params) {
        str += doc.constructor.params
          .map(({ name, type }) => name + parseType(type))
          .join(', ');
      }
      str += ')\n';
      str += '### Methods:\n';
      if (doc.methods) {
        doc.methods.forEach((param) => {
          str += '- ' + param.name + '\n';
        });
      }
      str += '\n';
    }
  });

  return str;
};
