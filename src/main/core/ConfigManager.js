import { app } from "electron"
import Store from "electron-store"

import {
  LOGIN_SETTING_OPTIONS,
  APP_RUN_MODE
} from "../../shared/constants"

export default class ConfigManager {
  constructor () {
    this.systemConfig = {}
    this.userConfig = {}

    this.init()
  }

  init () {
    this.initSystemConfig()
    this.initUserConfig()
  }

  initSystemConfig () {
    this.systemConfig = new Store( {
      name: "system",
      defaults: {}
    } )
  }

  initUserConfig () {
    this.userConfig = new Store( {
      name: "user",
      defaults: {
        "keep-window-state": false,
        "open-at-login": false,
        "run-mode": APP_RUN_MODE.STANDARD,
        "window-state": {}
      }
    } )
    this.fixUserConfig()
  }

  fixUserConfig () {
    const openAtLogin = app.getLoginItemSettings( LOGIN_SETTING_OPTIONS ).openAtLogin
    if ( this.getUserConfig( "open-at-login" ) !== openAtLogin ) {
      this.setUserConfig( "open-at-login", openAtLogin )
    }
  }

  getSystemConfig ( key, defaultValue ) {
    if ( typeof key === "undefined" &&
      typeof defaultValue === "undefined" ) {
      return this.systemConfig.store
    }

    return this.systemConfig.get( key, defaultValue )
  }

  getUserConfig ( key, defaultValue ) {
    if ( typeof key === "undefined" &&
      typeof defaultValue === "undefined" ) {
      return this.userConfig.store
    }
    return this.userConfig.get( key, defaultValue )
  }

  setSystemConfig ( ...args ) {
    this.systemConfig.set( ...args )
  }

  setUserConfig ( ...args ) {
    this.userConfig.set( ...args )
  }

  reset () {
    this.systemConfig.clear()
    this.userConfig.clear()
  }
}
