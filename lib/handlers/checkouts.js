'use strict';

const _ = require('lodash');
const Boom = require('boom');
const errorSchemas = require('hapi-error-schemas');
const Joi = require('joi');
const checkouts = require('../checkouts');
const checkoutSchema = require('../checkout_schema');

const hasCustomerScope = (scope, customerId) => _.includes(scope, `customer:${customerId}`);

exports.register = (server, options, next) => {
  server.route({
    path: '/checkouts',
    method: 'POST',
    config: {
      tags: ['api'],
      auth: 'jwt',
      validate: {
        payload: checkoutSchema.description('The checkout object')
      },
      response: {
        failAction: process.env.RESPONSE_FAIL_ACTION || 'log',
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

  return next();
};

exports.register.attributes = {
  name: 'checkouts'
};
