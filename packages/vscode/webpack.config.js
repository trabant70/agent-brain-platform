const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

/** @type {import('webpack').Configuration} */
const extensionConfig = {
  target: 'node',
  mode: 'production',
  entry: './src/extension.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
    clean: true
  },
  externals: {
    vscode: 'commonjs vscode'
  },
  resolve: {
    extensions: ['.js', '.ts'],
    mainFields: ['main', 'module'],
    alias: {
      '@agent-brain/shared': path.resolve(__dirname, '../shared/dist/index.js'),
      '@agent-brain/core': path.resolve(__dirname, '../core/dist/index.js'),
      '@agent-brain/timeline': path.resolve(__dirname, '../timeline/dist'),
      '@agent-brain/testing': path.resolve(__dirname, '../testing/dist')
    }
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: path.resolve(__dirname, 'tsconfig.json')
            }
          }
        ]
      }
    ]
  },
  plugins: [
    new CleanWebpackPlugin()
  ]
};

/** @type {import('webpack').Configuration} */
const webviewConfig = {
  target: 'web',
  mode: 'production',
  entry: {
    'webview-main': path.resolve(__dirname, '../timeline/src/webview/main.ts')
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: false
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@agent-brain/shared': path.resolve(__dirname, '../shared/src')
    }
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              compilerOptions: {
                module: 'esnext'
              }
            }
          }
        ]
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, '../timeline/src/visualization/templates/timeline.html'),
      filename: 'timeline.html',
      chunks: ['webview-main']
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, '../timeline/src/visualization/styles'),
          to: 'styles'
        }
      ]
    })
  ]
};

module.exports = [extensionConfig, webviewConfig];
