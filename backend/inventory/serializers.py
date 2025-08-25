from rest_framework import serializers
from .models import (
    Supplier, Customer, Product,
    SalesInvoice, SalesInvoiceItem, SalesLoanPayment,
    PurchaseInvoice, PurchaseInvoiceItem, PurchaseLoanPayment,
    AccountTransaction, CustomerLedger, SupplierLedger,
    CustomerLedgerTransaction, SupplierLedgerTransaction
)
from django.db import IntegrityError
import uuid


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
    sale_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)  # Allow sale_price to be writable
    amount_paid = serializers.DecimalField(max_digits=10, decimal_places=2, write_only=True, required=False)  # For loan tracking

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'unit', 'unit_display', 'quantity', 'price', 'sale_price',  # Added sale_price
            'supplier', 'supplier_name', 'status', 'status_display',
            'low_stock_threshold', 'description', 'amount_paid',  # Added amount_paid
            'created_at', 'updated_at'
        ]


class SalesInvoiceItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = SalesInvoiceItem
        fields = ['id', 'product', 'product_name', 'quantity', 'price', 'total']


class SalesLoanPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalesLoanPayment
        fields = ['id', 'amount', 'date', 'notes', 'created_at']


class SalesInvoiceSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    items = SalesInvoiceItemSerializer(source='salesinvoiceitem_set', many=True, read_only=True)
    loan_payments = SalesLoanPaymentSerializer(many=True, read_only=True)
    time = serializers.DateTimeField(source='created_at', read_only=True)
    payment_status_display = serializers.CharField(source='get_payment_status_display', read_only=True)

    class Meta:
        model = SalesInvoice
        fields = [
            'id', 'invoice_id', 'customer', 'customer_name', 'date', 'time',
            'subtotal', 'tax_rate', 'tax_amount', 'total', 'notes',
            'is_loan', 'amount_paid', 'remaining_balance', 'payment_status', 'payment_status_display',
            'items', 'loan_payments', 'created_at', 'updated_at'
        ]


class CreateSalesInvoiceSerializer(serializers.ModelSerializer):
    items = serializers.ListField(write_only=True)

    class Meta:
        model = SalesInvoice
        fields = ['customer', 'date', 'tax_rate', 'notes', 'items', 'is_loan', 'amount_paid']

    def create(self, validated_data):
        from django.db import transaction
        import logging

        logger = logging.getLogger(__name__)
        logger.info(f"Creating sales invoice with data: {validated_data}")

        items_data = validated_data.pop('items')
        logger.info(f"Items data: {items_data}")

        # Handle loan fields
        is_loan = validated_data.get('is_loan', False)
        amount_paid = validated_data.get('amount_paid', 0)

        # Ensure amount_paid defaults to 0 if not provided or empty
        if amount_paid is None or amount_paid == '':
            validated_data['amount_paid'] = 0

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

                # Validate loan payment amount
                if is_loan and amount_paid > invoice.total:
                    raise serializers.ValidationError(f"Amount paid (₨{amount_paid}) cannot exceed total amount (₨{invoice.total})")

                # Create ledger transaction
                invoice.create_ledger_transaction()

                return invoice

        except IntegrityError:
            # Retry with a new unique invoice_id
            import uuid
            validated_data['invoice_id'] = f"SALE-{uuid.uuid4().hex[:8].upper()}"
            # Create invoice with fallback ID
            invoice = SalesInvoice.objects.create(**validated_data)

            # Create invoice items
            for item_data in items_data:
                from .models import Product
                from decimal import Decimal

                product = Product.objects.get(id=item_data['product'])
                price = Decimal(str(item_data['price']))

                SalesInvoiceItem.objects.create(
                    invoice=invoice,
                    product=product,
                    quantity=item_data['quantity'],
                    price=price
                )

            invoice.calculate_totals()
            # Create ledger transaction
            invoice.create_ledger_transaction()
            return invoice
        except Exception as e:
            raise serializers.ValidationError(f"Error creating sales invoice: {str(e)}")


class PurchaseInvoiceItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = PurchaseInvoiceItem
        fields = ['id', 'product', 'product_name', 'quantity', 'price', 'total']


class PurchaseLoanPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseLoanPayment
        fields = ['id', 'amount', 'date', 'notes', 'created_at']


class PurchaseInvoiceSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    items = PurchaseInvoiceItemSerializer(source='purchaseinvoiceitem_set', many=True, read_only=True)
    loan_payments = PurchaseLoanPaymentSerializer(many=True, read_only=True)
    time = serializers.DateTimeField(source='created_at', read_only=True)
    payment_status_display = serializers.CharField(source='get_payment_status_display', read_only=True)

    class Meta:
        model = PurchaseInvoice
        fields = [
            'id', 'invoice_id', 'supplier', 'supplier_name', 'date', 'time',
            'subtotal', 'tax_rate', 'tax_amount', 'total', 'notes',
            'is_loan', 'amount_paid', 'remaining_balance', 'payment_status', 'payment_status_display',
            'items', 'loan_payments', 'created_at', 'updated_at'
        ]


class CreatePurchaseInvoiceSerializer(serializers.ModelSerializer):
    items = serializers.ListField(write_only=True)

    class Meta:
        model = PurchaseInvoice
        fields = ['supplier', 'date', 'tax_rate', 'notes', 'items', 'is_loan', 'amount_paid']

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

        # Handle loan fields
        is_loan = validated_data.get('is_loan', False)
        amount_paid = validated_data.get('amount_paid', 0)

        # Ensure amount_paid defaults to 0 if not provided or empty
        if amount_paid is None or amount_paid == '':
            validated_data['amount_paid'] = 0

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

                # Final calculation of invoice totals (this handles loan payment status)
                invoice.calculate_totals()

                # Validate loan payment amount
                if is_loan and amount_paid > invoice.total:
                    raise serializers.ValidationError(f"Amount paid (₨{amount_paid}) cannot exceed total amount (₨{invoice.total})")

                # Create ledger transaction
                invoice.create_ledger_transaction()

                return invoice

        except Exception as e:
            raise serializers.ValidationError(f"Error creating purchase invoice: {str(e)}")


class AccountTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccountTransaction
        fields = ['id', 'type', 'amount', 'description', 'date']


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


# Ledger Serializers
class CustomerLedgerTransactionSerializer(serializers.ModelSerializer):
    transaction_type_display = serializers.CharField(source='get_transaction_type_display', read_only=True)
    customer_name = serializers.CharField(source='ledger.customer.name', read_only=True)

    class Meta:
        model = CustomerLedgerTransaction
        fields = ['id', 'transaction_type', 'transaction_type_display', 'amount', 'description',
                 'date', 'created_at', 'customer_name', 'reference_invoice', 'reference_payment']


class SupplierLedgerTransactionSerializer(serializers.ModelSerializer):
    transaction_type_display = serializers.CharField(source='get_transaction_type_display', read_only=True)
    supplier_name = serializers.CharField(source='ledger.supplier.name', read_only=True)

    class Meta:
        model = SupplierLedgerTransaction
        fields = ['id', 'transaction_type', 'transaction_type_display', 'amount', 'description',
                 'date', 'created_at', 'supplier_name', 'reference_invoice', 'reference_payment']


class CustomerLedgerSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)
    customer_email = serializers.CharField(source='customer.email', read_only=True)
    transactions = CustomerLedgerTransactionSerializer(many=True, read_only=True)

    class Meta:
        model = CustomerLedger
        fields = ['id', 'customer', 'customer_name', 'customer_phone', 'customer_email',
                 'current_balance', 'total_sales', 'total_payments', 'credit_limit',
                 'created_at', 'updated_at', 'transactions']


class SupplierLedgerSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    supplier_phone = serializers.CharField(source='supplier.phone', read_only=True)
    supplier_email = serializers.CharField(source='supplier.email', read_only=True)
    transactions = SupplierLedgerTransactionSerializer(many=True, read_only=True)

    class Meta:
        model = SupplierLedger
        fields = ['id', 'supplier', 'supplier_name', 'supplier_phone', 'supplier_email',
                 'current_balance', 'total_purchases', 'total_payments',
                 'created_at', 'updated_at', 'transactions']