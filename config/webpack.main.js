"use strict"

const { NoEmitOnErrorsPlugin, DefinePlugin } = require( "webpack" )
const TerserPlugin = require( "terser-webpack-plugin" )
const NodeExternals = require( "webpack-node-externals" )
const ESLintPlugin = require( "eslint-webpack-plugin" )
const ESLintFormatter = require( "eslint-friendly-formatter" )
const {
  build,
  BUILD_ELECTRON_DIRECTORY,
  MAIN_SOURCES_ENTRY,
  MAIN_SOURCES_DIRECTORY,
  STATIC_SOURCES_DIRECTORY,
  SHARED_SOURCES_DIRECTORY,
  IS_DEV,
  IS_PROD
} = require( "./constants" )

process.env.BABEL_ENV = "main"

const mainConfig = {
  mode: "none",
  entry: {
    main: MAIN_SOURCES_ENTRY
  },
  output: {
    filename: "[name].js",
    libraryTarget: "commonjs2",
    path: BUILD_ELECTRON_DIRECTORY
  },
  externals: [ new NodeExternals() ],
  module: {
    rules: [
      {
        test: /\.js$/,
        use: "babel-loader",
        exclude: /node_modules/
      },
      {
        test: /\.node$/,
        use: "node-loader"
      }
    ]
  },
  node: {
    __dirname: IS_DEV,
    __filename: IS_DEV
  },
  plugins: [
    new NoEmitOnErrorsPlugin(),
    new ESLintPlugin( {
      formatter: ESLintFormatter
    } )
  ],
  resolve: {
    alias: {
      "@": MAIN_SOURCES_DIRECTORY,
      "@shared": SHARED_SOURCES_DIRECTORY
    },
    extensions: [ ".js", ".json", ".node" ]
  },
  target: "electron-main",
  optimization: {
    minimize: IS_PROD,
    minimizer: [
      new TerserPlugin( {
        extractComments: false
      } )
    ]
  }
}

if ( IS_DEV ) {
  mainConfig.plugins.push(
    new DefinePlugin( {
      IS_DEV,
      IS_PROD,
      __static: `"${STATIC_SOURCES_DIRECTORY}"`,
      appId: `"${build.appId}"`
    } )
  )
}

if ( IS_PROD ) {
  mainConfig.plugins.push(
    new DefinePlugin( {
      IS_DEV,
      IS_PROD,
      // "process.env.NODE_ENV": "\"production\"",
      appId: `"${build.appId}"`
    } )
  )
}

module.exports = mainConfig
