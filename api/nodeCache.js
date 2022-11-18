// https://github.com/bigansh/tweepsbook/blob/af164578dd/backend/server/utils/classes/nodeCache.js
const NodeCache = require('node-cache')
const oneDay = 1000 * 60 * 60 * 24;

export default new NodeCache({ stdTTL: oneDay, checkperiod: 120 })