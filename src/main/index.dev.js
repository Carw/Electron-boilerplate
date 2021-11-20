const { app } = require( "electron" )
const debug = require( "electron-debug" )

debug( {
  showDevTools: true
} )

app.whenReady().then( () => {
  const installExtension = require( "electron-devtools-installer" )
  installExtension.default( installExtension.VUEJS_DEVTOOLS )
    .then( () => {
    } )
    .catch( err => {
      console.log( "Unable to install `vue-devtools`: \n", err )
    } )
} )

require( "./index" )
