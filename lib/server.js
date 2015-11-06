'use strict';

const Hapi = require('hapi');

const processPayment = require('./process_payment');
const persistOrder = require('./persist_order');
const sendInvoice = require('./send_invoice');

module.exports = callback => {
  const server = new Hapi.Server();

  server.connection({port: 8080});

  server.decorate('reply', 'error', function (err) {
    console.error(err);
    this.response(err);
  });

  server.route({
    path: '/checkouts',
    method: 'POST',
    handler: (req, reply) => {
      processPayment()
        .then(persistOrder)
        .then(sendInvoice)
        .then(() => {
          reply({links: [{rel: 'order', href: '/orders/1'}]});
        })
        .catch(reply.error.bind(reply));
    }
  });

  callback(null, server);
};
