#!/usr/bin/env python
"""
Script to add sample purchase invoices for testing dashboard stats
"""
import os
import sys
import django
from datetime import date, timedelta
from decimal import Decimal

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'store_backend.settings')
django.setup()

from inventory.models import Supplier, Product, PurchaseInvoice, PurchaseInvoiceItem

def create_sample_purchases():
    """Create sample purchase invoices"""
    
    # Get or create suppliers
    supplier1, _ = Supplier.objects.get_or_create(
        name="ABC Wholesale Co.",
        defaults={
            'contact_person': 'Ahmed Khan',
            'email': 'ahmed@abcwholesale.com',
            'phone': '+92-300-1234567',
            'address': 'Karachi, Pakistan'
        }
    )
    
    supplier2, _ = Supplier.objects.get_or_create(
        name="XYZ Distributors",
        defaults={
            'contact_person': 'Fatima Ali',
            'email': 'fatima@xyzdist.com',
            'phone': '+92-321-9876543',
            'address': 'Lahore, Pakistan'
        }
    )
    
    # Get some products
    products = list(Product.objects.all()[:5])
    if not products:
        print("No products found. Please add some products first.")
        return
    
    # Create purchase invoices
    purchases_data = [
        {
            'supplier': supplier1,
            'date': date.today() - timedelta(days=5),
            'items': [
                {'product': products[0], 'quantity': 50, 'price': Decimal('45.00')},
                {'product': products[1], 'quantity': 30, 'price': Decimal('25.50')},
            ]
        },
        {
            'supplier': supplier2,
            'date': date.today() - timedelta(days=3),
            'items': [
                {'product': products[2], 'quantity': 100, 'price': Decimal('15.75')},
                {'product': products[3], 'quantity': 25, 'price': Decimal('85.00')},
            ]
        },
        {
            'supplier': supplier1,
            'date': date.today(),  # Today's purchase
            'items': [
                {'product': products[4], 'quantity': 75, 'price': Decimal('32.50')},
                {'product': products[0], 'quantity': 20, 'price': Decimal('47.00')},
            ]
        }
    ]
    
    for i, purchase_data in enumerate(purchases_data, 1):
        # Get product names for descriptive invoice ID
        product_names = [item['product'].name for item in purchase_data['items']]
        if len(product_names) == 1:
            product_desc = product_names[0]
        elif len(product_names) <= 3:
            product_desc = ", ".join(product_names)
        else:
            product_desc = f"{product_names[0]} and {len(product_names)-1} more items"

        # Create purchase invoice with descriptive but short name (max 50 chars)
        supplier_short = purchase_data['supplier'].name[:15]
        invoice_id = f"P: {product_desc[:15]} ← {supplier_short}"

        # Ensure total length doesn't exceed 50 characters
        if len(invoice_id) > 50:
            invoice_id = f"P: {product_names[0][:10]} ← {supplier_short[:10]}"
            if len(invoice_id) > 50:
                # Ultimate fallback
                invoice_id = f"PUR-{date.today().strftime('%m%d')}-{i:02d}"
        invoice = PurchaseInvoice.objects.create(
            invoice_id=invoice_id,
            supplier=purchase_data['supplier'],
            date=purchase_data['date'],
            tax_rate=Decimal('0.00'),  # No tax
            notes=f"Sample purchase invoice {i}"
        )
        
        # Create purchase items
        for item_data in purchase_data['items']:
            PurchaseInvoiceItem.objects.create(
                invoice=invoice,
                product=item_data['product'],
                quantity=item_data['quantity'],
                price=item_data['price']
            )
        
        # Calculate totals
        invoice.calculate_totals()
        
        print(f"Created purchase invoice: {invoice.invoice_id} - ₨{invoice.total}")
    
    print(f"\nSample purchase invoices created successfully!")
    print(f"Total purchase invoices: {PurchaseInvoice.objects.count()}")
    print(f"Today's purchases: ₨{PurchaseInvoice.objects.filter(date=date.today()).aggregate(total=django.db.models.Sum('total'))['total'] or 0}")

if __name__ == '__main__':
    create_sample_purchases()
