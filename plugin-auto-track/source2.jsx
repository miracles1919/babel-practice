import React from 'react';

export default function () {
  const handleClick = () => {
    console.log('click 1');
  };

  function handleClick2() {
    console.log('click 2');
  }

  function foo() {
    console.log('foo');
  }

  const el = (<div onClick={handleClick}></div>)
  const el2 = (<div onClick={handleClick2}></div>)
  return <div></div>;
}
