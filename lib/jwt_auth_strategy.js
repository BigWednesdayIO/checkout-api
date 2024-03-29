'use strict';

const jwtScheme = require('hapi-auth-jwt2');

const requiredEnvVars = ['AUTH0_DOMAIN', 'AUTH0_CLIENT_ID', 'AUTH0_CLIENT_SECRET'];

requiredEnvVars.forEach(name => {
  if (!process.env[name]) {
    throw new Error(`Requried environment variable ${name} not set`);
  }
});

exports.register = function (server, options, next) {
  server.register(jwtScheme, err => {
    if (err) {
      return next(err);
    }

    server.auth.strategy('jwt', 'jwt', {
      key: new Buffer(process.env.AUTH0_CLIENT_SECRET, 'base64'),
      validateFunc: (decoded, request, callback) => {
        callback(null, true);
      },
      verifyOptions: {
        algorithms: ['HS256'],
        audience: process.env.AUTH0_CLIENT_ID,
        issuer: `https://${process.env.AUTH0_DOMAIN}/`
      },
      urlKey: 'token'
    });

    server.auth.default({strategy: 'jwt', scope: ['admin']});

    return next();
  });
};

exports.register.attributes = {
  name: 'jwtAuthStrategy'
};

