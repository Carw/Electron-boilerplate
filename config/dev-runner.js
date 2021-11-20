"use strict"

const chalk = require( "chalk" )
const electron = require( "electron" )
// const { say } = require( "cfonts" )
const { spawn } = require( "child_process" )
const webpack = require( "webpack" )
const { merge } = require( "webpack-merge" )
const WebpackDevServer = require( "webpack-dev-server" )
const webpackHotMiddleware = require( "webpack-hot-middleware" )
const HtmlWebpackPlugin = require( "html-webpack-plugin" )
const {
  RENDER_DEV_CLIENT,
  RENDERER_SOURCES_ENTRY,
  RENDER_PORT,
  PROJECT_ROOT,
  MAIN_DEV_CLIENT,
  MAIN_SOURCES_ENTRY,
  DIST_DIRECTORY_ENTRY
} = require( "./constants" )

const rendererConfig = require( "./webpack.renderer" )
const mainConfig = require( "./webpack.main" )

let electronProcess = null
let manualRestart = false
let hotMiddleware

function logStats ( proc, data ) {
  let log = ""

  const processInfo = new Array( ( 19 - proc.length ) + 1 ).join( "-" )
  log += chalk.yellow.bold( `┏ ${proc} Process ${processInfo}` )
  log += "\n\n"

  if ( typeof data === "object" ) {
    data.toString( {
      colors: true,
      chunks: false
    } )
      .split( /\r?\n/ )
      .forEach( line => {
        log += "  " + line + "\n"
      } )
  } else {
    log += `  ${data}\n`
  }

  log += "\n" + chalk.yellow.bold( `┗ ${new Array( 28 + 1 ).join( "-" )}` ) + "\n"

  console.log( log )
}

function electronLog ( data, color ) {
  let log = ""
  data = data.toString().split( /\r?\n/ )
  data.forEach( line => {
    log += `  ${line}\n`
  } )
  if ( /[0-9A-z]+/.test( log ) ) {
    console.log(
      chalk[ color ].bold( "┏ Electron -------------------" ) +
      "\n\n" +
      log +
      chalk[ color ].bold( "┗ ----------------------------" ) +
      "\n"
    )
  }
}

function startRenderer () {
  return new Promise( resolve => {
    const renderWebpackConfig = merge( rendererConfig, {
      mode: "development",
      entry: [ RENDER_DEV_CLIENT, RENDERER_SOURCES_ENTRY ]
    } )

    const compiler = webpack( renderWebpackConfig )

    hotMiddleware = webpackHotMiddleware( compiler, {
      log: false,
      heartbeat: 2500
    } )

    compiler.hooks.compilation.tap( "compilation", compilation => {
      HtmlWebpackPlugin.getHooks( compilation )
        .afterEmit
        .tapAsync( "html-webpack-plugin-after-emit", ( data, callback ) => {
          hotMiddleware.publish( { action: "reload" } )
          callback()
        } )
    } )

    compiler.hooks.done.tap( "done", stats => {
      logStats( "Renderer", stats )
    } )

    const server = new WebpackDevServer(
      compiler,
      {
        contentBase: PROJECT_ROOT,
        quiet: true,
        before ( app, ctx ) {
          app.use( hotMiddleware )
          ctx.middleware.waitUntilValid( () => {
            resolve()
          } )
        }
      }
    )
    server.listen( RENDER_PORT )
  } )
}

function startElectron () {
  electronProcess = spawn( electron, [ "--inspect=5858", DIST_DIRECTORY_ENTRY ] )

  electronProcess.stdout.on( "data", data => {
    electronLog( data, "blue" )
  } )
  electronProcess.stderr.on( "data", data => {
    electronLog( data, "red" )
  } )

  electronProcess.on( "close", () => {
    if ( !manualRestart ) {
      process.exit()
    }
  } )
}

function startMain () {
  return new Promise( resolve => {
    const mainWebpackConfig = merge( mainConfig, {
      mode: "development",
      entry: {
        main: [ MAIN_DEV_CLIENT, MAIN_SOURCES_ENTRY ]
      }
    } )

    const compiler = webpack( mainWebpackConfig )

    compiler.hooks.watchRun.tapAsync( "watch-run", ( compilation, done ) => {
      logStats( "Main", chalk.white.bold( "compiling..." ) )
      hotMiddleware.publish( { action: "compiling" } )
      done()
    } )

    compiler.watch( {}, ( err, stats ) => {
      if ( err ) {
        console.log( err )
        return
      }

      logStats( "Main", stats )

      if ( electronProcess && electronProcess.kill ) {
        manualRestart = true
        process.kill( electronProcess.pid )
        electronProcess = null
        startElectron()

        setTimeout( () => {
          manualRestart = false
        }, 5000 )
      }
      resolve()
    } )
  } )
}

function init () {
  Promise.all( [ startRenderer(), startMain() ] )
    .then( () => {
      startElectron()
    } )
    .catch( err => {
      console.error( err )
    } )
}

init()
