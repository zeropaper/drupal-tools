const { resolve, relative, basename, dirname } = require('path');
const { statSync, readFile } = require('fs-extra');
const { remove, ensureDir, readJson, writeJson } = require('fs-extra');
const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const glob = require('glob');
const yaml = require('yaml-js');

const execAsync = promisify(exec);
const globAsync = promisify(glob);

const unique = array => array.reduce((acc, item) => {
  if (!item || acc.indexOf(item) > -1) return acc;
  acc.push(item);
  return acc;
}, []);

export class Model {
  constructor(info, idKey, collection = null) {
    this.idKey = idKey;
    this.objectKeys = Object.keys(info || {});
    // eslint-disable-next-line no-return-assign
    this.objectKeys.forEach(key => this[key] = info[key]);
    this.collection = collection;
  }

  get id() {
    return this[this.idKey];
  }

  toJSON() {
    const obj = {};
    // eslint-disable-next-line no-return-assign
    this.objectKeys.forEach(key => obj[key] = this[key]);
    return obj;
  }
}

export class Collection {
  // eslint-disable-next-line no-shadow
  constructor(Model, data) {
    this.Model = Model;
    this._data = [];
    this.reset(data);
  }

  get data() {
    return this._data;
  }

  get length() {
    return this._data.length;
  }

  toJSON() {
    return this._data.map(item => item.toJSON());
  }

  add(info = {}) {
    const model = new this.Model(info, this);
    const exists = this._data.findIndex(item => item.id === model.id);
    if (exists > -1) {
      // replace
    } else {
      this._data.push(model);
    }
    return this;
  }

  reset(data) {
    data.forEach(this.add);
    return this;
  }

  map(cb) {
    return this._data.map(cb);
  }

  find(cb) {
    return this._data.find(cb);
  }

  findBy(key, value) {
    return this.find(item => item[key] === value);
  }

  filter(cb) {
    return this._data.filter(cb);
  }

  filterBy(key, value) {
    return this.filter(item => item[key] === value);
  }

  forEach(cb) {
    this._data.forEach(cb);
    return this;
  }
}


export class DrupalSite extends Model {
  constructor(info = {}, collection = null) {
    super(info, 'machine name', collection);
    // eslint-disable-next-line no-console
    // console.log('new DrupalSite()', this.id);
  }
}

export class DrupalLibrary extends Model {
  constructor(info = {}, collection = null) {
    super(info, 'machine name', collection);
    // eslint-disable-next-line no-console
    // console.log('new DrupalLibrary()', this.id);
  }
}

export class DrupalModule extends Model {
  constructor(info = {}, collection = null) {
    super(info, 'machine name', collection);
    // eslint-disable-next-line no-console
    // console.log('new DrupalModule()', this.id);
  }

  get dependencyTree() {
    const { collection, dependencies = [] } = this;
    let deps = dependencies;
    deps.forEach((name) => {
      const dep = collection.findBy('id', name);
      if (!dep) {
        // eslint-disable-next-line no-console
        console.warn('could not determine dependency', name);
        return;
      }
      deps = [...deps, name, ...dep.dependencyTree];
    });
    return unique(deps);
  }
}

export class DrupalThemeEngine extends Model {
  constructor(info = {}, collection = null) {
    super(info, 'machine name', collection);
    // eslint-disable-next-line no-console
    // console.log('new DrupalThemeEngine()', this.id);
  }
}

export class DrupalTheme extends Model {
  constructor(info = {}, collection = null) {
    super(info, 'machine name', collection);
    // eslint-disable-next-line no-console
    // console.log('new DrupalTheme()', this.id);
  }

  get baseThemes() {
    const baseTheme = this.collection.findBy('machine name', this['base theme']);
    return baseTheme ? [baseTheme.id, ...baseTheme.baseThemes] : [];
  }
}

export class DrupalVendor extends Model {
  constructor(info = {}, collection = null) {
    super(info, 'machine name', collection);
    // eslint-disable-next-line no-console
    // console.log('new DrupalVendor()', this.id);
  }
}


const cmd2JSON = result => ({
  stdout: JSON.parse(result.stdout || 'null'),
  stderr: result.stderr,
});

export default class Drupal {
  constructor(opts = {}) {
    const {
      rootPath,
      siteURI,
      drushBin = './vendor/bin/drush',
      composerBin = 'composer',
      themeName = 'bartik', // based on "classy"
      adminThemeName = 'seven',
      activeModuleNames = [],
      fileTypes = {
        info: 'info.{yml,yaml}',
        libraries: 'libraries.{yml,yaml}',
        templates: 'html.twig',
      },
    } = opts;
    if (!statSync(rootPath).isDirectory()) {
      throw new Error(`"${rootPath}" is not a directory.`);
    }
    this.siteURI = siteURI;
    this.rootPath = rootPath;
    this.drushBin = drushBin;
    this.composerBin = composerBin;
    this.themeName = themeName;
    this.adminThemeName = adminThemeName;
    this.activeModuleNames = activeModuleNames || [];

    this.sites = new Collection(DrupalSite, []);
    this.themes = new Collection(DrupalTheme, []);
    this.modules = new Collection(DrupalModule, []);
    this.libraries = new Collection(DrupalLibrary, []);
    this.engines = new Collection(DrupalThemeEngine, []);
    this.vendors = new Collection(DrupalVendor, []);

    this.fileTypes = fileTypes;
  }

