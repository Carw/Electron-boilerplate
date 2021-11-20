import { EventEmitter } from "events"
import { app, ipcMain, shell } from "electron"
import is from "electron-is"
import { isEmpty } from "lodash"

import AutoLaunchManager from "./core/AutoLaunchManager"
import EnergyManager from "./core/EnergyManager"
import UpdateManager from "./core/UpdateManager"
import logger from "./core/Logger"
import ConfigManager from "./core/ConfigManager"
import MenuManager from "./ui/MenuManager"
import WindowManager from "./ui/WindowManager"
import ThemeManager from "./ui/ThemeManager"
import TrayManager from "./ui/TrayManager"
import DockManager from "./ui/DockManager"

import { APP_RUN_MODE, AUTO_CHECK_UPDATE_INTERVAL } from "../shared/constants"
import { checkIsNeedRun } from "../shared/utils"

export default class Application extends EventEmitter {
  constructor () {
    super()
    this.isReady = false
    this.init()
  }

  init () {
    console.log( "Application Ready" )
    this.configManager = new ConfigManager()

    this.setupApplicationMenu()
    this.initWindowManager()
    this.initThemeManager()
    this.initTrayManager()
    this.initDockManager()
    this.autoLaunchManager = new AutoLaunchManager()
    this.energyManager = new EnergyManager()
    this.initUpdaterManager()
    this.handleCommands()
    this.handleEvents()
    this.handleIpcMessages()
    this.handleIpcInvokes()
    this.emit( "application:initialized" )
  }

  start ( page, options = {} ) {
    const win = this.showPage( page, options )

    win.once( "ready-to-show", () => {
      this.isReady = true
      this.emit( "ready" )
    } )
  }

  showPage ( page, options = {} ) {
    const { openedAtLogin } = options
    const autoHideWindow = this.configManager.getUserConfig( "auto-hide-window" )
    return this.windowManager.openWindow( page, {
      hidden: openedAtLogin || autoHideWindow
    } )
  }

  show ( page = "index" ) {
    this.windowManager.showWindow( page )
  }

  async stop () {
    try {
      await this.shutdownUPnPManager()

      this.energyManager.stopPowerSaveBlocker()

      await this.stopEngine()

      this.trayManager.destroy()
    } catch ( err ) {
      logger.warn( "[Motrix] stop error: ", err.message )
    }
  }

  async quit () {
    await this.stop()
    app.exit()
  }

  setupApplicationMenu () {
    this.menuManager = new MenuManager()
    this.menuManager.setup( this.locale )
  }

  initWindowManager () {
    this.windowManager = new WindowManager( {
      userConfig: this.configManager.getUserConfig()
    } )

    this.windowManager.on( "window-resized", ( data ) => {
      this.storeWindowState( data )
    } )

    this.windowManager.on( "window-moved", ( data ) => {
      this.storeWindowState( data )
    } )

    this.windowManager.on( "window-closed", ( data ) => {
      this.storeWindowState( data )
    } )

    this.windowManager.on( "enter-full-screen", async ( window ) => {
      await this.dockManager.show()
    } )

    this.windowManager.on( "leave-full-screen", ( window ) => {
      const mode = this.configManager.getUserConfig( "run-mode" )
      if ( mode !== APP_RUN_MODE.STANDARD ) {
        this.dockManager.hide()
      }
    } )
  }

  storeWindowState ( data = {} ) {
    const enabled = this.configManager.getUserConfig( "keep-window-state" )
    if ( !enabled ) {
      return
    }

    const state = this.configManager.getUserConfig( "window-state", {} )
    const { page, bounds } = data
    const newState = {
      ...state,
      [ page ]: bounds
    }
    this.configManager.setUserConfig( "window-state", newState )
  }

  initThemeManager () {
    this.themeManager = new ThemeManager()
    this.themeManager.on( "system-theme-change", ( theme ) => {
      this.trayManager.handleSystemThemeChange( theme )
      this.sendCommandToAll( "application:update-system-theme", { theme } )
    } )
  }

