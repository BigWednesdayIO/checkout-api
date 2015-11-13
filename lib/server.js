'use strict';

const cuid = require('cuid');
const Boom = require('boom');
const Hapi = require('hapi');
const lruCache = require('lru-cache');

const processPayment = require('./process_payment');
const persistOrder = require('./persist_order');
const sendInvoice = require('./send_invoice');

module.exports = callback => {
  const checkouts = lruCache({max: 25});

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
      processPayment(req.payload)
        .then(persistOrder)
        .then(sendInvoice)
        .then(checkout => {
          checkout.id = cuid();
          checkout.links = [{rel: 'order', href: '/orders/1'}];

          checkouts.set(checkout.id, checkout);

          reply(checkout).created(`${req.path}/${checkout.id}`);
        })
        .catch(err => {
          if (err.type === 'StripeCardError') {
            return reply(Boom.badRequest(err.message));
          }

          reply.error(err);
        });
    }
  });

  server.route({
    path: '/checkouts/{id}',
    method: 'GET',
    handler: (req, reply) => {
      reply(checkouts.get(req.params.id) || Boom.notFound());
    }
  });

  callback(null, server);
};
