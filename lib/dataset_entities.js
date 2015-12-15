'use strict';

const dataset = require('./dataset');

const entities = {
  orders: {
    buildKey: id => dataset.key(['Order', id])
  },
  baskets: {
    buildKey: (orderId, basketId) => dataset.key(['Order', orderId, 'Basket', basketId])
  }
};

module.exports = entities;
