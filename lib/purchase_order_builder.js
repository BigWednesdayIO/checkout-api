'use strict';

const fs = require('fs');
const Handlebars = require('handlebars');
const html5pdf = require('html5-to-pdf');

// Handlebars helpers

require('./handlebars_helper_currency.js')(Handlebars);
require('./handlebars_helper_date.js')(Handlebars);

let cachedTemplate;
const getTemplate = () => {
  return new Promise((resolve, reject) => {
    if (cachedTemplate) {
      return resolve(cachedTemplate);
    }

    fs.readFile('./lib/templates/purchase_order.html', 'utf-8', (err, templateHtml) => {
      if (err) {
        return reject(err);
      }
      cachedTemplate = Handlebars.compile(templateHtml);
      return resolve(cachedTemplate);
    });
  });
};

const buildHtml = data => {
  return getTemplate()
    .then(template => {
      return template(data);
    });
};

const buildPdf = html => {
  return new Promise((resolve, reject) => {
    html5pdf({
      cssPath: './lib/templates/pdf.css'
    }).from.string(html).to.buffer((err, pdf) => {
      if (err) {
        return reject(err);
      }
      console.log('PDF Created');
      resolve(pdf);
    });
  });
};

module.exports = {
  buildHtml,
  buildPdf
};
