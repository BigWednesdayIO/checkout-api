'use strict';

const _ = require('lodash');
const cuid = require('cuid');

const dataset = require('./dataset');
const datastoreModel = require('gcloud-datastore-model')(dataset);
const entities = require('./dataset_entities');

const processPayment = require('./process_payment');
const sendInvoice = require('./send_invoice');

const checkouts = {
  process(checkout) {
    return datastoreModel.insert(entities.orders.buildKey(cuid()), _.omit(checkout, 'basket'))
      .then(header => {
        return datastoreModel.insert(entities.baskets.buildKey(header.id, cuid()), checkout.basket)
          .then(savedBasket => _.assign({basket: savedBasket}, header));
      })
      .then(processPayment)
      .then(sendInvoice)
      .then(checkout => {
        checkout.links = [{rel: 'order', href: `/orders/${checkout.id}`}];
        return checkout;
      });
  }
};

module.exports = checkouts;
