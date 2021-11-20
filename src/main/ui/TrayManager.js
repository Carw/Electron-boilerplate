import { EventEmitter } from "events"
import { join } from "path"
import { Tray, Menu, nativeImage } from "electron"
import is from "electron-is"

import { APP_THEME } from "../../shared/constants"
import { getInverseTheme, getSystemMajorVersion } from "../../shared/utils"
import { flattenMenuItems, updateStates } from "../utils/menu"
import { convertArrayBufferToBuffer } from "../utils/theme"

let tray = null
const { platform } = process

export default class TrayManager extends EventEmitter {
  constructor ( options = {} ) {
    super()

    this.options = options
    this.theme = options.theme || APP_THEME.AUTO

    this.systemTheme = options.systemTheme
    this.inverseSystemTheme = getInverseTheme( this.systemTheme )
    this.bigSur = platform === "darwin" && getSystemMajorVersion() >= 20

    this.menu = null
    this.cache = {}

    this.init()
  }

  init () {
    this.loadTemplate()
    this.loadImages()
    this.initTray()
    this.setupMenu()
    this.handleEvents()
  }

  loadTemplate () {
    this.template = require( "../menus/tray.json" )
  }

  loadImages () {
    switch ( platform ) {
      case "darwin":
        this.loadImagesForMacOS()
        break
      case "win32":
        this.loadImagesForWindows()
        break
      case "linux":
        this.loadImagesForLinux()
        break

      default:
        this.loadImagesForDefault()
        break
    }
  }

  loadImagesForMacOS () {
    if ( this.bigSur ) {
      const {
        systemTheme,
        inverseSystemTheme
      } = this

      this.normalIcon = this.getFromCacheOrCreateImage( `mo-tray-${systemTheme}-normal.png` )
      this.activeIcon = this.getFromCacheOrCreateImage( `mo-tray-${systemTheme}-active.png` )

      this.inverseNormalIcon = this.getFromCacheOrCreateImage( `mo-tray-${inverseSystemTheme}-normal.png` )
      this.inverseActiveIcon = this.getFromCacheOrCreateImage( `mo-tray-${inverseSystemTheme}-active.png` )
    } else {
      this.normalIcon = this.getFromCacheOrCreateImage( "mo-tray-light-normal.png" )
    }
  }

  loadImagesForWindows () {
    this.normalIcon = this.getFromCacheOrCreateImage( "mo-tray-colorful-normal.png" )
    this.activeIcon = this.getFromCacheOrCreateImage( "mo-tray-colorful-active.png" )
  }

  loadImagesForLinux () {
    const { theme } = this
    if ( theme === APP_THEME.AUTO ) {
      this.normalIcon = this.getFromCacheOrCreateImage( "mo-tray-dark-normal.png" )
      this.activeIcon = this.getFromCacheOrCreateImage( "mo-tray-dark-active.png" )
    } else {
      this.normalIcon = this.getFromCacheOrCreateImage( `mo-tray-${theme}-normal.png` )
      this.activeIcon = this.getFromCacheOrCreateImage( `mo-tray-${theme}-active.png` )
    }
  }

  loadImagesForDefault () {
    this.normalIcon = this.getFromCacheOrCreateImage( "mo-tray-light-normal.png" )
    this.activeIcon = this.getFromCacheOrCreateImage( "mo-tray-light-active.png" )
  }

  getFromCacheOrCreateImage ( key ) {
    let file = this.getCache( key )
    if ( file ) {
      return file
    }

    file = nativeImage.createFromPath( join( __static, `./${key}` ) )
    file.setTemplateImage( this.bigSur )
    this.setCache( key, file )
    return file
  }

  getCache ( key ) {
    return this.cache[ key ]
  }

  setCache ( key, value ) {
    this.cache[ key ] = value
  }

  buildMenu () {
    const keystrokesByCommand = {}
    for ( const item in this.keymap ) {
      keystrokesByCommand[ this.keymap[ item ] ] = item
    }
    const template = JSON.parse( JSON.stringify( this.template ) )
    this.menu = Menu.buildFromTemplate( template )
    this.items = flattenMenuItems( this.menu )
  }

