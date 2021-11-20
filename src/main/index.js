import { app } from "electron"
import is from "electron-is"
import path from "path"

import Launcher from "./Launcher"

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true"

if ( process.env.NODE_ENV !== "development" ) {
  global.__static = path.join( __dirname, "/static" ).replace( /\\/g, "\\\\" )
}

if ( is.windows() ) {
  app.setAppUserModelId( appId )
}

global.launcher = new Launcher()
