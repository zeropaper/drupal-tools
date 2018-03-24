/* eslint-disable no-param-reassign */
export const getDescendantProp = (obj, desc) => {
  const arr = Array.isArray(desc) ? [...desc] : desc.split('.');
  while (arr.length) {
    obj = obj[arr.shift()];
  }
  return obj;
};

export const setDescendantProp = (obj, desc, value) => {
  const arr = Array.isArray(desc) ? [...desc] : desc.split('.');
  let item;
  while (arr.length > 1) {
    item = arr.shift();
    obj[item] = obj[item] ? obj[item] : {};
    obj = obj[item];
  }
  obj[arr[0]] = { ...obj[arr[0]], ...value };
};

export const unsetDescendantProp = (obj, desc) => {
  const arr = Array.isArray(desc) ? [...desc] : desc.split('.');
  let item;
  while (arr.length > 1 && obj) {
    item = arr.shift();
    obj = obj[item];
  }
  if (!obj || Object.keys(obj).contains(arr[0])) return;
  delete obj[arr[0]];
};

export const keys = data => Object.keys(data).filter(name => name[0] !== '#');

export const each = (data, cb) => keys(data).forEach(key => cb(data[key], key));

export const map = (data, cb) => keys(data).map(key => cb(data[key], key));

export const templateNameCase = name => name.replace('_', '-');

export const templateSuggestions = (themeName, activeModuleNames = []) => (name) => {
  const prefixes = ['template', ...activeModuleNames, themeName];
  // eslint-disable-next-line no-console
  console.log('prefixes', prefixes.map(pre => `${pre}_${name}`));
  const found = [];
  return found;
};

export default function render(struct) {
  if (struct['#children']) {
    return struct['#children'];
  }
  const children = [];

  struct['#children'] = children.join('');
  return struct['#children'];
}
