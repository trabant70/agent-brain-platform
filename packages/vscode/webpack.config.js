const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = !isProduction;

/**
 * Extension configuration (Node.js target)
 */
const extensionConfig = {
  target: 'node',
  mode: isProduction ? 'production' : 'development',
  entry: './src/extension.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]'
  },
  externals: {
    vscode: 'commonjs vscode'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [{
          loader: 'ts-loader',
          options: {
            configFile: path.resolve(__dirname, 'tsconfig.json')
          }
        }]
      }
    ]
  },
  devtool: isProduction ? 'nosources-source-map' : 'source-map',
  infrastructureLogging: {
    level: 'log'
  }
};

/**
 * Webview configuration (Browser target)
 */
const webviewConfig = {
  target: 'web',
  mode: isProduction ? 'production' : 'development',
  entry: {
    webview: './src/webview/main.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist/webview'),
    filename: isProduction ? '[name].[contenthash].js' : '[name].js',
    clean: true,
    assetModuleFilename: 'assets/[name].[contenthash][ext]'
  },
  resolve: {
    extensions: ['.ts', '.js', '.json'],
    alias: {
      '@visualization': path.resolve(__dirname, 'src/visualization'),
      '@webview': path.resolve(__dirname, 'src/webview')
    },
    fallback: {
      'fs': false,
      'path': false,
      'util': false
    }
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [{
          loader: 'ts-loader',
          options: {
            configFile: path.resolve(__dirname, 'tsconfig.webview.json'),
            transpileOnly: isDevelopment
          }
        }],
        exclude: /node_modules/
      },
      {
        test: /\.js$/,
        enforce: 'pre',
        use: ['source-map-loader'],
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              sourceMap: true
            }
          }
        ]
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource'
      }
    ]
  },
  plugins: [
    new CleanWebpackPlugin({
      cleanOnceBeforeBuildPatterns: ['**/*', '!extension.*']
    }),
    new HtmlWebpackPlugin({
      template: './src/visualization/templates/timeline.html',
      filename: 'webview.html',
      inject: 'body',
      minify: isProduction ? {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true
      } : false
    })
  ],
  optimization: {
    minimize: isProduction,
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        }
      }
    },
    usedExports: true,
    sideEffects: false
  },
  ...(isDevelopment && {
    mode: 'development',
    devtool: 'source-map',
    performance: {
      hints: false
    }
  }),
  ...(isProduction && {
    mode: 'production',
    devtool: 'nosources-source-map',
    performance: {
      hints: 'warning',
      maxEntrypointSize: 512000,
      maxAssetSize: 512000
    }
  })
};

module.exports = [extensionConfig, webviewConfig];
