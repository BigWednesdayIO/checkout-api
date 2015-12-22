'use strict';

class CheckoutBuilder {
  constructor() {
    this.customer_id = 'cii8qvyj4000001tibw16160x';
    this.delivery_address = {
      name: 'Full Name',
      company: 'A Company',
      line_1: '234 High Street',
      line_2: '',
      line_3: '',
      city: 'London',
      region: 'London',
      postcode: 'SW1 1AB',
      country: 'GB'
    };
    this.billing_address = {
      name: 'Full Name',
      email: 'test_customer@bigwednesday.io',
      company: 'A Company',
      line_1: '234 High Street',
      line_2: '',
      line_3: '',
      city: 'London',
      region: 'London',
      postcode: 'SW1 1AB',
      country: 'GB'
    };
    this.basket = {
      currency: 'GBP',
      subtotal: 130.00,
      total: 130.00,
      line_item_count: 1,
      order_forms: [{
        supplier_id: 'Pub Taverns',
        line_items: [{
          product: {
            id: 'ABC123',
            url: 'http://www.example.com/product?=ABC123',
            name: 'ABC Trainers',
            price: 50.00,
            was_price: 50.00
          },
          quantity: 2,
          subtotal: 100.00
        }],
        line_item_count: 1,
        subtotal: 100.00,
        delivery_method: 'Standard'
      }, {
        supplier_id: 'Beer & Wine Co',
        line_items: [{
          product: {
            id: 'ABC123',
            url: 'http://www.example.com/product?=ABC123',
            name: 'ABC Trainers',
            price: 30.00,
            was_price: 40.00
          },
          quantity: 1,
          subtotal: 30.00
        }],
        line_item_count: 1,
        subtotal: 30.00,
        delivery_method: 'Standard'
      }]
    };
  }

  withCustomerId(customerId) {
    this.customer_id = customerId;
    return this;
  }

  withDeliveryAddress(address) {
    this.delivery_address = address;
    return this;
  }

  withBillingAddress(address) {
    this.billing_address = address;
    return this;
  }

  withOrderForms(orderForms) {
    this.basket.order_forms = orderForms;
    return this;
  }

  withBasket(basket) {
    this.basket = basket;
    return this;
  }

  build() {
    return {
      customer_id: this.customer_id,
      delivery_address: this.delivery_address,
      billing_address: this.billing_address,
      basket: this.basket
    };
  }
}

module.exports = CheckoutBuilder;

