/* catch-disabled */
Dialog.confirm()
  .then(() => {
    console.log(111);
  })
  .then(() => {
    console.log(111);
  })
  .then(() => {
    console.log(111);
  })
  .then(() => {
    console.log(111);
  });

const confirm = () =>
  new Promise((resolve) => {
    setTimeout(() => resolve(true), 300);
  });

/* disabled */
confirm().then();

/* pac-disabled */
Dialog['confirm']().then();

const p = new Promise((resolve) => {
  setTimeout(() => resolve(true), 300);
});

p.then();

const p2 = new Promise((resolve) => {
  setTimeout(() => resolve(true), 300);
});

p2.then();

const handleClick = async () => {
  const res = await Dialog.confirm();

  /* catch-disabled */
  const res2 = await Dialog.confirm();
};

async function handleClick2() {
  const res = await Dialog.confirm();

  /* catch-disabled */
  const res2 = await Dialog.confirm();
}
