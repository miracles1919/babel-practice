/**
 * Person 类
 */
class Person {
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }

  /**
   * `say` 方法
   * @param {string} name 姓名
   */
  say(name) {
    console.log('hello', name);
  }
}

/**
 * `sum` 方法
 * @param {number} a 变量a
 * @param {number} b 变量b
 * @returns {number} 返回值
 */
function sum(a, b) {
  return a + b;
}