  get site() {
    return this.sites.findBy('id', this.siteURI);
  }

  get theme() {
    return this.themes.findBy('id', this.themeName);
  }

  get adminTheme() {
    return this.themes.findBy('id', this.adminThemeName);
  }

  get activeModules() {
    return this.modules.filter(module => this.activeModuleNames.contains(module.id));
  }

  absPath(file) {
    return resolve(`${this.rootPath}/${file}`);
  }

  typeToCollection(type) {
    return {
      theme: this.themes,
      module: this.modules,
      theme_engine: this.engines,
      vendor: this.vendors,
      site: this.sites,
      library: this.libraries,
    }[type];
  }

  async readInfoFile(file) {
    const allTemplates = this._scanned.templates;
    const machineName = basename(basename(file, '.info.yml'), '.info.yaml');
    const content = await readFile(this.absPath(file), 'utf8');
    const info = yaml.load(content);

    /* eslint-disable  */
    let js = {};
    try {
      js = require(`${__dirname}/core/${machineName}.${info.type}.js`);
    } catch (e) {
      try {
        js = require(`${__dirname}/implementations/${machineName}.${info.type}.js`);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('drupal-tools no implementation for "%s" module.', machineName);
      }
    }
    /* eslint-enable  */

    const infoDirPath = dirname(file);
    const templates = {};
    allTemplates
      .forEach((filepath) => {
        if (filepath.indexOf(infoDirPath) !== 0 || filepath.indexOf('.html.twig') < 1) return;
        const name = filepath.split('-').join('_');
        templates[name] = filepath;
      });

    return {
      ...info,
      js,
      templates,
      'info file': file,
      'machine name': machineName,
    };
  }

  async readInfo(force) {
    if (!force && this._info) return this._info;
    const mapped = {};
    const scannedInfo = (this._scanned || { info: [] }).info || [];
    const infoArr = await Promise.all(scannedInfo.map(file => this.readInfoFile(file)));


    infoArr.forEach((info) => {
      if (!info.type) return;

      mapped[info.type] = mapped[info.type] || [];
      mapped[info.type].push(info);

      const collection = this.typeToCollection(info.type);
      if (collection) {
        collection.add(info);
      } else {
        // esslint-disable-next-line no-console
        console.warn('no collection for %s', info.type);
      }
    });

    this._info = mapped;
    return mapped;
  }

  getFilename(type, name, filename = null) {
    const found = this._info[type]
      .find(info => name === info['machine name']);
    if (!found) return false;
    return `${dirname(found['info file'])}${filename ? `/${filename}` : ''}`;
  }

  getPath(type, name) {
    return this.getFilename(type, name);
  }

  // eslint-disable-next-line
  getTemplate(name) {
    // eslint-disable-next-line
    console.info('getTemplate theme', this.theme);
    // eslint-disable-next-line
    console.info('getTemplate activeModules', this.activeModules);
    return false;
  }

  invokeAll(hook, args) {
    // use this.activeModules instead!
    this.modules.forEach((item) => {
      if (!item.js || typeof item.js[hook] !== 'function') return;
      item.js[hook](...args);
    });
  }

  invokeTheme(hook, args) {
    // run the hook on the base themes first
    const themes = this.theme.baseThemes;
    themes.forEach((item) => {
      if (!item.js || typeof item.js[hook] !== 'function') return;
      item.js[hook](...args);
    });

    if (!this.theme.js || typeof this.theme.js[hook] !== 'function') return;
    this.theme.js[hook](...args);
  }

  preprocess(hook, variables) {
    // eslint-disable-next-line no-param-reassign
    variables.theme_hook_original = hook;

    this.invokeAll('preprocess', [variables, hook]);
    this.invokeAll(`preprocess_${hook}`, [variables]);

    // theme engines?

    this.invokeTheme('preprocess', [variables, hook]);
    this.invokeTheme(`preprocess_${hook}`, [variables]);
  }

  themeSuggestionHook(hook, variables) { // eslint-disable-line
    // eslint-disable-next-line no-console
    console.log('themeSuggestionHook', hook);
  }

  themeSuggestionAlter(suggestion, variables) { // eslint-disable-line
    // eslint-disable-next-line no-console
    console.log('themeSuggestionAlter', suggestion);
  }

