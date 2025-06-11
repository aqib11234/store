from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal
from inventory.models import (
    Supplier, Customer, Product,
    SalesInvoice, SalesInvoiceItem,
    PurchaseInvoice, PurchaseInvoiceItem
)


class Command(BaseCommand):
    help = 'Populate database with sample data matching frontend'

    def handle(self, *args, **options):
        self.stdout.write('Creating sample data...')

        # Create suppliers
        suppliers_data = [
            {'name': 'Global Foods Inc.', 'contact_person': 'John Smith', 'email': 'john@globalfoods.com'},
            {'name': "Baker's Supply Co.", 'contact_person': 'Mary Johnson', 'email': 'mary@bakerssupply.com'},
            {'name': 'Sweet Distributors', 'contact_person': 'David Brown', 'email': 'david@sweetdist.com'},
            {'name': 'Organic Oils Ltd.', 'contact_person': 'Sarah Wilson', 'email': 'sarah@organicoils.com'},
            {'name': 'Mineral Essentials', 'contact_person': 'Mike Davis', 'email': 'mike@mineraless.com'},
            {'name': 'Spice Traders', 'contact_person': 'Lisa Garcia', 'email': 'lisa@spicetraders.com'},
            {'name': 'Farm Fresh Cannery', 'contact_person': 'Tom Miller', 'email': 'tom@farmfresh.com'},
            {'name': 'Italian Imports', 'contact_person': 'Anna Rossi', 'email': 'anna@italianimpor.com'},
            {'name': 'Mountain Brew Co.', 'contact_person': 'Chris Lee', 'email': 'chris@mountainbrew.com'},
            {'name': 'Ceylon Teas', 'contact_person': 'Raj Patel', 'email': 'raj@ceylonteas.com'},
        ]

        suppliers = {}
        for supplier_data in suppliers_data:
            supplier, created = Supplier.objects.get_or_create(
                name=supplier_data['name'],
                defaults=supplier_data
            )
            suppliers[supplier.name] = supplier
            if created:
                self.stdout.write(f'Created supplier: {supplier.name}')

        # Create customers
        customers_data = [
            {'name': 'ABC Retail Store', 'contact_person': 'Robert Johnson', 'email': 'robert@abcretail.com'},
            {'name': 'XYZ Supermarket', 'contact_person': 'Jennifer Smith', 'email': 'jennifer@xyzsupermarket.com'},
            {'name': 'Fresh Market Co.', 'contact_person': 'Michael Brown', 'email': 'michael@freshmarket.com'},
        ]

        customers = {}
        for customer_data in customers_data:
            customer, created = Customer.objects.get_or_create(
                name=customer_data['name'],
                defaults=customer_data
            )
            customers[customer.name] = customer
            if created:
                self.stdout.write(f'Created customer: {customer.name}')

        # Create products matching frontend data
        products_data = [
            {'name': 'Rice (Basmati)', 'unit': 'kg', 'quantity': 500, 'price': Decimal('2.50'), 'supplier': 'Global Foods Inc.', 'sku': 'RICE-001'},
            {'name': 'Flour (All Purpose)', 'unit': 'kg', 'quantity': 300, 'price': Decimal('1.20'), 'supplier': "Baker's Supply Co.", 'sku': 'FLOUR-001'},
            {'name': 'Sugar (White)', 'unit': 'kg', 'quantity': 250, 'price': Decimal('0.95'), 'supplier': 'Sweet Distributors', 'sku': 'SUGAR-001'},
            {'name': 'Cooking Oil', 'unit': 'liter', 'quantity': 150, 'price': Decimal('3.75'), 'supplier': 'Organic Oils Ltd.', 'sku': 'OIL-001'},
            {'name': 'Salt (Iodized)', 'unit': 'kg', 'quantity': 100, 'price': Decimal('0.65'), 'supplier': 'Mineral Essentials', 'sku': 'SALT-001'},
            {'name': 'Black Pepper', 'unit': 'kg', 'quantity': 50, 'price': Decimal('12.50'), 'supplier': 'Spice Traders', 'sku': 'PEPPER-001'},
            {'name': 'Canned Tomatoes', 'unit': 'can', 'quantity': 200, 'price': Decimal('1.15'), 'supplier': 'Farm Fresh Cannery', 'sku': 'TOMATO-001'},
            {'name': 'Pasta (Spaghetti)', 'unit': 'kg', 'quantity': 180, 'price': Decimal('1.45'), 'supplier': 'Italian Imports', 'sku': 'PASTA-001'},
            {'name': 'Coffee Beans', 'unit': 'kg', 'quantity': 75, 'price': Decimal('15.99'), 'supplier': 'Mountain Brew Co.', 'sku': 'COFFEE-001'},
            {'name': 'Tea Bags', 'unit': 'box', 'quantity': 120, 'price': Decimal('3.25'), 'supplier': 'Ceylon Teas', 'sku': 'TEA-001'},
        ]

        products = {}
        for product_data in products_data:
            supplier_name = product_data.pop('supplier')
            product_data['supplier'] = suppliers[supplier_name]

            product, created = Product.objects.get_or_create(
                name=product_data['name'],
                defaults=product_data
            )
            products[product.name] = product
            if created:
                self.stdout.write(f'Created product: {product.name}')

        self.stdout.write(self.style.SUCCESS('Sample data created successfully!'))
