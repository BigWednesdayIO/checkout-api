'use strict';

const _ = require('lodash');
const Boom = require('boom');
const Hapi = require('hapi');
const Joi = require('joi');
const debug = require('debug')('orders');

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

const hasAdminScope = scope => _.includes(scope, 'admin');

const hasCustomerScope = (scope, customerId) => _.includes(scope, `customer:${customerId}`);

const hasSupplierScope = (scope, supplierId) => _.includes(scope, `supplier:${supplierId}`);

module.exports = callback => {
  const server = new Hapi.Server();

  server.connection({port: 8080});

  server.decorate('reply', 'error', function (err) {
    console.error(err);
    this.response(err);
  });

  server.decorate('reply', 'forbidden', function () {
    this.response(Boom.forbidden('Insufficient scope'));
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
        if (!hasCustomerScope(req.auth.credentials.scope, req.payload.customer_id)) {
          return reply.forbidden();
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
        auth: 'jwt',
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
              .then(forms => checkouts.buildCheckout(header, forms));
          })
          .then(order => {
            if (!hasCustomerScope(req.auth.credentials.scope, order.customer_id) && !hasAdminScope(req.auth.credentials.scope)) {
              return reply.forbidden();
            }
            reply(order);
          })
          .catch(err => {
            if (err.name === 'EntityNotFoundError') {
              if (hasAdminScope(req.auth.credentials.scope)) {
                return reply(Boom.notFound());
              }

              return reply.forbidden();
            }

            reply.error(err);
          });
      }
    });

    const ordersForSupplier = supplierId => {
      const supplierFormsQuery = dataset
        .createQuery('OrderForm')
        .filter('supplier_id =', supplierId);

      return new Promise((resolve, reject) => {
        dataset.runQuery(supplierFormsQuery, (err, results) => {
          if (err) {
            return reject(err);
          }

          resolve(results.map(r => r.key.path[1]));
        });
      });
    };

    server.route({
      path: '/orders',
      method: 'GET',
      config: {
        tags: ['api'],
        auth: 'jwt',
        response: {
          status: Object.assign({
            200: Joi.array().items(Joi.object().unknown(true).description('The checkout resource')).description('The checkout resources')
          }, errorSchemas.statuses([400, 401, 403, 404]))
        }
      },
      handler: (req, reply) => {
        if (req.query.customer_id && !hasCustomerScope(req.auth.credentials.scope, req.query.customer_id)) {
          return reply.forbidden();
        }

        if (req.query.supplier_id && !hasSupplierScope(req.auth.credentials.scope, req.query.supplier_id)) {
          return reply.forbidden();
        }

        if (!req.query.customer_id && !req.query.supplier_id && !hasAdminScope(req.auth.credentials.scope)) {
          return reply.forbidden();
        }

        let ordersPromise;

        if (req.query.supplier_id) {
          debug(`Getting orders for supplier ${req.query.supplier_id}`);
          ordersPromise = ordersForSupplier(req.query.supplier_id)
            .then(ids => datastoreModel.getMany(ids.map(id => entities.orders.buildKey(id))))
            .then(orders => {
              return _.map(orders, o => _.pick(o, ['customer_id', 'delivery_address', 'billing_address', 'id', '_metadata']));
            });
        } else {
          const orderQuery = dataset.createQuery('Order').order('_metadata_created');

          if (req.query.customer_id) {
            debug(`Getting orders for customer ${req.query.customer_id}`);
            orderQuery.filter('customer_id =', req.query.customer_id);
          }

          ordersPromise = datastoreModel.find(orderQuery);
        }

        ordersPromise
          .then(orders => {
            return Promise.all(orders.map(order => {
              const formsQuery = dataset.createQuery('OrderForm').hasAncestor(entities.orders.buildKey(order.id));

              if (req.query.supplier_id) {
                formsQuery.filter('supplier_id =', req.query.supplier_id);
              }

              return datastoreModel.find(formsQuery);
            }))
            .then(allOrderForms => {
              return orders.map((order, idx) => checkouts.buildCheckout(order, allOrderForms[idx]));
            });
          })
          .then(orders => reply(orders))
          .catch(err => {
            console.log(err);
            reply.error(err);
          });
      }
    });

    callback(null, server);
  });
};
