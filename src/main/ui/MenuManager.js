import { EventEmitter } from "events"
import { Menu } from "electron"

import { flattenMenuItems } from "../utils/menu"
import keymap from "../../shared/keymap"

console.log( keymap )

export default class MenuManager extends EventEmitter {
  constructor ( options ) {
    super()
    this.options = options
    this.keymap = keymap
    this.items = {}

    this.load()
    this.setup()
  }

  load () {
    const template = require( `../menus/${process.platform}.json` )
    this.template = template.menu
  }

  build () {
    const keystrokesByCommand = {}
    for ( const item in this.keymap ) {
      keystrokesByCommand[ this.keymap[ item ] ] = item
    }

    const template = JSON.parse( JSON.stringify( this.template ) )
    return Menu.buildFromTemplate( template )
  }

  setup () {
    const menu = this.build()
    Menu.setApplicationMenu( menu )
    this.items = flattenMenuItems( menu )
  }
}
