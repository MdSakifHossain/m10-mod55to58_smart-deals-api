// logger.js

const padZero = (num, size = 2) => num.toString().padStart(size, "0");
export function getLogTime() {
  const now = new Date();
  const day = padZero(now.getDate());
  const month = padZero(now.getMonth() + 1);
  const year = now.getFullYear();
  const hours = padZero(now.getHours());
  const minutes = padZero(now.getMinutes());
  const seconds = padZero(now.getSeconds());

  return `[${day}-${month}-${year} ${hours}:${minutes}:${seconds}]`;
}

const isDev = process.env.NODE_ENV !== "production";
const logger = (...args) => isDev && console.log(`${getLogTime()} `, ...args);
export default logger;
