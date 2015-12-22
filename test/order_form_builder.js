'use strict';

class OrderFormBuilder {
  constructor() {
    this.supplier = 'Pub Taverns';
    this.line_items = [{
      product: {
        id: 'ABC123',
        url: 'http://www.example.com/product?=ABC123',
        name: 'ABC Trainers',
        price: 50.00,
        was_price: 50.00
      },
      quantity: 2,
      subtotal: 100.00
    }];
    this.line_item_count = 1;
    this.subtotal = 100.00;
    this.delivery_method = 'Standard';
  }

  withSupplierId(supplier) {
    this.supplier = supplier;
    return this;
  }

  build() {
    return {
      supplier: this.supplier,
      line_items: this.line_items,
      line_item_count: this.line_item_count,
      subtotal: this.subtotal,
      delivery_method: this.delivery_method
    };
  }
}

module.exports = OrderFormBuilder;

