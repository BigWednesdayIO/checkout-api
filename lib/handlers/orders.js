'use strict';

const _ = require('lodash');
const Boom = require('boom');
const errorSchemas = require('hapi-error-schemas');
const Joi = require('joi');
const debug = require('debug')('orders');
const checkouts = require('../checkouts');
const dataset = require('../dataset');
const datastoreModel = require('gcloud-datastore-model')(dataset);
const entities = require('../dataset_entities');

class InsufficientScopeError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InsufficientScopeError';
  }
}

const hasAdminScope = scope => _.includes(scope, 'admin');
const hasCustomerScope = (scope, customerId) => _.includes(scope, `customer:${customerId}`);
const hasSupplierScope = (scope, supplierId) => _.includes(scope, `supplier:${supplierId}`);

exports.register = (server, options, next) => {
  server.route({
    path: '/orders/{id}',
    method: 'GET',
    config: {
      tags: ['api'],
      auth: 'jwt',
      validate: {
        params: {
          id: Joi.string().required().description('The order id')
        }
      },
      response: {
        failAction: process.env.RESPONSE_FAIL_ACTION || 'log',
        status: Object.assign({
          200: Joi.object().unknown(true).description('The order resource')
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
            throw new InsufficientScopeError();
          }
          reply(order);
        })
        .catch(err => {
          if (err.name === 'EntityNotFoundError') {
            return reply(Boom.notFound());
          }
          if (err.name === 'InsufficientScopeError') {
            return reply(Boom.forbidden());
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
        failAction: process.env.RESPONSE_FAIL_ACTION || 'log',
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

  server.route({
    path: '/orders/{orderId}/order_forms/{orderFormId}/status',
    method: 'PATCH',
    config: {
      tags: ['api'],
      auth: 'jwt',
      validate: {
        params: {
          orderId: Joi.string().required().description('The order id'),
          orderFormId: Joi.string().required().description('The order form id')
        },
        payload: Joi.object({
          status: Joi.string().valid([
            'accepted',
            'dispatched',
            'rejected',
            'cancelled',
            'delivered',
            'paid'
          ]).required().description('Status')
        })
        .meta({className: 'StatusUpdate'})
        .description('Requested order form status')
      },
      response: {
        failAction: process.env.RESPONSE_FAIL_ACTION || 'log',
        status: Object.assign({
          200: Joi.object().unknown(true).description('The order form resource')
        }, errorSchemas.statuses([400, 401, 403, 404, 500]))
      }
    },
    handler: (req, reply) => {
      const formKey = entities.orderForms.buildKey(req.params.orderId, req.params.orderFormId);

      datastoreModel.get(entities.orders.buildKey(req.params.orderId))
        .then(order => {
          if (!hasCustomerScope(req.auth.credentials.scope, order.customer_id)) {
            throw new InsufficientScopeError();
          }
          return datastoreModel.get(formKey);
        })
        .then(form => {
          form.status = req.payload.status;
          return datastoreModel.update(formKey, _.omit(form, 'id', '_metadata'));
        })
        .then(reply)
        .catch(err => {
          if (err.name === 'EntityNotFoundError') {
            return reply(Boom.notFound());
          }
          if (err.name === 'InsufficientScopeError') {
            return reply(Boom.forbidden());
          }

          console.log(err);
          reply.error(err);
        });
    }
  });

  return next();
};

exports.register.attributes = {
  name: 'orders'
};
