const render = require('./../src/render-api').default;
const {
  getDescendantProp,
  setDescendantProp,
  unsetDescendantProp,
  // templateNameCase,
  keys,
  each,
  map,
} = require('./../src/render-api');

const structure = {
  '#theme': 'item_list',
  '#items': {
    item_1: {
      link_1: {
        '#type': 'link',
        '#href': 'http://example.loc',
        '#title': 'Link #1',
        '#attributes': {
          class: ['link', 'link--external'],
        },
      },
    },
    item_2: {
      link_2: {
        '#type': 'link',
        '#href': '/internal/path',
        '#title': 'Link #2',
        '#attributes': {
          class: ['link', 'link--internal'],
        },
      },
    },
  },
};

describe('render API', () => {
  let struct;

  beforeEach(() => {
    struct = JSON.parse(JSON.stringify(structure));
  });


  describe('getDescendantProp()', () => {
    it('is a function', () => {
      expect(typeof getDescendantProp).toBe('function');
    });

    it('finds values in nested objects', () => {
      expect(getDescendantProp(struct, '#items.item_1.link_1.#title')).toBe('Link #1');
    });
  });


  describe('setDescendantProp()', () => {
    it('is a function', () => {
      expect(typeof setDescendantProp).toBe('function');
    });

    it('changes values in nested objects', () => {
      expect(() => {
        setDescendantProp(struct, '#items.item_1.link_1', { '#title': 'changed' });
      }).not.toThrow();
      expect(struct).toHaveProperty('#items.item_1.link_1.#title', 'changed');
    });
  });


  describe('unsetDescendantProp()', () => {
    it('is a function', () => {
      expect(typeof unsetDescendantProp).toBe('function');
    });
  });


  describe('keys()', () => {
    it('is a function', () => {
      expect(typeof keys).toBe('function');
    });
  });


  describe('each()', () => {
    it('is a function', () => {
      expect(typeof each).toBe('function');
    });
  });


  describe('map()', () => {
    it('is a function', () => {
      expect(typeof map).toBe('function');
    });
  });


  describe('render()', () => {
    it('is a function', () => {
      expect(typeof render).toBe('function');
    });
  });
});
