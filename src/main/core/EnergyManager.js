import { powerSaveBlocker } from "electron"

import logger from "./Logger"

let psbId
export default class EnergyManager {
  startPowerSaveBlocker () {
    if ( psbId && powerSaveBlocker.isStarted( psbId ) ) {
      return
    }

    psbId = powerSaveBlocker.start( "prevent-app-suspension" )
    logger.info( "Start power save blocker:", psbId )
  }

  stopPowerSaveBlocker () {
    if ( typeof psbId === "undefined" || !powerSaveBlocker.isStarted( psbId ) ) {
      return
    }

    powerSaveBlocker.stop( psbId )
    logger.info( "Stop power save blocker:", psbId )
    psbId = undefined
  }
}
