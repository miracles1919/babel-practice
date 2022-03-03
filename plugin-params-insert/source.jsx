console.log('hello world');

function fun() {
  console.log('foo');
}

export default class App {
  say() {
    console.log('what');
  }

  render() {
    return <div onClick={() => console.log('click')}>app</div>;
  }
}
