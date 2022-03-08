class Dialog {
  static confirm(content) {
    return new Promise((resolve, reject) => {
      globalThis.onConfirm = () => {
        resolve(true);
        console.log('confirm');
      };

      globalThis.onCancel = () => {
        reject(false);
        console.log('cancel');
      };
    });
  }
}

Dialog.confirm().then(() => {
  console.log(111);
});

setTimeout(() => {
  globalThis.onCancel();
}, 200);

Dialog.confirm()
  .then(() => {
    console.log(222);
  })
  .catch((e) => e);

Dialog.confirm()
  .then(() => {
    console.log(111);
  })
  .then(() => {
    console.log(111);
  });

const confirm = () => new Promise((resolve) => {
  setTimeout(() => resolve(true), 300);
});

confirm();

Dialog['Dialog']().then();

const p = new Promise((resolve) => {
  setTimeout(() => resolve(true), 300);
});

p.then()

