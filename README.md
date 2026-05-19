# m10-mod55to58_smart-deals-api

## Pre-requisite

- [ ] initialize **New Project**. `npm init -y`
- [ ] install **Dependencies**. `npm install express cors dotenv mongodb`
- [ ] install **Dev-Dependency**. `npm install --save-dev nodemon`
- [ ] open `package.json`
- [ ] change `"type": "commonjs",` ==> `"type": "module",`
- [ ] add `start` && `dev` scripts (`start:node`, `dev:nodemon`)
- [ ] create `.gitignore`, add `node_modules` and `.env`
- [ ] create `.env` file
- [ ] goto MongoDB, do the `whatnots`, create **New Project** (`e.g. PH_L01_B12`)
- [ ] Create new **Free Cluster** (`e.g. Cluster-Smart-Deals`)
- [ ] goto **Database & Network Access**, add **New Database User** with a Role (`Atlas Admin`), add `0.0.0.0/0` IP
- [ ] open `index.js`, create a standard `Express API`.
- [ ] setup `dotenv` on `index.js`
- [ ] open `.env` and add new variable (`MONGO_URI`) and paste in that uri form mongodb clusters connection thingy
- [ ] import the `URI` instead of the hardcoded `URI` string, **copy/paste password** of the **Database User**, try to connect **Cluser**
- [ ] setup **CORS**. `app.use(cors())`
- [ ] setup **JSON Parser**. `app.use(express.json())`
- [ ] create a logger function in the `lib/logger.js`

```js
// logger.js
const isDev = process.env.NODE_ENV !== "production";

const logger = (...args) => isDev && console.log(...args);

export default logger;
```

- [ ] import this on `index.js` to log anything. (e.g. like, `Connected to MongoDB` OR `It's alive on port: http://localhost:${port}`)

> Note: if all the the previous things are working then we can do the **Next Section**.

## The Actual Thing

- [ ] note down the actual thing