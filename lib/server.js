'use strict';

const _ = require('lodash');
const Boom = require('boom');
const Hapi = require('hapi');
const Joi = require('joi');

const swaggered = require('hapi-swaggered');
const pkg = require('../package.json');
const version = require('hapi-version-route');
const errorSchemas = require('hapi-error-schemas');
const jwtAuthStrategy = require('./jwt_auth_strategy');

const checkouts = require('./checkouts');
const dataset = require('./dataset');
const datastoreModel = require('gcloud-datastore-model')(dataset);
const entities = require('./dataset_entities');

const plugins = [{
  register: jwtAuthStrategy
}, {
  register: version,
  options: {auth: false}
}, {
  register: swaggered,
  options: {
    auth: false,
    info: {
      title: 'Orders API',
      version: pkg.version
    }
  }
}];

module.exports = callback => {
  const server = new Hapi.Server();

  server.connection({port: 8080});

  server.decorate('reply', 'error', function (err) {
    console.error(err);
    this.response(err);
  });

  server.register(plugins, err => {
    if (err) {
      console.error('Failed to register plugins');
      callback(err);
    }

    server.route({
      path: '/checkouts',
      method: 'POST',
      config: {
        tags: ['api'],
        auth: 'jwt',
        validate: {
          payload: Joi.object({
            customer_id: Joi.string().required().description('Customer id')
          })
          .unknown(true)
          .meta({className: 'Checkout'})
          .description('The checkout object')
        },
        response: {
          status: Object.assign({
            201: Joi.object().unknown(true).description('The created checkout resource')
          }, errorSchemas.statuses([400, 401, 403]))
        }
      },
      handler: (req, reply) => {
        if (!_.includes(req.auth.credentials.scope, `customer:${req.payload.customer_id}`)) {
          return reply(Boom.forbidden('Insufficient scope, expected any of: customer:,admin'));
        }

        checkouts.process(req.payload)
          .then(checkout => {
            reply(checkout).created(`/orders/${checkout.id}`);
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
      path: '/orders/{id}',
      method: 'GET',
      config: {
        tags: ['api'],
        validate: {
          params: {
            id: Joi.string().required().description('The checkout id')
          }
        },
        response: {
          status: Object.assign({
            200: Joi.object().unknown(true).description('The checkout resource')
          }, errorSchemas.statuses([400, 401, 403, 404]))
        }
      },
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
