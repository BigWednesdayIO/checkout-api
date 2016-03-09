'use strict';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_NUMBER = process.env.TWILIO_NUMBER;

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_NUMBER) {
  throw new Error('Twilio env vars (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_NUMBER) is required');
}

const twilioClient = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

const orderUrl = order => {
  const url = process.env.ORDERABLE_URL || 'http://orderable-onboarding.surge.sh';
  return `${url}/orders/${order.id}/`;
};

module.exports = (order, to) => {
  return new Promise((resolve, reject) => {
    twilioClient.sendMessage({
      to,
      from: TWILIO_NUMBER,
      body: `New purchase order from ${order.billing_address.company} for details see ${orderUrl(order)}`
    }, (err, responseData) => {
      if (err) {
        reject(err);
      }
      resolve(responseData);
    });
  });
};
