'use strict';

const cuid = require('cuid');

const dataset = require('./dataset');
const datastoreModel = require('gcloud-datastore-model')(dataset);

const processPayment = require('./process_payment');
const sendInvoice = require('./send_invoice');

const checkoutKey = id => dataset.key(['Checkout', id]);

const checkouts = {
  process(checkout) {
    return datastoreModel.insert(checkoutKey(cuid()), checkout)
      .then(processPayment)
      .then(sendInvoice)
      .then(checkout => {
        checkout.links = [{rel: 'order', href: '/orders/1'}];
        return checkout;
      });
  },

  get(id) {
    return datastoreModel.get(checkoutKey(id));
  }
};

module.exports = checkouts;
