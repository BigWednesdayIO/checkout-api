'use strict';

const _ = require('lodash');
const cuid = require('cuid');

const dataset = require('./dataset');
const entities = require('./dataset_entities');
const nestedObject = require('./nested_object');
const sendInvoice = require('./send_invoice');
const purchaseOrder = require('./purchase_order');

const flattenBasket = _.partialRight(nestedObject.flatten, 'basket');

const expandBasket = _.partialRight(nestedObject.expand, 'basket_');
const expandMetadata = _.partialRight(nestedObject.expand, '_metadata_');

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
      const stripOrderForms = _.partialRight(_.omit, 'basket_order_forms');

      const order = _.flow(addMetadata, flattenBasket, stripOrderForms)(checkout);
      const orderInsert = {key: entities.orders.buildKey(orderId), data: order};
      inserts.push(orderInsert);

      const orderFormIds = checkout.basket.order_forms.map(() => cuid());
      const orderForms = checkout.basket.order_forms.map(f => _.assign({_metadata_created: date, _metadata_updated: date, status: 'accepted'}, f));
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
      })
      .then(checkout => {
        return Promise.all(checkout.basket.order_forms.map(order_form => {
          order_form.order_id = checkout.id;
          order_form.billing_address = checkout.billing_address;
          order_form.delivery_address = checkout.delivery_address;
          return purchaseOrder({
            order: order_form,
            membership: {},
            supplier: {
              orders_email: process.env.SUPPLIER_EMAIL,
              orders_textsms: process.env.SUPPLIER_MOBILE
            }
          });
        }))
          .then(() => checkout);
      });
  },

  buildCheckout
};

module.exports = checkouts;
