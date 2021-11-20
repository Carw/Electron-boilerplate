import { EventEmitter } from "events"
import { app } from "electron"
import is from "electron-is"
import { PROJECT_TITLE } from "../../config/constants"
import ExceptionHandler from "./core/ExceptionHandler"
import logger from "./core/Logger"
import Application from "./Application"

export default class Launcher extends EventEmitter {
  constructor () {
    super()

    this.makeSingleInstance( () => {
      this.init()
    } )
  }

  makeSingleInstance ( callback ) {
    if ( is.mas() ) {
      callback && callback()
      return
    }

    const gotSingleLock = app.requestSingleInstanceLock()

    if ( !gotSingleLock ) {
      app.quit()
    } else {
      app.on( "second-instance", ( event, argv, workingDirectory ) => {
        global.application.showPage( "index" )
      } )
      callback && callback()
    }
  }

  init () {
    this.exceptionHandler = new ExceptionHandler()

    this.openedAtLogin = is.macOS()
      ? app.getLoginItemSettings().wasOpenedAtLogin
      : false

    logger.info( `[${PROJECT_TITLE}] openedAtLogin:`, this.openedAtLogin )

    this.handleAppEvents()
  }

  handleAppEvents () {
    this.handleAppReady()
    this.handleAppWillQuit()
  }

  handleAppReady () {
    app.on( "ready", () => {
      console.log( "Event \"ready\"" )
      global.application = new Application()

      const { openedAtLogin } = this
      global.application.start( "index", {
        openedAtLogin
      } )
    } )

    app.on( "activate", () => {
      if ( global.application ) {
        logger.info( `[${PROJECT_TITLE}] activate` )
        global.application.showPage( "index" )
      }
    } )
  }

  handleAppWillQuit () {
    app.on( "will-quit", () => {
      logger.info( `[${PROJECT_TITLE}] will-quit` )
      if ( global.application ) {
        global.application.stop()
      }
    } )
  }
}
