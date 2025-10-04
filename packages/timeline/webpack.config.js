/**
 * Webpack Configuration - Extension + Webview Bundle
 *
 * Senior Architect Design Principles:
 * 1. Clean separation between extension (Node.js) and webview (Browser)
 * 2. Optimized bundles with tree shaking
 * 3. Development vs Production optimizations
 * 4. Source maps for debugging
 * 5. Asset optimization and caching
 */

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
        vscode: 'commonjs vscode' // VS Code API is external
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

    // Entry point for webview bundle
    entry: {
        webview: './src/webview/main.ts'
    },

    // Output configuration
    output: {
        path: path.resolve(__dirname, 'dist/webview'),
        filename: isProduction ? '[name].[contenthash].js' : '[name].js',
        clean: true, // Clean output directory before each build

        // No library configuration needed for webview bundle
        // The bundle will be loaded directly in the HTML

        // Asset optimization
        assetModuleFilename: 'assets/[name].[contenthash][ext]'
    },

    // Module resolution
    resolve: {
        extensions: ['.ts', '.js', '.json'],

        // Clean module resolution for visualization layer
        alias: {
            '@visualization': path.resolve(__dirname, 'src/visualization'),
            '@webview': path.resolve(__dirname, 'src/webview')
        },

        // Fallbacks for browser environment
        fallback: {
            'fs': false,
            'path': false,
            'util': false
        }
    },

    // Module rules
    module: {
        rules: [
            // TypeScript compilation
            {
                test: /\.ts$/,
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            configFile: path.resolve(__dirname, 'tsconfig.webview.json'),
                            transpileOnly: isDevelopment // Faster builds in dev
                        }
                    }
                ],
                exclude: /node_modules/
            },

            // Source map support
            {
                test: /\.js$/,
                enforce: 'pre',
                use: ['source-map-loader'],
                exclude: /node_modules/
            },

            // CSS handling
            {
                test: /\.css$/,
                use: [
                    'style-loader', // Inject CSS into DOM
                    {
                        loader: 'css-loader',
                        options: {
                            sourceMap: true
                        }
                    }
                ]
            },

            // Asset handling (fonts, images, etc.)
            {
                test: /\.(png|svg|jpg|jpeg|gif|woff|woff2|eot|ttf|otf)$/i,
                type: 'asset/resource'
            }
        ]
    },

    // Plugin configuration
    plugins: [
        // Clean output directory
        new CleanWebpackPlugin({
            cleanOnceBeforeBuildPatterns: ['**/*', '!extension.*'] // Don't clean extension files
        }),

        // Generate HTML template for webview
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

    // External dependencies (provided by webview environment)
    // externals: {
    //     'd3': 'd3' // D3 will be loaded separately in webview
    // },

    // Optimization
    optimization: {
        minimize: isProduction,

        // Split chunks for better caching
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

        // Tree shaking and dead code elimination
        usedExports: true,
        sideEffects: false
    },

    // Development vs Production settings
    ...(isDevelopment && {
        mode: 'development',
        devtool: 'source-map', // CSP-safe source maps

        // Performance hints off in development
        performance: {
            hints: false
        }
    }),

    ...(isProduction && {
        mode: 'production',
        devtool: 'nosources-source-map', // Production-safe source maps

        // Performance optimization
        performance: {
            hints: 'warning',
            maxEntrypointSize: 512000, // 500kb
            maxAssetSize: 512000
        }
    })
};

/**
 * Development-specific enhancements
 */
if (isDevelopment) {
    // Hot reloading would go here if we had a dev server
    // For now, we'll rely on manual rebuilds
}

/**
 * Production-specific optimizations
 */
if (isProduction) {
    // Additional production plugins could go here
    // (e.g., bundle analyzer, compression, etc.)
}

module.exports = [extensionConfig, webviewConfig];