import is from "electron-is"
import logger from "electron-log"
import { PROJECT_TITLE } from "../../../config/constants"

logger.transports.file.level = is.production() ? "warn" : "silly"
logger.info( `[${PROJECT_TITLE}] Logger init` )
logger.warn( `[${PROJECT_TITLE}] Logger init` )

export default logger
