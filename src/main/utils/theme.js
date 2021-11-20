import { nativeTheme } from "electron"
import {
  APP_THEME
} from "../../shared/constants"

export const getSystemTheme = () => {
  let result = APP_THEME.LIGHT
  result = nativeTheme.shouldUseDarkColors ? APP_THEME.DARK : APP_THEME.LIGHT
  return result
}

export const convertArrayBufferToBuffer = ( arrayBuffer ) => {
  const buffer = Buffer.alloc( arrayBuffer.byteLength )
  const view = new Uint8Array( arrayBuffer )
  for ( let i = 0; i < buffer.length; ++i ) {
    buffer[ i ] = view[ i ]
  }
  return buffer
}
