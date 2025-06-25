from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Sum, Count, Prefetch
from django.utils import timezone
from datetime import date

from .models import (
    Supplier, Customer, Product,
    SalesInvoice, SalesInvoiceItem,
    PurchaseInvoice, PurchaseInvoiceItem, PurchaseLoanPayment,
    AccountTransaction
)
from .serializers import (
    SupplierSerializer, CustomerSerializer, ProductSerializer,
    SalesInvoiceSerializer, SalesInvoiceItemSerializer,
    CreateSalesInvoiceSerializer,
    PurchaseInvoiceSerializer, PurchaseInvoiceItemSerializer,
    CreatePurchaseInvoiceSerializer,
    DashboardStatsSerializer,
    AccountTransactionSerializer
)
from .pagination import (
    CustomPageNumberPagination, 
    LargeResultsSetPagination, 
    SmallResultsSetPagination
)
from rest_framework import permissions


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    pagination_class = SmallResultsSetPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['name', 'contact_person', 'email']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    pagination_class = SmallResultsSetPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['name', 'contact_person', 'email']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related('supplier').all()
    serializer_class = ProductSerializer
    pagination_class = LargeResultsSetPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'unit', 'supplier']
    search_fields = ['name', 'description', 'supplier__name']
    ordering_fields = ['name', 'price', 'quantity', 'created_at', 'updated_at']
    ordering = ['-updated_at', 'name']  # Show recently updated products first

    def get_queryset(self):
        """
        Optimized queryset with select_related for supplier to avoid N+1 queries
        """
        return super().get_queryset()

    def perform_create(self, serializer):
        """Override to create purchase invoice when adding new products"""
        from datetime import date
        from decimal import Decimal

        # Debug log for received data
        print(f"Received data for product creation: {serializer.validated_data}")

        # Normalize product and supplier names to avoid duplicates and confusion
        normalized_name = serializer.validated_data['name'].strip().lower()
        normalized_supplier = serializer.validated_data['supplier']
        if hasattr(normalized_supplier, 'name'):
            normalized_supplier_name = normalized_supplier.name.strip().lower()
        else:
            normalized_supplier_name = None

        # Find supplier by normalized name if possible
        if normalized_supplier_name:
            supplier_obj = Supplier.objects.filter(name__iexact=normalized_supplier_name).first()
        else:
            supplier_obj = serializer.validated_data['supplier']

        # Don't automatically merge products - let the frontend handle this logic
        # This prevents the double quantity issue

        # Set normalized name before saving
        serializer.validated_data['name'] = normalized_name
        product = serializer.save()

        # Debug log for sale_price
        print(f"Creating product with sale_price: {serializer.validated_data.get('sale_price')}")

        # Check if sale_price and purchase_price are the same
        if serializer.validated_data.get('sale_price') == serializer.validated_data.get('price'):
            print("Warning: Sale price and purchase price are the same!")

        # Create purchase invoice if product has supplier and quantity > 0
        if product.supplier and product.quantity > 0:
            import uuid
            from datetime import datetime
            
            # Generate unique invoice ID using timestamp and UUID
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            unique_id = uuid.uuid4().hex[:6].upper()
            invoice_id = f"PUR-{timestamp}-{unique_id}"

            # Ensure invoice_id is unique (extra safety check)
            while PurchaseInvoice.objects.filter(invoice_id=invoice_id).exists():
                unique_id = uuid.uuid4().hex[:6].upper()
                invoice_id = f"PUR-{timestamp}-{unique_id}"

            # Handle loan functionality
            total_cost = Decimal(str(product.price)) * product.quantity
            amount_paid = serializer.validated_data.get('amount_paid', total_cost)
            if amount_paid is None:
                amount_paid = total_cost
            else:
                amount_paid = Decimal(str(amount_paid))
            
            is_loan = amount_paid < total_cost

            invoice = PurchaseInvoice.objects.create(
                invoice_id=invoice_id,
                supplier=product.supplier,
                date=date.today(),
                tax_rate=Decimal('0.00'),  # No tax
                notes=f"Auto-generated for new product: {product.name}{' (Loan)' if is_loan else ''}",
                is_loan=is_loan,
                amount_paid=amount_paid
            )

            # Create purchase invoice item (skip product update since product already has correct quantity)
            item = PurchaseInvoiceItem(
                invoice=invoice,
                product=product,
                quantity=product.quantity,
                price=Decimal(str(product.price))
            )
            item.save(skip_product_update=True)

            # Calculate totals (this will update payment status and remaining balance)
            invoice.calculate_totals()

    def perform_update(self, serializer):
        """Ensure sale_price is saved correctly during updates"""
        # Debug log for sale_price during update
        print(f"Updating product with sale_price: {serializer.validated_data.get('sale_price')}")
        if serializer.validated_data.get('sale_price') == serializer.validated_data.get('price'):
            print("Warning: Sale price and purchase price are the same during update!")
        serializer.save()


