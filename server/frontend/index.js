import merge from 'ramda/src/merge';

function api(method, args) {
  const body = merge({method}, args || {});

  return fetch('/api', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  }).then((res) => res.json());

}

api('hello', {name: 'world'}).then(({message}) => {
  console.log(message);
});
