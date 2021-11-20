const { resolve } = require( "path" )
const { path: PROJECT_ROOT } = require( "app-root-path" )

exports.PROJECT_TITLE = "Electron boilerplate"

exports.IS_DEV = process.env.NODE_ENV !== "production"
exports.IS_PROD = process.env.NODE_ENV === "production"

exports.PROJECT_ROOT = PROJECT_ROOT
exports.BUILD_DIRECTORY = resolve( PROJECT_ROOT, "./build" )
exports.DIST_DIRECTORY = resolve( PROJECT_ROOT, "./dist" )
exports.SOURCES_DIRECTORY = resolve( PROJECT_ROOT, "./src" )
exports.MAIN_SOURCES_DIRECTORY = resolve( PROJECT_ROOT, "./src/main" )
exports.MAIN_SOURCES_ENTRY = resolve( exports.MAIN_SOURCES_DIRECTORY, "./index.js" )
exports.RENDER_DEV_CLIENT = resolve( PROJECT_ROOT, "./config/dev-client" )
exports.MAIN_DEV_CLIENT = resolve( exports.MAIN_SOURCES_DIRECTORY, "./index.dev.js" )
exports.RENDERER_SOURCES_DIRECTORY = resolve( PROJECT_ROOT, "./src/renderer" )
exports.RENDERER_SOURCES_ENTRY = resolve( exports.RENDERER_SOURCES_DIRECTORY, "./pages/index/main.js" )
exports.HTML_TEMPLATE = resolve( PROJECT_ROOT, "./src/index.ejs" )
exports.SHARED_SOURCES_DIRECTORY = resolve( exports.SOURCES_DIRECTORY, "./shared" )
exports.STATIC_SOURCES_DIRECTORY = resolve( PROJECT_ROOT, "./static" )
exports.STATIC_BUILD_DIRECTORY = resolve( PROJECT_ROOT, "./dist/electron/static" )
exports.DIST_DIRECTORY_ENTRY = resolve( exports.DIST_DIRECTORY, "./electron/main.js" )
exports.BUILD_ELECTRON_DIRECTORY = resolve( PROJECT_ROOT, "./dist/electron" )
exports.RENDER_PORT = 9080

exports.build = {
  appId: "ElectronApp"
}
