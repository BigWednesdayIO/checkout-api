'use strict';

module.exports = [{
  id: '123456',
  email: 'supplier-123456@bigwednesday.io',
  orders_email: process.env.TESTING_EMAIL,
  orders_textsms: process.env.TESTING_MOBILE
}, {
  id: '654321',
  email: 'michael@bigwednesday.io',
  orders_email: process.env.TESTING_EMAIL,
  orders_textsms: process.env.TESTING_MOBILE
}];
