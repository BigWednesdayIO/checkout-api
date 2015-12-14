'use strict';

const cuid = require('cuid');
const lruCache = require('lru-cache');

const processPayment = require('./process_payment');
const persistOrder = require('./persist_order');
const sendInvoice = require('./send_invoice');

const checkoutStore = lruCache({max: 25});

const checkouts = {
  process(checkout) {
    return processPayment(checkout)
      .then(persistOrder)
      .then(sendInvoice)
      .then(checkout => {
        checkout.id = cuid();
        checkout.links = [{rel: 'order', href: '/orders/1'}];

        checkoutStore.set(checkout.id, checkout);

        return checkout;
      });
  },

  get(id) {
    return Promise.resolve(checkoutStore.get(id));
  }
};

module.exports = checkouts;
