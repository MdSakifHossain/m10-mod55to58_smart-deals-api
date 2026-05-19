// logger.js
const isDev = process.env.NODE_ENV !== "production";

const logger = (...args) => isDev && console.log(...args);

export default logger;
