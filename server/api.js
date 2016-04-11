import Promise from 'bluebird';

export function hello({name}) {
  return Promise.resolve({message: `Hello, ${name}`});
}
