'use strict';

const _ = require('lodash');
const cuid = require('cuid');

const dataset = require('./dataset');
const datastoreModel = require('gcloud-datastore-model')(dataset);
const entities = require('./dataset_entities');

const processPayment = require('./process_payment');
const sendInvoice = require('./send_invoice');

const persistOrderForms = (orderId, orderForms) => {
  let p = Promise.resolve([]);

  orderForms.forEach(orderForm => {
    p = p.then(forms => {
      return datastoreModel.insert(entities.orderForms.buildKey(orderId, cuid()), orderForm)
        .then(form => forms.concat(form));
    });
  });

  return p;
};

const persistOrder = checkout => {
  return datastoreModel.insert(entities.orders.buildKey(cuid()), _.omit(checkout, 'basket'))
    .then(header => {
      return datastoreModel.insert(entities.baskets.buildKey(header.id, cuid()), _.omit(checkout.basket, 'order_forms'))
        .then(savedBasket => {
          return persistOrderForms(header.id, checkout.basket.order_forms)
            .then(savedForms => _.assign({basket: _.assign({order_forms: savedForms}, savedBasket)}, header));
        });
    });
};

const checkouts = {
  process(checkout) {
    return persistOrder(checkout)
      .then(processPayment)
      .then(sendInvoice)
      .then(checkout => {
        checkout.links = [{rel: 'order', href: `/orders/${checkout.id}`}];
        return checkout;
      });
  }
};

module.exports = checkouts;
