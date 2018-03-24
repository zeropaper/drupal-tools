module.exports = {
  use: [
    ['@neutrinojs/airbnb-base', {
      eslint: {
        rules: {
          'no-underscore-dangle': 'off',
          'object-curly-newline': 'off'
        }
      }
    }],
    ['@neutrinojs/library', {
      name: 'drupal-tools',
      target: 'node',
      libraryTarget: 'commonjs2',
      // Add additional Babel plugins, presets, or env options
      babel: {
        plugins: [
          'transform-object-rest-spread'
        // ],
        // // Override options for babel-preset-env
        // presets: [
        //   ['babel-preset-env', {
        //     targets: {
        //       node: '9.0'
        //     }
        //   }]
        ]
      },
    }],
    '@neutrinojs/jest'
  ]
};
