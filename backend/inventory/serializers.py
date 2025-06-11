from rest_framework import serializers
from .models import (
    Supplier, Customer, Product,
    SalesInvoice, SalesInvoiceItem,
    PurchaseInvoice, PurchaseInvoiceItem
)


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = '__all__'


class ProductSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    unit_display = serializers.CharField(source='get_unit_display', read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'unit', 'unit_display', 'quantity', 'price',
            'supplier', 'supplier_name', 'status', 'status_display',
            'low_stock_threshold', 'description',
            'created_at', 'updated_at'
        ]


class SalesInvoiceItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = SalesInvoiceItem
        fields = ['id', 'product', 'product_name', 'quantity', 'price', 'total']


class SalesInvoiceSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    items = SalesInvoiceItemSerializer(source='salesinvoiceitem_set', many=True, read_only=True)
    time = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = SalesInvoice
        fields = [
            'id', 'invoice_id', 'customer', 'customer_name', 'date', 'time',
            'subtotal', 'tax_rate', 'tax_amount', 'total', 'notes',
            'items', 'created_at', 'updated_at'
        ]


class CreateSalesInvoiceSerializer(serializers.ModelSerializer):
    items = serializers.ListField(write_only=True)

    class Meta:
        model = SalesInvoice
        fields = ['customer', 'date', 'tax_rate', 'notes', 'items']

    def create(self, validated_data):
        from django.db import transaction

        items_data = validated_data.pop('items')

        # Generate descriptive invoice ID
        from .models import Customer

        # Get customer name for invoice
        customer = Customer.objects.get(id=validated_data['customer'].id)

        # Get product names for invoice description
        product_names = []
        for item_data in items_data:
            from .models import Product
            product = Product.objects.get(id=item_data['product'])
            product_names.append(product.name)

        # Create descriptive but short invoice ID (max 50 chars)
        if len(product_names) == 1:
            product_desc = product_names[0][:15]  # Limit product name length
        elif len(product_names) <= 2:
            product_desc = ", ".join([name[:10] for name in product_names])
        else:
            product_desc = f"{product_names[0][:10]} +{len(product_names)-1}"

        # Limit customer name and create short invoice ID
        customer_short = customer.name[:15]
        invoice_id = f"S: {product_desc} → {customer_short}"

        # Ensure total length doesn't exceed 50 characters
        if len(invoice_id) > 50:
            # Fallback to even shorter format
            invoice_id = f"S: {product_names[0][:10]} → {customer.name[:10]}"
            if len(invoice_id) > 50:
                # Ultimate fallback with timestamp
                import uuid
                invoice_id = f"SALE-{uuid.uuid4().hex[:8].upper()}"

        # Set tax rate to 0 (no tax)
        validated_data['tax_rate'] = 0.00

        try:
            with transaction.atomic():
                # Create invoice
                invoice = SalesInvoice.objects.create(
                    invoice_id=invoice_id,
                    **validated_data
                )

                # Create invoice items and update product quantities
                for item_data in items_data:
                    # Check if product has enough stock
                    from .models import Product
                    from decimal import Decimal, InvalidOperation

                    product = Product.objects.get(id=item_data['product'])
                    if product.quantity < item_data['quantity']:
                        raise serializers.ValidationError(
                            f"Insufficient stock for {product.name}. Available: {product.quantity}, Requested: {item_data['quantity']}"
                        )

                    # Validate price
                    try:
                        price = Decimal(str(item_data['price']))
                        if price <= 0:
                            raise serializers.ValidationError(f"Price must be greater than 0 for {product.name}")
                    except (InvalidOperation, ValueError):
                        raise serializers.ValidationError(f"Invalid price format for {product.name}: {item_data['price']}")

                    # Create invoice item (this will automatically update product quantity)
                    SalesInvoiceItem.objects.create(
                        invoice=invoice,
                        product=product,
                        quantity=item_data['quantity'],
                        price=price
                    )

                # Final calculation of invoice totals
                invoice.calculate_totals()

                return invoice

        except Exception as e:
            raise serializers.ValidationError(f"Error creating sales invoice: {str(e)}")


class PurchaseInvoiceItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = PurchaseInvoiceItem
        fields = ['id', 'product', 'product_name', 'quantity', 'price', 'total']


class PurchaseInvoiceSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    items = PurchaseInvoiceItemSerializer(source='purchaseinvoiceitem_set', many=True, read_only=True)
    time = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = PurchaseInvoice
        fields = [
            'id', 'invoice_id', 'supplier', 'supplier_name', 'date', 'time',
            'subtotal', 'tax_rate', 'tax_amount', 'total', 'notes',
            'items', 'created_at', 'updated_at'
        ]


class CreatePurchaseInvoiceSerializer(serializers.ModelSerializer):
    items = serializers.ListField(write_only=True)

    class Meta:
        model = PurchaseInvoice
        fields = ['supplier', 'date', 'tax_rate', 'notes', 'items']

    def create(self, validated_data):
        from django.db import transaction

        items_data = validated_data.pop('items')

        # Generate descriptive invoice ID (same logic as sales)
        from .models import Supplier

        # Get supplier name for invoice
        supplier = Supplier.objects.get(id=validated_data['supplier'].id)

        # Get product names for invoice description
        product_names = []
        for item_data in items_data:
            from .models import Product
            product = Product.objects.get(id=item_data['product'])
            product_names.append(product.name)

        # Create descriptive but short invoice ID (max 50 chars)
        if len(product_names) == 1:
            product_desc = product_names[0][:15]  # Limit product name length
        elif len(product_names) <= 2:
            product_desc = ", ".join([name[:10] for name in product_names])
        else:
            product_desc = f"{product_names[0][:10]} +{len(product_names)-1}"

        # Limit supplier name and create short invoice ID
        supplier_short = supplier.name[:15]
        invoice_id = f"P: {product_desc} ← {supplier_short}"

        # Ensure total length doesn't exceed 50 characters
        if len(invoice_id) > 50:
            # Fallback to even shorter format
            invoice_id = f"P: {product_names[0][:10]} ← {supplier.name[:10]}"
            if len(invoice_id) > 50:
                # Ultimate fallback with timestamp
                import uuid
                invoice_id = f"PUR-{uuid.uuid4().hex[:8].upper()}"

        # Set tax rate to 0 (no tax)
        validated_data['tax_rate'] = 0.00

        try:
            with transaction.atomic():
                # Create invoice
                invoice = PurchaseInvoice.objects.create(
                    invoice_id=invoice_id,
                    **validated_data
                )

                # Create invoice items and update product quantities
                for item_data in items_data:
                    from .models import Product
                    from decimal import Decimal, InvalidOperation

                    product = Product.objects.get(id=item_data['product'])

                    # Validate price
                    try:
                        price = Decimal(str(item_data['price']))
                        if price <= 0:
                            raise serializers.ValidationError(f"Price must be greater than 0 for {product.name}")
                    except (InvalidOperation, ValueError):
                        raise serializers.ValidationError(f"Invalid price format for {product.name}: {item_data['price']}")

                    # Create invoice item (this will automatically update product quantity)
                    PurchaseInvoiceItem.objects.create(
                        invoice=invoice,
                        product=product,
                        quantity=item_data['quantity'],
                        price=price
                    )

                # Final calculation of invoice totals
                invoice.calculate_totals()

                return invoice

        except Exception as e:
            raise serializers.ValidationError(f"Error creating purchase invoice: {str(e)}")


# Dashboard Stats Serializer
class DashboardStatsSerializer(serializers.Serializer):
    total_products = serializers.IntegerField()
    low_stock_count = serializers.IntegerField()
    total_sales = serializers.DecimalField(max_digits=12, decimal_places=2)
    today_sales = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_purchases = serializers.DecimalField(max_digits=12, decimal_places=2)
    today_purchases = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_customers = serializers.IntegerField()
    total_suppliers = serializers.IntegerField()
