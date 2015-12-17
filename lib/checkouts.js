'use strict';

const _ = require('lodash');
const cuid = require('cuid');

const dataset = require('./dataset');
const entities = require('./dataset_entities');

const sendInvoice = require('./send_invoice');

const flattenNestedObject = (entity, key) => {
  const flattened = {};

  _.forOwn(entity[key], (value, childKey) => {
    flattened[`${key}_${childKey}`] = value;
  });

  return _.assign(flattened, _.omit(entity, key));
};

const flattenBasket = _.partialRight(flattenNestedObject, 'basket');

const expandNestedObject = (entity, prefix) => {
  const nestedKey = prefix.slice(0, prefix.length - 1);
  return _.transform(entity, (accum, value, key) => {
    if (key.startsWith(prefix)) {
      accum[nestedKey][key.replace(prefix, '')] = value;
    } else {
      accum[key] = value;
    }
    return accum;
  }, {[nestedKey]: {}});
};

const expandBasket = _.partialRight(expandNestedObject, 'basket_');
const expandMetadata = _.partialRight(expandNestedObject, '_metadata_');

const buildCheckout = (header, forms) => {
  const checkout = expandMetadata(expandBasket(header));
  checkout.basket.order_forms = forms.map(f => expandMetadata(f));
  return checkout;
};

const persistOrder = checkout => {
  return new Promise((resolve, reject) => {
    dataset.runInTransaction((transaction, done) => {
      const date = new Date();

      const inserts = [];

      const orderId = cuid();

      const addMetadata = _.partial(_.assign, {_metadata_created: date, _metadata_updated: date});

      const order = _.flow(addMetadata, flattenBasket)(checkout);
      const orderInsert = {key: entities.orders.buildKey(orderId), data: order};
      inserts.push(orderInsert);

      const orderFormIds = checkout.basket.order_forms.map(() => cuid());
      const orderForms = checkout.basket.order_forms.map(f => _.assign({_metadata_created: date, _metadata_updated: date}, f));
      const orderFormInserts = orderForms.map((f, idx) => ({
        key: entities.orderForms.buildKey(orderId, orderFormIds[idx]),
        data: f
      }));
      inserts.push(...orderFormInserts);

      transaction.insert(inserts);

      done();

      order.id = orderId;
      orderForms.forEach((f, idx) => {
        f.id = orderFormIds[idx];
      });

      resolve(buildCheckout(order, orderForms));
    }, err => {
      if (err) {
        console.error(err);
        return reject(err);
      }
    });
  });
};

const checkouts = {
  process(checkout) {
    return persistOrder(checkout)
      .then(sendInvoice)
      .then(checkout => {
        checkout.links = [{rel: 'order', href: `/orders/${checkout.id}`}];
        return checkout;
      });
  },

  buildCheckout
};

module.exports = checkouts;
