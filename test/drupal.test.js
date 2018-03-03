const drupalLib = require('./../src/index');
const Drupal = drupalLib.default;
const {
  DrupalSite,
  DrupalLibraries,
  DrupalModules,
  DrupalEngines,
  DrupalThemes,
} = drupalLib;
const {
  TEST_DRUPAL_URI = 'irata.loc',
  TEST_DRUPAL_INSTALL = '/tmp/drupal-test',// './../../d8/irata',
  TEST_DRUPAL_EXISTING = './../../d8/irata',
} = process.env;
const { resolve } = require('path');
const { statSync } = require('fs');

const toJSON = obj => JSON.stringify(obj, null, 2);
const freeze = obj => JSON.parse(JSON.stringify(obj));

describe('Drupal', () => {
  describe('static install()', () => {
    it('executes Drupal install', async () => {
      const result = await Drupal.install({
        name: 'Drupal Test Install',
        destination: resolve(TEST_DRUPAL_INSTALL),
      });
      console.info(result);
    }, 1000 * 60 * 5);
  });


  describe('instance', () => {
    let instance;
    const drupalRootDir = resolve(TEST_DRUPAL_EXISTING);

    beforeEach(() => {
      instance = (instance || new Drupal({
        rootPath: drupalRootDir,
        siteURI: TEST_DRUPAL_URI,
      }));
    });

    it('scans', async () => {
      expect.assertions(2);
      const scanResult = await instance.scan();
      expect(scanResult).toBeTruthy();
      expect(instance._scanned).toBeTruthy();
    }, 1000 * 20);

    it('reads info files', async () => {
      expect.assertions(3);
      const info = await instance.readInfo();
      expect(info).toHaveProperty('module');
      expect(info).toHaveProperty('theme');
      expect(info).toHaveProperty('theme_engine');
    }, 1000 * 20);

    it('finds paths', () => {
      expect(instance.getPath('theme', 'classy'))
        .toBe('core/themes/classy');
      expect(instance.getPath('module', 'comment'))
        .toBe('core/modules/comment');
    });

    it('executes drush commands', async () => {
      expect.assertions(4);
      const { stdout, stderr } = await instance.drush('help');
      expect(stdout).toHaveProperty('cache');
      expect(stdout).toHaveProperty('core');
      expect(stdout).toHaveProperty('config');
      expect(stderr).toBeFalsy();
    }, 1000 * 20);

    it('executes composer commands', async () => {
      expect.assertions(3);
      const { stdout, stderr } = await instance.composer('list');
      expect(stdout).toHaveProperty('commands');
      expect(stdout).toHaveProperty('namespaces');
      expect(stderr).toBeFalsy();
    }, 1000 * 20);
  });
});