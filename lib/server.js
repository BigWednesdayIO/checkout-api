'use strict';

const _ = require('lodash');
const cuid = require('cuid');
const Boom = require('boom');
const Hapi = require('hapi');

const processPayment = require('./process_payment');
const persistOrder = require('./persist_order');
const sendInvoice = require('./send_invoice');

module.exports = callback => {
  const checkouts = [];

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

          checkouts.push(checkout);

          reply(checkout).created(`${req.path}/${checkout.id}`);
        })
        .catch(reply.error.bind(reply));
    }
  });

  server.route({
    path: '/checkouts/{id}',
    method: 'GET',
    handler: (req, reply) => {
      const checkout = _.find(checkouts, {id: req.params.id});

      reply(checkout || Boom.notFound());
    }
  });

  callback(null, server);
};
