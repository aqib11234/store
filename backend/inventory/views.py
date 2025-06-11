from rest_framework import viewsets, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Sum, Count
from django.utils import timezone
from datetime import date

from .models import (
    Supplier, Customer, Product,
    SalesInvoice, SalesInvoiceItem,
    PurchaseInvoice, PurchaseInvoiceItem
)
from .serializers import (
    SupplierSerializer, CustomerSerializer, ProductSerializer,
    SalesInvoiceSerializer, SalesInvoiceItemSerializer,
    CreateSalesInvoiceSerializer,
    PurchaseInvoiceSerializer, PurchaseInvoiceItemSerializer,
    CreatePurchaseInvoiceSerializer,
    DashboardStatsSerializer
)


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['name', 'contact_person', 'email']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['name', 'contact_person', 'email']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related('supplier').all()
    serializer_class = ProductSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'unit', 'supplier']
    search_fields = ['name', 'sku', 'description', 'supplier__name']
    ordering_fields = ['name', 'price', 'quantity', 'created_at']
    ordering = ['name']

    def perform_create(self, serializer):
        """Override to create purchase invoice when adding new products"""
        from datetime import date
        from decimal import Decimal

        product = serializer.save()

        # Create purchase invoice if product has supplier and quantity > 0
        if product.supplier and product.quantity > 0:
            # Create purchase invoice with descriptive but short name (max 50 chars)
            # Use same naming logic as sales invoices
            product_short = product.name[:15]
            supplier_short = product.supplier.name[:15]
            invoice_id = f"P: {product_short} ← {supplier_short}"

            # Ensure total length doesn't exceed 50 characters
            if len(invoice_id) > 50:
                # Fallback to even shorter format
                invoice_id = f"P: {product.name[:10]} ← {product.supplier.name[:10]}"
                if len(invoice_id) > 50:
                    # Ultimate fallback with UUID (same as sales)
                    import uuid
                    invoice_id = f"PUR-{uuid.uuid4().hex[:8].upper()}"
            invoice = PurchaseInvoice.objects.create(
                invoice_id=invoice_id,
                supplier=product.supplier,
                date=date.today(),
                tax_rate=Decimal('0.00'),  # No tax
                notes=f"Auto-generated for new product: {product.name}"
            )

            # Create purchase invoice item (skip product update since product already has correct quantity)
            item = PurchaseInvoiceItem(
                invoice=invoice,
                product=product,
                quantity=product.quantity,
                price=Decimal(str(product.price))
            )
            item.save(skip_product_update=True)

            # Calculate totals (this will be done automatically by the model's save method)


class SalesInvoiceViewSet(viewsets.ModelViewSet):
    queryset = SalesInvoice.objects.select_related('customer').prefetch_related('salesinvoiceitem_set__product').all()
    serializer_class = SalesInvoiceSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['customer', 'date']
    search_fields = ['invoice_id', 'customer__name']
    ordering_fields = ['date', 'total', 'created_at']
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


class PurchaseInvoiceViewSet(viewsets.ModelViewSet):
    queryset = PurchaseInvoice.objects.select_related('supplier').prefetch_related('purchaseinvoiceitem_set__product').all()
    serializer_class = PurchaseInvoiceSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['supplier', 'date']
    search_fields = ['invoice_id', 'supplier__name']
    ordering_fields = ['date', 'total', 'created_at']
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
