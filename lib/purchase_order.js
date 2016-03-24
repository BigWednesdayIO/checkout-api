'use strict';

const _ = require('lodash');

// const sendSMS = require('./send_sms.js');
const sendEmail = require('./send_email.js');
const purchaseOrderBuilder = require('./purchase_order_builder.js');

module.exports = (orderForm, suppliers) => {
  const supplier = _.find(suppliers, {id: orderForm.supplier_id});

  if (!supplier) {
    throw new Error(`No supplier found with id ${orderForm.supplier_id}`);
  }

  const data = {
    order: orderForm,
    membership: {},
    supplier
  };
  const actions = [];

  const sendingEmail = purchaseOrderBuilder
    .buildHtml(data)
    .then(html => {
      return Promise.all([
        purchaseOrderBuilder
          .buildPdf(html),
        purchaseOrderBuilder
          .buildDeliveryNote(data.order)
      ])
        .then(_.spread((purchaseOrderPDF, deliveryNotePDF) => {
          return sendEmail(data, html, purchaseOrderPDF, deliveryNotePDF);
        }));
    });

  actions.push(sendingEmail);

  // if (data.supplier.orders_textsms) {
  //   const sendingSMS = sendSMS(data.order, data.supplier.orders_textsms);
  //   actions.push(sendingSMS);
  // }

  return Promise.all(actions)
    .catch(err => {
      throw new Error(err);
    });
};
