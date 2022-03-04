const pluginTester = require('babel-plugin-tester').default;

const InsertParamsPlugin = require('../plugin/index');

const sourceCode = `
  console.log('hello world')

  function fun() {
    console.log('foo')
  }

  export default class App {

    say() {
      console.log('what');
    }

    render() {
      return (
        <>
          <div onClick={() => console.log('click')}>app</div>
          <div>{console.log('jsx')}</div>
        </>
        
      )
    }
  }
`;

pluginTester({
  plugin: InsertParamsPlugin,
  pluginName: 'InsertParamsPlugin',
  babelOptions: {
    parserOpts: {
      sourceType: 'unambiguous',
      plugins: ['jsx'],
    },
  },
  tests: {
    'console.log': {
      code: sourceCode,
      snapshot: true,
    },
  },
});
