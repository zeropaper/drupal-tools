const drupalLib = require('./../src/index');

const Drupal = drupalLib.default;
const {
  // DrupalSite,
  // DrupalLibrarie,
  // DrupalModule,
  // DrupalEngine,
  DrupalTheme,
  Collection,
} = drupalLib;
const {
  TEST_DRUPAL_URI = 'irata.loc',
  TEST_DRUPAL_INSTALL = '/tmp/drupal-test',// './../../d8/irata',
  TEST_DRUPAL_EXISTING = './../../d8/irata',
} = process.env;
const { resolve } = require('path');
// const { statSync } = require('fs');

// const toJSON = obj => JSON.stringify(obj, null, 2);
// const freeze = obj => JSON.parse(JSON.stringify(obj));

const drupalRendered = `<div class="custom-class block block-provider-a-b block-">

      <h2>--block config label--</h2>

      --block content--
  </div>`;

describe('Drupal', () => {
  describe.skip('static composerInstall()', () => {
    it('executes Drupal install', async () => Drupal.composerInstall({
      composerOptions: {
        description: 'Drupal Test Install',
      },
      destination: resolve(TEST_DRUPAL_INSTALL),
    }), 1000 * 60 * 5);
  });


  describe('instance', () => {
    let instance;
    const drupalRootDir = resolve(TEST_DRUPAL_EXISTING);

    beforeEach(() => {
      instance = (instance || new Drupal({
        rootPath: drupalRootDir,
        siteURI: TEST_DRUPAL_URI,
        themeName: 'irata',
        activeModuleNames: [
          'libraries',
          'devel',
        ],
      }));
    });


    describe('scan()', () => {
      it('searches for relevant files', async () => {
        expect.assertions(2);
        const scanResult = await instance.scan();
        expect(scanResult).toBeTruthy();
        expect(instance._scanned).toBeTruthy();
      }, 1000 * 20);
    });


    describe('readInfo()', () => {
      it('reads info files', async () => {
        expect.assertions(5);
        const info = await instance.readInfo();
        expect(info).toHaveProperty('module');
        expect(info).toHaveProperty('theme');
        expect(info).toHaveProperty('theme_engine');
        expect(instance.themes.length).toBeGreaterThan(1);
        expect(instance.modules.length).toBeGreaterThan(1);
      }, 1000 * 20);
    });


    describe('getPath()', () => {
      it('finds paths', () => {
        expect(instance.getPath('theme', 'classy'))
          .toBe('core/themes/classy');
        expect(instance.getPath('module', 'comment'))
          .toBe('core/modules/comment');
      });
    });


    describe('getFilename()', () => {
      it('finds paths', () => {
        expect(instance.getFilename('theme', 'classy', 'classy.libarary.yml'))
          .toBe('core/themes/classy/classy.libarary.yml');
        expect(instance.getFilename('module', 'comment', 'comment.module'))
          .toBe('core/modules/comment/comment.module');
      });
    });


    describe('site', () => {
      it('returns the active theme', () => {
        expect(instance.theme).toHaveProperty('machine name', 'irata');
      });
    });


    describe('activeModules', () => {
      it('returns the active modules', () => {

      });
    });


    describe('modules', () => {
      it('dependencyTree', () => {
        const fieldUI = instance.modules.findBy('id', 'field_ui');
        console.log('field_ui', fieldUI.dependencyTree);
      });
    });


    describe('theme', () => {
      beforeEach(async () => {
        instance = (instance || new Drupal({
          rootPath: drupalRootDir,
          siteURI: TEST_DRUPAL_URI,
          themeName: 'irata',
          activeModuleNames: [
            'libraries',
            'devel',
          ],
        }));

        instance.themeName = 'irata';

        if (!instance._scanned) {
          await instance.scan();
        }

        if (!instance._info) {
          await instance.readInfo();
        }
      }, 1000 * 30);


      describe('instance', () => {
        it('is an instance of DrupalTheme ', async () => {
          expect(instance._scanned).toBeTruthy();
          expect(instance._info).toBeTruthy();
          expect(instance.themeName).toBe('irata');
          expect(instance.themes).toBeInstanceOf(Collection);
          expect(instance.themes.length).toBeGreaterThan(1);
          expect(instance.theme).toBeTruthy();
          expect(instance.theme).toBeInstanceOf(DrupalTheme);
        });
      });


      describe('baseThemes', () => {
        it('is an array of theme machine names', () => {
          const result = instance.theme.baseThemes;
          expect(result).toHaveLength(1);
        });
      });
    });


    describe('invokeTheme()', () => {
      it('calls base themes functions', () => {

      });
    });


    describe('render()', () => {
      it('renders from template', () => {
        let rendered = '';
        expect(() => {
          rendered = instance.render('block', {
            content: '--block content--',
            '#configuration': {
              provider: 'blockprovider',
              label_display: true,
              label: '--block label--',
            },
            '#attributes': { class: ['custom-class'] },
          }, {});
        }).not.toThrow();

        expect(rendered).toEqual(drupalRendered);
      });
    });


    describe('drush()', () => {
      it('executes drush commands', async () => {
        expect.assertions(4);
        const { stdout, stderr } = await instance.drush('st');
        expect(stdout).toHaveProperty('bootstrap', 'Successful');
        expect(stdout).toHaveProperty('db-status', 'Connected');
        expect(stderr).toBeFalsy();
      }, 1000 * 20);
    });


    describe('composer()', () => {
      it('executes composer commands', async () => {
        expect.assertions(3);
        const { stdout, stderr } = await instance.composer('list');
        expect(stdout).toHaveProperty('commands');
        expect(stdout).toHaveProperty('namespaces');
        expect(stderr).toBeFalsy();
      }, 1000 * 20);
    });
  });
});
