'use strict';

const sendSMS = require('./send_sms.js');
const sendEmail = require('./send_email.js');
const purchaseOrderBuilder = require('./purchase_order_builder.js');

module.exports = data => {
  const actions = [];

  const sendingEmail = purchaseOrderBuilder
    .buildHtml(data)
    .then(html => {
      return purchaseOrderBuilder
        .buildPdf(html)
        .then(pdf => {
          return sendEmail(data, html, pdf);
        });
    });

  actions.push(sendingEmail);

  if (data.supplier.orders_textsms) {
    const sendingSMS = sendSMS(data.order, data.supplier.orders_textsms);
    actions.push(sendingSMS);
  }

  return Promise.all(actions)
    .catch(err => {
      throw new Error(err);
    });
};