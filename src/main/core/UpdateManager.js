import { EventEmitter } from "events"
import { resolve } from "path"
import { dialog } from "electron"
import is from "electron-is"
import { autoUpdater } from "electron-updater"

import logger from "./Logger"

if ( is.dev() ) {
  autoUpdater.updateConfigPath = resolve( __dirname, "../../../app-update.yml" )
}

export default class UpdateManager extends EventEmitter {
  constructor ( options = {} ) {
    super()
    this.options = options

    this.updater = autoUpdater
    this.updater.autoDownload = false
    this.updater.logger = logger
    this.autoCheckData = {
      checkEnable: this.options.autoCheck,
      userCheck: false
    }
    this.init()
  }

  init () {
    // Event: error
    // Event: checking-for-update
    // Event: update-available
    // Event: update-not-available
    // Event: download-progress
    // Event: update-downloaded

    this.updater.on( "checking-for-update", this.checkingForUpdate.bind( this ) )
    this.updater.on( "update-available", this.updateAvailable.bind( this ) )
    this.updater.on( "update-not-available", this.updateNotAvailable.bind( this ) )
    this.updater.on( "download-progress", this.updateDownloadProgress.bind( this ) )
    this.updater.on( "update-downloaded", this.updateDownloaded.bind( this ) )
    this.updater.on( "error", this.updateError.bind( this ) )

    if ( this.autoCheckData.checkEnable ) {
      this.autoCheckData.userCheck = false
      this.updater.checkForUpdates()
    }
  }

  check () {
    this.autoCheckData.userCheck = true
    this.updater.checkForUpdates()
  }

  checkingForUpdate () {
    this.emit( "checking" )
  }

  updateAvailable ( event, info ) {
    this.emit( "update-available", info )
    dialog.showMessageBox( {
      type: "info",
      title: "app.check-for-updates-title",
      message: "app.update-available-message",
      buttons: [ "app.yes", "app.no" ],
      cancelId: 1
    } ).then( async ( { response } ) => {
      if ( response === 0 ) {
        await this.updater.downloadUpdate()
      }
    } )
  }

  updateNotAvailable ( event, info ) {
    this.emit( "update-not-available", info )
    if ( this.autoCheckData.userCheck ) {
      dialog.showMessageBox( {
        title: "app.check-for-updates-title",
        message: "app.update-not-available-message"
      } )
    }
  }

  /**
   * autoUpdater:download-progress
   * @param {Object} event
   * progress,
   * bytesPerSecond,
   * percent,
   * total,
   * transferred
   */
  updateDownloadProgress ( event ) {
    this.emit( "download-progress", event )
  }

  updateDownloaded ( event, info ) {
    this.emit( "update-downloaded", info )
    this.updater.logger.log( `Update Downloaded: ${info}` )
    dialog.showMessageBox( {
      title: "app.check-for-updates-title",
      message: "app.update-downloaded-message"
    } ).then( _ => {
      this.emit( "will-updated" )
      setImmediate( () => {
        this.updater.quitAndInstall()
      } )
    } )
  }

  updateError ( event, error ) {
    this.emit( "update-error", error )
    const msg = ( error == null )
      ? "update-error-message"
      : ( error.stack || error ).toString()

    this.updater.logger.warn( `Update-error: ${msg}` )
    dialog.showErrorBox( msg )
  }
}