  themeSuggestionHookAlter(hook, suggestion, variables) { // eslint-disable-line
    // eslint-disable-next-line no-console
    console.log('themeSuggestionHookAlter', hook, suggestion);
  }

  themeGetSuggestions(args, base, delimiter = '__') { // eslint-disable-line
    const suggestions = [];
    let prefix = base;
    args.forEach((arg) => {
      const cleanArg = arg
        .split('/')
        .join('')
        .split('\\')
        .join('')
        .split('\0')
        .join('')
        .split('-')
        .join('_');

      const isNum = !Number.isNaN(Number.parseInt(cleanArg, 10));
      if (isNum) {
        suggestions.push(`${prefix}${delimiter}%`);
      }

      suggestions.push(`${prefix}${delimiter}${cleanArg}`);

      if (!isNum) {
        prefix += `${delimiter}${cleanArg}`;
      }
    });
    return suggestions;
  }

  // see https://api.drupal.org/api/drupal/core%21modules%21block%21templates%21block.html.twig/8.5.x
  // $elements = array(
  //   '#theme' => 'block',
  //   'content' => '--block content--',
  //   '#configuration' => array(
  //     'label_display' => true,
  //     'label' => '--block config label--',
  //     'provider' => 'provider_a_b',
  //   ),
  //   '#attributes' => array('class' => array('custom-class')),
  // );
  // return htmlentities(\Drupal::service('renderer')
  //     ->render($elements, FALSE));
  render(name, variables, options = {}) {
    const { debug } = options;
    const output = `Missing theme implementation for "${name}".`;
    let prefix = '';
    const suffix = '';

    this.preprocess(name, variables);

    // const template = this.getTemplate();

    if (debug) {
      prefix = `\n<!-- THEME ${name} Start -->${prefix}`;
      prefix = `${suffix}<!-- THEME ${name} End -->\n`;
    }

    return `${prefix}${output}${suffix}`;
  }

  binExec(cmd, opts = {}) {
    return execAsync(cmd, {
      cwd: this.rootPath,
      maxBuffer: Infinity,
      ...opts,
    }).then(cmd2JSON);
  }

  drush(cmd) {
    return this.binExec(`${this.drushBin} --uri=${this.siteURI} ${cmd} --format=json`);
  }

  composer(cmd) {
    return this.binExec(`${this.composerBin} --format=json ${cmd}`);
  }

  scan(force) {
    if (!force && this._scanned) return this._scanned;
    this._scanned = force ? {} : this._scanned || {};
    const { siteURI, rootPath, fileTypes } = this;
    const fileTypeNames = Object.keys(fileTypes);

    const opts = {
      ignore: ['**/node_modules/**', '**/test/**'],
      root: rootPath,
      cwd: rootPath,
      // debug: true,
    };

    const toObject = fileType => (files) => {
      this._scanned[fileType] = unique([
        ...(this._scanned[fileType] || []),
        ...files.filter(filepath => filepath.indexOf('test') < 0),
      ]);
    };

    const makePromise = directory => (fileType) => {
      const extension = fileTypes[fileType];
      const globPattern = `${directory}/**/*.${extension}`;

      return globAsync(globPattern, opts)
        .then(toObject(fileType));
    };

    const promises = [
      ...fileTypeNames.map(makePromise('core/modules')),
      ...fileTypeNames.map(makePromise('core/themes')),

      ...fileTypeNames.map(makePromise('modules')),
      ...fileTypeNames.map(makePromise('themes')),

      ...fileTypeNames.map(makePromise('sites/all/modules')),
      ...fileTypeNames.map(makePromise('sites/all/themes')),
      ...fileTypeNames.map(makePromise(`sites/${siteURI}/modules`)),
      ...fileTypeNames.map(makePromise(`sites/${siteURI}/themes`)),
    ];

    return Promise.all(promises)
      .then(() => this._scanned);
  }

  // https://hub.docker.com/r/wadmiraal/drupal/
  static async dockerInstall(options = {}) {
    const {
      // eslint-disable-next-line
      destination = './drupal',
      // eslint-disable-next-line
      version = '8',
    } = options;
    // ensure destination directory
    // -- set cwd to destination
    // download: https://raw.githubusercontent.com/wadmiraal/docker-drupal/master/Dockerfile
    // run: docker build -t yourname/drupal .
  }

  static async dockerRun() {
    // eslint-disable-next-line max-len
    // docker run -d -p 8080:80 -v `pwd`/modules:/var/www/sites/all/modules/custom -t wadmiraal/drupal
  }

