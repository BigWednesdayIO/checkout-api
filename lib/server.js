'use strict';

const Hapi = require('hapi');

module.exports = callback => {
  const server = new Hapi.Server();

  server.connection({port: 8080});

  server.route({
    path: '/',
    method: 'GET',
    handler: (req, reply) => {
      reply('hello world');
    }
  });

  callback(null, server);
};
