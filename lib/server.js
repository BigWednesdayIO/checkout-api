'use strict';

const Boom = require('boom');
const Hapi = require('hapi');

const checkouts = require('./checkouts');

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

    server.route({
      path: '/checkouts/{id}',
      method: 'GET',
      handler: (req, reply) => {
        checkouts.get(req.params.id)
          .then(checkout => reply(checkout || Boom.notFound()));
      }
    });

    callback(null, server);
  });
};