  sendCommandToAll ( command, ...args ) {
    if ( !this.emit( command, ...args ) ) {
      this.windowManager.getWindowList().forEach( window => {
        this.windowManager.sendCommandTo( window, command, ...args )
      } )
    }
  }

  initTrayManager () {
    this.trayManager = new TrayManager( {
      theme: this.configManager.getUserConfig( "tray-theme" ),
      systemTheme: this.themeManager.getSystemTheme(),
      speedometer: this.configManager.getUserConfig( "tray-speedometer" )
    } )
  }

  initDockManager () {
    this.dockManager = new DockManager( {
      runMode: this.configManager.getUserConfig( "run-mode" )
    } )
  }

  initUpdaterManager () {
    if ( is.mas() ) {
      return
    }

    const enabled = this.configManager.getUserConfig( "auto-check-update" )
    const lastTime = this.configManager.getUserConfig( "last-check-update-time" )
    this.updateManager = new UpdateManager( {
      autoCheck: checkIsNeedRun( enabled, lastTime, AUTO_CHECK_UPDATE_INTERVAL )
    } )
    this.handleUpdaterEvents()
  }

  handleUpdaterEvents () {
    this.updateManager.on( "checking", ( event ) => {
      this.menuManager.updateMenuItemEnabledState( "app.check-for-updates", false )
      this.trayManager.updateMenuItemEnabledState( "app.check-for-updates", false )
      this.configManager.setUserConfig( "last-check-update-time", Date.now() )
    } )

    this.updateManager.on( "download-progress", ( event ) => {
      const win = this.windowManager.getWindow( "index" )
      win.setProgressBar( event.percent / 100 )
    } )

    this.updateManager.on( "update-not-available", ( event ) => {
      this.menuManager.updateMenuItemEnabledState( "app.check-for-updates", true )
      this.trayManager.updateMenuItemEnabledState( "app.check-for-updates", true )
    } )

    this.updateManager.on( "update-downloaded", ( event ) => {
      this.menuManager.updateMenuItemEnabledState( "app.check-for-updates", true )
      this.trayManager.updateMenuItemEnabledState( "app.check-for-updates", true )
      const win = this.windowManager.getWindow( "index" )
      win.setProgressBar( 0 )
    } )

    this.updateManager.on( "will-updated", ( event ) => {
      this.windowManager.setWillQuit( true )
    } )

    this.updateManager.on( "update-error", ( event ) => {
      this.menuManager.updateMenuItemEnabledState( "app.check-for-updates", true )
      this.trayManager.updateMenuItemEnabledState( "app.check-for-updates", true )
    } )
  }

  handleCommands () {
    this.on( "application:save-preference", this.savePreference )

    this.on( "application:update-tray", async ( tray ) => {
      await this.trayManager.updateTrayByImage( tray )
    } )

    this.on( "application:relaunch", () => {
      this.relaunch()
    } )

    this.on( "application:quit", async () => {
      await this.quit()
    } )

    this.on( "application:open-at-login", async ( openAtLogin ) => {
      if ( is.linux() ) {
        return
      }

      if ( openAtLogin ) {
        await this.autoLaunchManager.enable()
      } else {
        await this.autoLaunchManager.disable()
      }
    } )

    this.on( "application:show", ( { page } ) => {
      this.show( page )
    } )

    this.on( "application:hide", ( { page } ) => {
      this.hide( page )
    } )

    this.on( "application:reset", () => {
      this.configManager.reset()
      this.relaunch()
    } )

    this.on( "application:check-for-updates", () => {
      this.updateManager.check()
    } )

    this.on( "application:change-theme", ( theme ) => {
      this.themeManager.updateAppAppearance( theme )
      this.sendCommandToAll( "application:update-theme", { theme } )
    } )

    this.on( "application:toggle-dock", async ( visible ) => {
      if ( visible ) {
        await this.dockManager.show()
      } else {
        this.dockManager.hide()
        // Hiding the dock icon will trigger the entire app to hide.
        this.show()
      }
    } )

    this.on( "application:auto-hide-window", ( hide ) => {
      if ( hide ) {
        this.windowManager.handleWindowBlur()
      } else {
        this.windowManager.unbindWindowBlur()
      }
    } )

    this.on( "application:change-menu-states", ( visibleStates, enabledStates, checkedStates ) => {
      this.menuManager.updateMenuStates( visibleStates, enabledStates, checkedStates )
      this.trayManager.updateMenuStates( visibleStates, enabledStates, checkedStates )
    } )

    this.on( "help:official-website", async () => {
      const url = "https://my.app/"
      await shell.openExternal( url )
    } )

    this.on( "help:manual", async () => {
      const url = "https://my.app/manual"
      await shell.openExternal( url )
    } )

    this.on( "help:release-notes", async () => {
      const url = "https://my.app/release"
      await shell.openExternal( url )
    } )

    this.on( "help:report-problem", async () => {
      const url = "https://my.app/report"
      await shell.openExternal( url )
    } )
  }

  savePreference ( config = {} ) {
    logger.info( "Save preference:", config )
    const { system, user } = config
    if ( !isEmpty( system ) ) {
      console.info( "Main save system config: ", system )
      this.configManager.setSystemConfig( system )
    }

    if ( !isEmpty( user ) ) {
      console.info( "Main save user config: ", user )
      this.configManager.setUserConfig( user )
    }
  }

  relaunch () {
    this.stop()
    app.relaunch()
    app.exit()
  }

  hide ( page ) {
    if ( page ) {
      this.windowManager.hideWindow( page )
    } else {
      this.windowManager.hideAllWindow()
    }
  }

  handleEvents () {
    this.once( "application:initialized", () => {
      this.autoResumeTask()
      this.adjustMenu()
    } )

    this.configManager.userConfig.onDidAnyChange( () => this.handleConfigChange( "user" ) )
    this.configManager.systemConfig.onDidAnyChange( () => this.handleConfigChange( "system" ) )

    this.on( "download-status-change", async ( downloading ) => {
      await this.trayManager.handleDownloadStatusChange( downloading )
      if ( downloading ) {
        this.energyManager.startPowerSaveBlocker()
      } else {
        this.energyManager.stopPowerSaveBlocker()
      }
    } )

    this.on( "speed-change", async ( speed ) => {
      await this.dockManager.handleSpeedChange( speed )
      await this.trayManager.handleSpeedChange( speed )
    } )

    this.on( "task-download-complete", ( task, path ) => {
      this.dockManager.openDock( path )
    } )
  }

  autoResumeTask () {
    const enabled = this.configManager.getUserConfig( "resume-all-when-app-launched" )
    if ( !enabled ) {
      return
    }
    console.info( "Resume tasks" )
  }

  adjustMenu () {
    if ( is.mas() ) {
      const visibleStates = {
        "app.check-for-updates": false,
        "task.new-bt-task": false
      }
      this.menuManager.updateMenuStates( visibleStates, null, null )
      this.trayManager.updateMenuStates( visibleStates, null, null )
    }
  }

  handleIpcMessages () {
    ipcMain.on( "command", ( event, command, ...args ) => {
      logger.log( "Ipc receive command", command, ...args )
      this.emit( command, ...args )
    } )

    ipcMain.on( "event", ( event, eventName, ...args ) => {
      logger.log( "Ipc receive event", eventName, ...args )
      this.emit( eventName, ...args )
    } )
  }

  handleIpcInvokes () {
    ipcMain.handle( "get-app-config", async () => {
      const systemConfig = this.configManager.getSystemConfig()
      const userConfig = this.configManager.getUserConfig()
      return {
        ...systemConfig,
        ...userConfig
      }
    } )
  }
}
