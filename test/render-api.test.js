const render = require('./../src/render-api').default;
const {
  getDescendantProp,
  setDescendantProp,
  unsetDescendantProp,
  keys,
  each,
  map,
} = require('./../src/render-api');


describe('render API', () => {
  describe('getDescendantProp()', () => {
    it('is a function', () => {
      expect(typeof getDescendantProp).toBe('function');
    });
  });


  describe('setDescendantProp()', () => {
    it('is a function', () => {
      expect(typeof setDescendantProp).toBe('function');
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