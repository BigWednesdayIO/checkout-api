'use strict';

const cuid = require('cuid');

const dataset = require('./dataset');
const datastoreModel = require('gcloud-datastore-model')(dataset);

const processPayment = require('./process_payment');
const sendInvoice = require('./send_invoice');

const orderKey = id => dataset.key(['Order', id]);

const checkouts = {
  process(checkout) {
    return datastoreModel.insert(orderKey(cuid()), checkout)
      .then(processPayment)
      .then(sendInvoice)
      .then(checkout => {
        checkout.links = [{rel: 'order', href: '/orders/1'}];
        return checkout;
      });
  },

  get(id) {
    return datastoreModel.get(orderKey(id));
  }
};

module.exports = checkouts;
