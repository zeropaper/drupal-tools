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
    '@neutrinojs/jest'
  ]
};
