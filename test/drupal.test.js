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
  TEST_DRUPAL_INSTALL = './drupal',// './../../d8/irata',
} = process.env;
const {
  resolve,
} = require('path');
const {
  statSync,
} = require('fs');

const toJSON = obj => JSON.stringify(obj, null, 2);
const freeze = obj => JSON.parse(JSON.stringify(obj));

describe('Drupal', () => {
  let instance;
  const drupalRootDir = resolve(TEST_DRUPAL_INSTALL);

  it('has a drupalRootDir', () => {
    let dirStat;
    expect(() => {
      dirStat = statSync(drupalRootDir);
    }).not.toThrow();
    expect(dirStat.isDirectory()).toBe(true);
  });

  it('instanciates', () => {
    expect(async () => {
      instance = new Drupal({
        rootPath: drupalRootDir,
        siteURI: TEST_DRUPAL_URI,
      });
    }).not.toThrow();
  });

  xit('scans', async () => {
    expect.assertions(2);
    const scanResult = await instance.scan();
    expect(scanResult).toBeTruthy();
    expect(instance._scanned).toBeTruthy();
  }, 1000 * 20);

  xit('reads info files', async () => {
    expect.assertions(3);
    const info = await instance.readInfo();
    expect(info).toHaveProperty('module');
    expect(info).toHaveProperty('theme');
    expect(info).toHaveProperty('theme_engine');
  }, 1000 * 20);

  xit('finds paths', () => {
    expect(instance.getPath('theme', 'classy'))
      .toBe('core/themes/classy');
    expect(instance.getPath('module', 'comment'))
      .toBe('core/modules/comment');
  });

  it('executes drush commands', async () => {
    expect.assertions(4);
    const { stdout, stderr } = await instance.drush('help');
    // console.info('stdout', Object.keys(stdout));
    expect(stdout).toHaveProperty('cache');
    expect(stdout).toHaveProperty('core');
    expect(stdout).toHaveProperty('config');
    expect(stderr).toBeFalsy();
    // expect(stdout).toHaveProperty('libraries');
  }, 1000 * 20);

  it('executes composer commands', async () => {
    expect.assertions(3);
    const { stdout, stderr } = await instance.composer('list');
    expect(stdout).toHaveProperty('commands');
    expect(stdout).toHaveProperty('namespaces');
    expect(stderr).toBeFalsy();
  }, 1000 * 20);
});