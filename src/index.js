const { relative, basename, dirname } = require('path');
const { statSync, readFile } = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');
const glob = require('glob');
const yaml = require('yaml-js');

const readFileAsync = promisify(readFile);
const execAsync = promisify(exec);

export class DrupalSite {
  constructor(siteURI) {
    this._siteURI = siteURI;
  }
}

export class DrupalLibrary {
  constructor() {}
}

export class DrupalModule {
  constructor(infoFileObject) {}
}

export class DrupalEngine {
  constructor(infoFileObject) {}
}

export class DrupalTheme {
  constructor(infoFileObject) {}
}

export class DrupalVendor {
  constructor() {}
}

export class Collection {
  constructor(Model, data, opts = {
    sort: false
  }) {
    this.Model = Model;
    this.reset(data);
  }

  get data() {
    return this._data;
  }

  add(item) {
    this._data.push(new this.Model(item));
  }

  reset(data) {
    data.forEach(this.add);
    return this;
  }
}

const cmd2JSON = result => ({
  stdout: JSON.parse(result.stdout || 'null'),
  stderr: result.stderr,
})

export default class Drupal {
  constructor({
    rootPath,
    siteURI,
    drushBin = './vendor/bin/drush',
    composerBin = 'composer',
  }) {
    if (!statSync(rootPath).isDirectory()) {
      throw new Error(`"${rootPath}" is not a directory.`);
    }
    this.sites = new Collection(DrupalSite, []);
    this.themes = new Collection(DrupalTheme, []);
    this.modules = new Collection(DrupalModule, []);
    this.libraries = new Collection(DrupalLibrary, []);
    this.vendors = new Collection(DrupalVendor, []);
    this.siteURI = siteURI;
    this.rootPath = rootPath;
    this.drushBin = drushBin;
    this.composerBin = composerBin;
  }

  get site() {
    return this.sites.find('name', this.siteURI);
  }

  get searchPattern() {
    return `{modules,themes,core/modules,core/themes,sites/{all,${this.siteURI}}}`;
  }

  absPath(file) {
    return `${this.rootPath}/${file}`;
  }

  async readInfoFile(file) {
    return readFileAsync(this.absPath(file), 'utf8')
      .then(content => ({
        ...yaml.load(content),
        'info file': file,
        'machine name': basename(basename(file, '.info.yml'), '.info.yaml'),
      }));
  }

  async readInfo() {
    const self = this;
    const scannedInfo = (this._scanned || {info: []}).info || [];
    return Promise.all(scannedInfo.map(file => this.readInfoFile(file)))
      .then((infoArr) => {
        const mapped = {};
        infoArr.forEach((info) => {
          if (!info.type) return;
          mapped[info.type] = mapped[info.type] || [];
          mapped[info.type].push(info);
        });
        self._info = mapped;
        return mapped;
      });
  }

  getFilename(type, name) {
    return this._info[type]
      .find(info => name === info['machine name'])['info file'];
  }

  getPath(type, name) {
    return dirname(this.getFilename(type, name));
  }

  async drush(cmd) {
    return execAsync(`${this.drushBin} --uri=${this.siteURI} ${cmd} --format=json`, {
      cwd: this.rootPath,
      maxBuffer: Infinity
    })
      .then(cmd2JSON);
  }

  async composer(cmd) {
    return execAsync(`${this.composerBin} --format=json ${cmd}`, {
      cwd: this.rootPath,
      maxBuffer: Infinity
    })
      .then(cmd2JSON);
  }

  scan(force) {
    if (force && this._scanned) return this._scanned;
    this._scanned = false;
    const { searchPattern, rootPath } = this;
    const fileTypes = {
      info: 'info.{yml,yaml}',
      styles: '{css,scss,sass,less}',
      scripts: '{js,jsx}',
      templates: 'html.twig',
    };
    const fileTypeNames = Object.keys(fileTypes);

    const opts = {
      root: rootPath,
      // debug: true,
    };

    const toObject = (groups) => {
      const mapped = {};
      groups.forEach((files, g) => {
        mapped[fileTypeNames[g]] = files;
      });
      this._scanned = mapped;
      return mapped;
    };

    const processFiles = files => files
      .map((file) => relative(opts.root, file))
      .filter(file => file.indexOf('test') < 0);

    const globCb = (resolve, reject) => (err, files) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(processFiles(files));
    };

    const makePromise = (fileType) => {
      const extension = fileTypes[fileType];
      const globPattern = `/${searchPattern}/**/*.${extension}`;

      return new Promise((resolve, reject) => {
        glob(globPattern, opts, globCb(resolve, reject));
      });
    };

    return Promise.all(fileTypeNames.map(makePromise))
      .then(toObject);
  }

  static async scaffold(options = {
    composerBin: 'composer',
    destination: './drupal'
  }) {

  }
};
