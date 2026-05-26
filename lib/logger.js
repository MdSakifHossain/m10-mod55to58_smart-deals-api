// logger.js
import { getLogTime } from "./getLogTime.js";

const isDev = process.env.NODE_ENV !== "production";

const logger = (...args) => isDev && console.log(`${getLogTime()} `, ...args);

export default logger;
