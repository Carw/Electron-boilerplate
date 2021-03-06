import is from "electron-is"
import { ipcRenderer } from "electron"
import Vue from "vue"
import { sync } from "vuex-router-sync"
import Element, { Loading, Message } from "element-ui"
import axios from "axios"
// import "svg-innerhtml"

import App from "./App"
import router from "../../router"
import store from "../../store"
// import Icon from "../../components/Icons/Icon"
import Msg from "../../components/Msg"
// import { commands } from "../../components/CommandManager/instance"
// import TrayWorker from "../../workers/tray.worker"

// import "../../components/Theme/Index.scss"

import VueElectron from "vue-electron"

const updateTray = is.renderer()
  ? async ( payload ) => {
    const { tray } = payload
    if ( !tray ) {
      return
    }

    const ab = await tray.arrayBuffer()
    ipcRenderer.send( "command", "application:update-tray", ab )
  }
  : () => {
  }

// function initTrayWorker () {
//   const worker = new TrayWorker()
//
//   worker.addEventListener( "message", ( event ) => {
//     const { type, payload } = event.data
//
//     switch ( type ) {
//       case "initialized":
//       case "log":
//         console.log( "[App] Log from Tray Worker: ", payload )
//         break
//       case "tray:drawed":
//         updateTray( payload )
//         break
//       default:
//         console.warn( "[App] Tray Worker unhandled message type:", type, payload )
//     }
//   } )
//
//   return worker
// }

function init ( config ) {
  if ( is.renderer() ) {
    Vue.use( VueElectron )
  }

  Vue.http = Vue.prototype.$http = axios
  Vue.config.productionTip = false

  Vue.use( Element, {
    size: "mini"
    //   i18n: ( key, value ) => i18n.t( key, value )
  } )

  Vue.use( Msg, Message, {
    showClose: true
  } )
  // Vue.component( "mo-icon", Icon )
  //
  const loading = Loading.service( {
    fullscreen: true,
    background: "rgba(0, 0, 0, 0.1)"
  } )

  sync( store, router )

  /* eslint-disable no-new */
  global.app = new Vue( {
    components: { App },
    router,
    store,
    // i18n,
    template: "<App/>"
  } ).$mount( "#app" )

  // global.app.commands = commands
  // require( "./commands" )
  //
  // global.app.trayWorker = initTrayWorker()
  //
  // setTimeout( () => {
  //   loading.close()
  //   require( "electron" ).remote.getCurrentWindow().setHasShadow( true )
  // }, 400 )
}

store.dispatch( "preference/fetchPreference" )
  .then( ( config ) => {
    console.info( "[App] load preference:", config )
    init( config )
  } )
  .catch( ( err ) => {
    alert( err )
  } )
