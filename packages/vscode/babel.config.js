/**
 * Babel Configuration for Jest Testing
 * Enables ES6+ features and module transformation
 */

module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: {
        node: 'current'
      }
    }],
    '@babel/preset-typescript'
  ],

  // Environment-specific configuration
  env: {
    test: {
      presets: [
        ['@babel/preset-env', {
          targets: {
            node: 'current'
          },
          modules: 'commonjs'
        }],
        '@babel/preset-typescript'
      ]
    }
  }
};
