"use strict"

process.env.BABEL_ENV = "renderer"

const path = require( "path" )
const { DefinePlugin, LoaderOptionsPlugin, NoEmitOnErrorsPlugin, HotModuleReplacementPlugin } = require( "webpack" )
const TerserPlugin = require( "terser-webpack-plugin" )
const NodeExternals = require( "webpack-node-externals" )
const CopyWebpackPlugin = require( "copy-webpack-plugin" )
const MiniCssExtractPlugin = require( "mini-css-extract-plugin" )
const OptimizeCSSPlugin = require( "optimize-css-assets-webpack-plugin" )
const HtmlWebpackPlugin = require( "html-webpack-plugin" )
const { VueLoaderPlugin } = require( "vue-loader" )
const ESLintPlugin = require( "eslint-webpack-plugin" )
const { PROJECT_TITLE, IS_DEV, IS_PROD } = require( "./constants" )

const {
  RENDERER_SOURCES_ENTRY,
  BUILD_ELECTRON_DIRECTORY,
  RENDERER_SOURCES_DIRECTORY,
  SHARED_SOURCES_DIRECTORY, HTML_TEMPLATE, PROJECT_ROOT, STATIC_SOURCES_DIRECTORY, STATIC_BUILD_DIRECTORY
} = require( "./constants" )

const rendererConfig = {
  target: "electron-renderer",
  entry: {
    index: [ RENDERER_SOURCES_ENTRY ]
  },
  output: {
    filename: "[name].js",
    libraryTarget: "commonjs2",
    path: BUILD_ELECTRON_DIRECTORY,
    globalObject: "this",
    publicPath: ""
  },
  externals: [
    new NodeExternals( {
      allowlist: [ "vue" ]
    } )
  ],
  module: {
    rules: [
      {
        test: /\.worker\.js$/,
        use: {
          loader: "worker-loader",
          options: { filename: "[name].js" }
        }
      },
      {
        test: /\.scss$/,
        use: [
          IS_DEV ? "vue-style-loader" : MiniCssExtractPlugin.loader,
          "css-loader",
          {
            loader: "sass-loader",
            options: {
              implementation: require( "sass" ),
              // additionalData: "@import \"@/components/Theme/Variables.scss\";",
              sassOptions: {
                includePaths: [ __dirname, "src" ]
              }
            }
          }
        ]
      },
      {
        test: /\.sass$/,
        use: [
          IS_DEV ? "vue-style-loader" : MiniCssExtractPlugin.loader,
          "css-loader",
          {
            loader: "sass-loader",
            options: {
              implementation: require( "sass" ),
              indentedSyntax: true,
              // additionalData: "@import \"@/components/Theme/Variables.scss\";",
              sassOptions: {
                includePaths: [ __dirname, "src" ]
              }
            }
          }
        ]
      },
      {
        test: /\.less$/,
        use: [
          IS_DEV ? "vue-style-loader" : MiniCssExtractPlugin.loader,
          "css-loader",
          "less-loader"
        ]
      },
      {
        test: /\.css$/,
        use: [
          IS_DEV ? "vue-style-loader" : MiniCssExtractPlugin.loader,
          "css-loader"
        ]
      },
      {
        test: /\.js$/,
        use: "babel-loader",
        exclude: /node_modules/
      },
      {
        test: /\.node$/,
        use: "node-loader"
      },
      {
        test: /\.vue$/,
        use: {
          loader: "vue-loader",
          options: {
            extractCSS: process.env.NODE_ENV === "production",
            loaders: {
              sass: "vue-style-loader!css-loader!sass-loader?indentedSyntax=1",
              scss: "vue-style-loader!css-loader!sass-loader",
              less: "vue-style-loader!css-loader!less-loader"
            }
          }
        }
      },
      {
        test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
        use: {
          loader: "url-loader",
          options: {
            limit: 10000,
            name: "imgs/[name]--[folder].[ext]"
          }
        }
      },
      {
        test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
        loader: "url-loader",
        options: {
          limit: 10000,
          name: "media/[name]--[folder].[ext]"
        }
      },
      {
        test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
        use: {
          loader: "url-loader",
          options: {
            limit: 10000,
            name: "fonts/[name]--[folder].[ext]"
          }
        }
      }
    ]
  },
  node: {
    __dirname: IS_DEV,
    __filename: IS_DEV
  },
  resolve: {
    alias: {
      "@": RENDERER_SOURCES_DIRECTORY,
      "@shared": SHARED_SOURCES_DIRECTORY,
      vue$: "vue/dist/vue.esm.js"
    },
    extensions: [ ".js", ".vue", ".json", ".css", ".node" ]
  },
  plugins: [
    new VueLoaderPlugin(),
    new MiniCssExtractPlugin( {
      filename: "[name].css",
      chunkFilename: "[id].css"
    } ),
    new OptimizeCSSPlugin( {
      cssProcessorOptions: {
        safe: true,
        discardComments: { removeAll: true }
      }
    } ),
    new HtmlWebpackPlugin( {
      title: PROJECT_TITLE,
      filename: "index.html",
      chunks: [ "index" ],
      template: HTML_TEMPLATE,
      // minify: {
      //   collapseWhitespace: true,
      //   removeAttributeQuotes: true,
      //   removeComments: true
      // },
      isBrowser: false,
      isDev: IS_DEV,
      nodeModules: IS_DEV
        ? path.resolve( PROJECT_ROOT, "./node_modules" )
        : false
    } ),
    new HotModuleReplacementPlugin(),
    new NoEmitOnErrorsPlugin(),
    new ESLintPlugin( {
      extensions: [ "js", "vue" ],
      formatter: require( "eslint-friendly-formatter" )
    } )
  ],
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
  rendererConfig.devtool = "eval-cheap-module-source-map"

  rendererConfig.plugins.push(
    new DefinePlugin( {
      IS_DEV,
      IS_PROD,
      __static: JSON.stringify( STATIC_SOURCES_DIRECTORY )
    } )
  )
}

if ( IS_PROD ) {
  rendererConfig.plugins.push(
    new CopyWebpackPlugin( {
      patterns: [ {
        from: STATIC_SOURCES_DIRECTORY,
        to: STATIC_BUILD_DIRECTORY,
        globOptions: { ignore: [ ".*" ] }
      } ]
    } ),
    new DefinePlugin( {
      IS_DEV,
      IS_PROD,
      "process.env.NODE_ENV": JSON.stringify( "production" )
    } ),
    new LoaderOptionsPlugin( {
      minimize: false
    } )
  )
}

module.exports = rendererConfig
