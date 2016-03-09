'use strict';

const FormData = require('form-data');

const SENDGRID_API_USER = process.env.SENDGRID_API_USER;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

if (!SENDGRID_API_USER || !SENDGRID_API_KEY) {
  throw new Error('Sendgrid env vars (SENDGRID_API_USER, SENDGRID_API_KEY) is required');
}

module.exports = (data, html, pdf) => {
  const form = new FormData();
  form.append('html', html);
  form.append('files[purchase-order.pdf]', pdf);

  const path = '/api/mail.send.json';
  const params = {
    api_user: SENDGRID_API_USER,
    api_key: SENDGRID_API_KEY,
    to: data.supplier.orders_email || data.supplier.email,
    from: 'orders@bigwednesday.io',
    subject: `Purchase Order ${data.order.id}`,
    text: `New purchase order from ${data.order.billing_address.company}`
  };
  const paramsString = Object.keys(params)
    .map(key => `${key}=${encodeURIComponent(params[key])}`)
    .join('&');

  const requestPath = `${path}?${paramsString}`;

  return new Promise((resolve, reject) => {
    form.submit({
      protocol: 'https:',
      host: 'api.sendgrid.com',
      path: requestPath
    }, (err, response) => {
      if (err) {
        reject(err);
      }
      resolve(response);
    });
  });
};
