import {
  parseInt
} from "lodash"

import { APP_THEME } from "../constants"

export const getInverseTheme = ( theme ) => {
  return ( theme === APP_THEME.LIGHT ) ? APP_THEME.DARK : APP_THEME.LIGHT
}

export const getSystemMajorVersion = () => {
  const version = require( "os" ).release()
  return parseInt( version.substr( 0, version.indexOf( "." ) ) )
}

export const checkIsNeedRun = ( enable, lastTime, interval ) => {
  if ( !enable ) {
    return false
  }
  return ( Date.now() - lastTime > interval )
}
