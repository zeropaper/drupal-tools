module.exports = {
  use: [
    '@neutrinojs/airbnb-base',
    [
      '@neutrinojs/library',
      {
        name: 'drupal-tools'
      }
    ],
    '@neutrinojs/jest'
  ]
};
