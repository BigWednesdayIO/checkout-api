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

const flattenBasket = checkout => {
  const order = _.omit(checkout, 'basket');

  _.forOwn(checkout.basket, (value, key) => {
    if (key === 'order_forms') {
      return;
    }

    order[`basket_${key}`] = value;
  });

  return order;
};

const expandBasket = header => {
  return _.transform(header, (accum, value, key) => {
    if (key.startsWith('basket_')) {
      accum.basket[key.replace('basket_', '')] = value;
    } else {
      accum[key] = value;
    }
    return accum;
  }, {basket: {}});
};

const buildCheckout = (header, forms) => {
  const checkout = expandBasket(header);
  checkout.basket.order_forms = forms;
  return checkout;
};

const persistOrder = checkout => {
  const order = flattenBasket(checkout);

  return datastoreModel.insert(entities.orders.buildKey(cuid()), order)
    .then(header => {
      return persistOrderForms(header.id, checkout.basket.order_forms)
        .then(savedForms => {
          return buildCheckout(header, savedForms);
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
  },

  buildCheckout
};

module.exports = checkouts;