  static async composerInstall(options = {}) {
    const {
      composerBin = 'composer',
      destination = './drupal',
      composerOptions = {},
      version = '8.x-dev',
      stability = 'dev',
      siteURI = 'default',
      // removeBefore = false,
    } = options;

    // const composerCreateProject = () => new Promise((res, rej) => {
    //   // eslint-disable-next-line no-console
    //   console.log('create-project: composer');
    //   const args = [
    //     'create-project',
    //     `drupal-composer/drupal-project:${version}`,
    //     destination,
    //     '--stability',
    //     stability,
    //     '--no-interaction',
    //   ];

    //   const proc = spawn(composerBin, args);
    //   let stderr = '';
    //   proc.stderr.on('data', (data) => {
    //     stderr += data;
    //   });
    //   proc.on('close', (code) => {
    //     if (code !== 0) {
    //       // eslint-disable-next-line no-console
    //       console.error('stderr', stderr);
    //       rej(new Error(`Process exited with code "${code}".`));
    //       return;
    //     }
    //     res();
    //   });
    //   proc.on('error', rej);
    // });


    const actions = [
      async () => {
        // eslint-disable-next-line no-console
        console.log('create-project: remove destination');
        await remove(destination);
      },

      () => new Promise((res, rej) => {
        // eslint-disable-next-line no-console
        console.log('create-project: composer');
        const args = [
          'create-project',
          `drupal-composer/drupal-project:${version}`,
          destination,
          '--stability',
          stability,
          '--no-interaction',
        ];

        const proc = spawn(composerBin, args);
        let stderr = '';
        proc.stderr.on('data', (data) => {
          stderr += data;
        });
        proc.on('close', (code) => {
          if (code !== 0) {
            // eslint-disable-next-line no-console
            console.error('stderr', stderr);
            rej(new Error(`Process exited with code "${code}".`));
            return;
          }
          res();
        });
        proc.on('error', rej);
      }),

      async () => {
        // eslint-disable-next-line no-console
        console.log('create-project: override composer.json');
        const composerJsonPath = resolve(`${destination}/composer.json`);
        let composerJson = await readJson(composerJsonPath);
        composerJson = {
          ...composerJson,
          ...composerOptions,
        };
        await writeJson(composerJsonPath, composerJson, { spaces: 2 });
      },

      async () => {
        // eslint-disable-next-line no-console
        console.log('create-project: create site directories');
        return ensureDir(`${destination}/sites/${siteURI}/files`);
      },

      async () => {
        // eslint-disable-next-line no-console
        console.log('create-project: create settings.php');
      },

      async () => {
        // eslint-disable-next-line no-console
        console.log('create-project: create local.settings.php');
      },

      async () => {
        // eslint-disable-next-line no-console
        console.log('create-project: display server configuration');
        // eslint-disable-next-line no-console
        console.log(`- Edit the ${destination}/sites/sites.php file

- Add "0.0.0.0\t${siteURI}" to your hosts file (/etc/hosts)

- Create a file called ${siteURI}.conf in /etc/apache2/sites-available with the following content:

  <VirtualHost *:80>
    # The ServerName directive sets the request scheme, hostname and port that
    # the server uses to identify itself. This is used when creating
    # redirection URLs. In the context of virtual hosts, the ServerName
    # specifies what hostname must appear in the request's Host: header to
    # match this virtual host. For the default virtual host (this file) this
    # value is not decisive as it is used as a last resort host regardless.
    # However, you must set it for any further virtual host explicitly.
    ServerName ${siteURI}
    ServerAlias *.${siteURI}

    ServerAdmin webmaster@${siteURI}
    DocumentRoot ${destination}

    # Available loglevels: trace8, ..., trace1, debug, info, notice, warn,
    # error, crit, alert, emerg.
    # It is also possible to configure the loglevel for particular
    # modules, e.g.
    #LogLevel info ssl:warn

    # ErrorLog $\{APACHE_LOG_DIR}/error.log
    # CustomLog $\{APACHE_LOG_DIR}/access.log combined
    ErrorLog ${destination}/error.log
    CustomLog ${destination}/access.log combined

    # For most configuration files from conf-available/, which are
    # enabled or disabled at a global level, it is possible to
    # include a line for only one particular virtual host. For example the
    # following line enables the CGI configuration for this host only
    # after it has been globally disabled with "a2disconf".
    #Include conf-available/serve-cgi-bin.conf
    <Directory />
      Options FollowSymLinks
      AllowOverride All
      Require all granted
    </Directory>
  </VirtualHost>

- Enable the new Apache host: sudo a2ensite /etc/apache2/sites-available/${siteURI}.conf

- Reload Apache configuration: sudo service apache2 reload

- Visit http://${siteURI}/install.php to finalize the installation of Drupal.`);
      },
    ];

    // eslint-disable-next-line no-restricted-syntax
    for (const fn of actions) {
      // eslint-disable-next-line no-await-in-loop
      await fn();
    }
  }
}
