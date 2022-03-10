function App() {
  this.name = 'app';
}

var a = 1;
var b = 2;
const foo = () => {
  console.log('a', this.a);

  var b = 3;
  const bar = () => {
    console.log('b', this.b);
  };

  bar();
};

const fun = () => {
  console.log(this);
};

var obj = {
  name: 'obj',
  say: () => {
    console.log(this.name);
  },
};

var obj2 = {
  name: 'obj2',
  say: function () {
    return () => console.log(this.name);
  },
};