  setupMenu () {
    this.buildMenu()
    this.updateContextMenu()
  }

  initTray () {
    const { icon } = this.getIcons()
    tray = new Tray( icon )
    tray.setToolTip( "App" )
  }

  handleEvents () {
    // All OS
    tray.on( "click", this.handleTrayClick )

    // macOS, Windows
    tray.on( "right-click", this.handleTrayRightClick )
    tray.on( "mouse-down", this.handleTrayMouseDown )
    tray.on( "mouse-up", this.handleTrayMouseUp )

    // macOS only
    tray.setIgnoreDoubleClickEvents( true )
  }

  handleTrayClick = ( event ) => {
    global.application.toggle()
  }

  handleTrayRightClick = ( event ) => {
    tray.popUpContextMenu( this.menu )
  }

  handleTrayMouseDown = async ( event ) => {
    this.focused = true
    this.emit( "mouse-down", {
      focused: true,
      theme: this.inverseSystemTheme
    } )
    await this.renderTray()
  }

  handleTrayMouseUp = async ( event ) => {
    this.focused = false
    this.emit( "mouse-up", {
      focused: false,
      theme: this.theme
    } )
    await this.renderTray()
  }

  toggleSpeedometer ( enabled ) {
    this.speedometer = enabled
  }

  async renderTray () {
    if ( this.speedometer ) {
      return
    }

    const { icon } = this.getIcons()

    tray.setImage( icon )

    this.updateContextMenu()
  }

  getIcons () {
    if ( this.bigSur ) {
      return { icon: this.normalIcon }
    }

    const { focused, status, systemTheme } = this

    const icon = status ? this.activeIcon : this.normalIcon
    if ( systemTheme === APP_THEME.DARK ) {
      return {
        icon
      }
    }

    const inverseIcon = status
      ? this.inverseActiveIcon
      : this.inverseNormalIcon

    return {
      icon: focused ? inverseIcon : icon
    }
  }

  updateContextMenu () {
    if ( process.platform !== "linux" ) {
      return
    }

    tray.setContextMenu( this.menu )
  }

  updateMenuStates ( visibleStates, enabledStates, checkedStates ) {
    updateStates( this.items, visibleStates, enabledStates, checkedStates )

    this.updateContextMenu()
  }

  updateMenuItemVisibleState ( id, flag ) {
    const visibleStates = {
      [ id ]: flag
    }
    this.updateMenuStates( visibleStates, null, null )
  }

  updateMenuItemEnabledState ( id, flag ) {
    const enabledStates = {
      [ id ]: flag
    }
    this.updateMenuStates( null, enabledStates, null )
  }

  handleLocaleChange ( locale ) {
    this.setupMenu()
  }

  handleSpeedometerEnableChange ( enabled ) {
    this.toggleSpeedometer( enabled )

    this.renderTray()
  }

  handleSystemThemeChange ( systemTheme = APP_THEME.LIGHT ) {
    if ( !is.macOS() ) {
      return
    }

    this.systemTheme = systemTheme
    this.inverseSystemTheme = getInverseTheme( systemTheme )

    this.loadImages()

    this.renderTray()
  }

  async handleDownloadStatusChange ( status ) {
    this.status = status

    await this.renderTray()
  }

  async handleSpeedChange ( { uploadSpeed, downloadSpeed } ) {
    if ( !this.speedometer ) {
      return
    }
    await this.renderTray()
  }

  async updateTrayByImage ( ab ) {
    const buffer = convertArrayBufferToBuffer( ab )
    const image = nativeImage.createFromBuffer( buffer, {
      scaleFactor: 2
    } )
    image.setTemplateImage( this.bigSur )
    tray.setImage( image )
  }

  destroy () {
    if ( tray ) {
      tray.removeListener( "click", this.handleTrayClick )
      tray.removeListener( "right-click", this.handleTrayRightClick )
      tray.removeListener( "mouse-down", this.handleTrayMouseDown )
      tray.removeListener( "mouse-up", this.handleTrayMouseUp )
    }

    tray.destroy()
  }
}
