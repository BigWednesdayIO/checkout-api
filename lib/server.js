'use strict';

const Boom = require('boom');
const Hapi = require('hapi');
const swaggered = require('hapi-swaggered');
const pkg = require('../package.json');
const version = require('hapi-version-route');
const jwtAuthStrategy = require('./jwt_auth_strategy');

const orders = require('./handlers/orders');
const checkouts = require('./handlers/checkouts');

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
}, {
  register: orders
}, {
  register: checkouts
}];

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

    callback(null, server);
  });
};
