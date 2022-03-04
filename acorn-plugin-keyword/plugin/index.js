const acorn = require('acorn');

const { Parser, TokenType } = acorn;

Parser.acorn.keywordTypes['miracles'] = new TokenType('miracles', {
  keyword: 'miracles',
});

module.exports = function (Parser) {
  return class extends Parser {
    parse(program) {
      let keywords =
        'break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this const class extends export import super';
      keywords += ' miracles';

      this.keywords = new RegExp('^(?:' + keywords.replace(/ /g, '|') + ')$');

      return super.parse(program);
    }

    parseStatement(context, topLevel, exports) {
      const tokenType = this.type;
      if (tokenType === Parser.acorn.keywordTypes['miracles']) {
        const node = this.startNode();
        return this.parseMiraclesStatement(node);
      } else {
        return super.parseStatement(context, topLevel, exports);
      }
    }

    parseMiraclesStatement(node) {
      this.next();
      return this.finishNode({ value: 'miracles' }, 'MiraclesStatement');
    }

    // 例：扩展 NumberLiteral、StringLiteral
    parseLiteral(...args) {
      const node = super.parseLiteral(...args);
      switch (typeof node.value) {
        case 'number':
          node.type = 'NumberLiteral';
          break;

        case 'string':
          node.type = 'StringLiteral';
          break;
      }

      return node;
    }
  };
};