class SalesInvoiceViewSet(viewsets.ModelViewSet):
    queryset = SalesInvoice.objects.select_related('customer').prefetch_related(
        Prefetch(
            'salesinvoiceitem_set',
            queryset=SalesInvoiceItem.objects.select_related('product')
        ),
        'loan_payments'
    ).all()
    serializer_class = SalesInvoiceSerializer
    pagination_class = CustomPageNumberPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['customer', 'date', 'payment_status', 'is_loan']
    search_fields = ['invoice_id', 'customer__name']
    ordering_fields = ['date', 'total', 'created_at', 'updated_at']
    ordering = ['-date', '-created_at']

    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreateSalesInvoiceSerializer
        return SalesInvoiceSerializer

    def destroy(self, request, *args, **kwargs):
        """Delete a sales invoice and restore product quantities"""
        instance = self.get_object()

        # Restore product quantities for each item
        for item in instance.salesinvoiceitem_set.all():
            item.product.quantity += item.quantity
            item.product.save()

        # Delete the invoice (items will be deleted via cascade)
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'])
    def last_price(self, request):
        """Get the last price at which a specific product was sold to a specific customer"""
        customer_id = request.query_params.get('customer_id')
        product_id = request.query_params.get('product_id')

        if not customer_id or not product_id:
            return Response(
                {'error': 'Both customer_id and product_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            customer_id = int(customer_id)
            product_id = int(product_id)
        except ValueError:
            return Response(
                {'error': 'customer_id and product_id must be valid integers'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if customer exists
        try:
            customer = Customer.objects.get(id=customer_id)
        except Customer.DoesNotExist:
            return Response(
                {'error': 'Customer not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if product exists
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response(
                {'error': 'Product not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Find the last sale of this product to this customer
        last_sale_item = SalesInvoiceItem.objects.filter(
            invoice__customer_id=customer_id,
            product_id=product_id
        ).select_related('invoice').order_by('-invoice__date', '-invoice__created_at').first()

        if not last_sale_item:
            return Response(
                {
                    'found': False,
                    'message': f'No previous sales of "{product.name}" to "{customer.name}" found',
                    'customer_name': customer.name,
                    'product_name': product.name
                }
            )

        return Response(
            {
                'found': True,
                'last_price': str(last_sale_item.price),
                'last_sale_date': last_sale_item.invoice.date,
                'invoice_id': last_sale_item.invoice.invoice_id,
                'quantity_sold': last_sale_item.quantity,
                'customer_name': customer.name,
                'product_name': product.name,
                'message': f'Last sold "{product.name}" to "{customer.name}" for ₨{last_sale_item.price} on {last_sale_item.invoice.date}'
            }
        )


class PurchaseInvoiceViewSet(viewsets.ModelViewSet):
    queryset = PurchaseInvoice.objects.select_related('supplier').prefetch_related(
        Prefetch(
            'purchaseinvoiceitem_set',
            queryset=PurchaseInvoiceItem.objects.select_related('product')
        ),
        'loan_payments'
    ).all()
    serializer_class = PurchaseInvoiceSerializer
    pagination_class = CustomPageNumberPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['supplier', 'date', 'payment_status', 'is_loan']
    search_fields = ['invoice_id', 'supplier__name']
    ordering_fields = ['date', 'total', 'created_at', 'updated_at']
    ordering = ['-date', '-created_at']

    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreatePurchaseInvoiceSerializer
        return PurchaseInvoiceSerializer

    def destroy(self, request, *args, **kwargs):
        """Delete a purchase invoice and reduce product quantities"""
        instance = self.get_object()

        # Reduce product quantities for each item
        for item in instance.purchaseinvoiceitem_set.all():
            item.product.quantity -= item.quantity
            item.product.save()

        # Delete the invoice (items will be deleted via cascade)
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def add_payment(self, request, pk=None):
        """Add a payment to a loan invoice"""
        invoice = self.get_object()

        if not invoice.is_loan:
            return Response(
                {'error': 'Cannot add payment to non-loan invoice'},
                status=status.HTTP_400_BAD_REQUEST
            )

        amount = request.data.get('amount')
        notes = request.data.get('notes', '')

        if not amount:
            return Response(
                {'error': 'Amount is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            amount = float(amount)
            if amount <= 0:
                return Response(
                    {'error': 'Amount must be positive'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if invoice.amount_paid + amount > invoice.total:
                return Response(
                    {'error': f'Payment amount (₨{amount}) exceeds remaining balance (₨{invoice.remaining_balance})'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Add the payment
            invoice.add_payment(amount, notes)

            # Return updated invoice data
            serializer = self.get_serializer(invoice)
            return Response(serializer.data)

        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Error adding payment: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AccountTransactionViewSet(viewsets.ModelViewSet):
    queryset = AccountTransaction.objects.all().order_by('-date')
    serializer_class = AccountTransactionSerializer
    permission_classes = [permissions.AllowAny]


@api_view(['GET'])
def dashboard_stats(request):
    """API endpoint for dashboard statistics"""
    try:
        # Total products
        total_products = Product.objects.count()

        # Low stock products
        low_stock_count = Product.objects.filter(status='low_stock').count()

        # Total sales (all time)
        total_sales = SalesInvoice.objects.aggregate(
            total=Sum('total')
        )['total'] or 0

        # Today's sales
        today = date.today()
        today_sales = SalesInvoice.objects.filter(date=today).aggregate(
            total=Sum('total')
        )['total'] or 0

        # Total purchases (all time)
        total_purchases = PurchaseInvoice.objects.aggregate(
            total=Sum('total')
        )['total'] or 0

        # Today's purchases
        today_purchases = PurchaseInvoice.objects.filter(date=today).aggregate(
            total=Sum('total')
        )['total'] or 0

        # Total customers and suppliers
        total_customers = Customer.objects.count()
        total_suppliers = Supplier.objects.count()

        stats = {
            'total_products': total_products,
            'low_stock_count': low_stock_count,
            'total_sales': total_sales,
            'today_sales': today_sales,
            'total_purchases': total_purchases,
            'today_purchases': today_purchases,
            'total_customers': total_customers,
            'total_suppliers': total_suppliers,
        }

        serializer = DashboardStatsSerializer(stats)
        return Response(serializer.data)

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )