'use strict';

const Boom = require('boom');
const Hapi = require('hapi');

const checkouts = require('./checkouts');
const dataset = require('./dataset');
const datastoreModel = require('gcloud-datastore-model')(dataset);
const entities = require('./dataset_entities');

module.exports = callback => {
  const server = new Hapi.Server();

  server.connection({port: 8080});

  server.decorate('reply', 'error', function (err) {
    console.error(err);
    this.response(err);
  });

  server.register({
    register: require('hapi-version-route')
  }, err => {
    if (err) {
      console.error('Failed to register plugins');
      callback(err);
    }

    server.route({
      path: '/checkouts',
      method: 'POST',
      handler: (req, reply) => {
        checkouts.process(req.payload)
          .then(checkout => {
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

    // TODO - remove, clients should use /orders/{id} and sub-resources instead
    server.route({
      path: '/checkouts/{id}',
      method: 'GET',
      handler: (req, reply) => {
        const orderKey = entities.orders.buildKey(req.params.id);

        datastoreModel.get(orderKey)
          .then(header => {
            return datastoreModel.find(dataset.createQuery('OrderForm').hasAncestor(orderKey))
              .then(forms => reply(checkouts.buildCheckout(header, forms)));
          })
          .catch(err => {
            if (err.name === 'EntityNotFoundError') {
              return reply(Boom.notFound());
            }

            reply.error(err);
          });
      }
    });

    callback(null, server);
  });
};
