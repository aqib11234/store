from django.contrib import admin
from .models import (
    Supplier, Customer, Product,
    SalesInvoice, SalesInvoiceItem, SalesLoanPayment,
    PurchaseInvoice, PurchaseInvoiceItem, PurchaseLoanPayment
)


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ['name', 'contact_person', 'email', 'phone', 'created_at']
    search_fields = ['name', 'contact_person', 'email']
    list_filter = ['created_at']


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['name', 'contact_person', 'email', 'phone', 'created_at']
    search_fields = ['name', 'contact_person', 'email']
    list_filter = ['created_at']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'unit', 'quantity', 'price', 'supplier', 'status', 'created_at']
    search_fields = ['name', 'sku', 'description']
    list_filter = ['status', 'unit', 'supplier', 'created_at']
    list_editable = ['quantity', 'price', 'status']


class SalesInvoiceItemInline(admin.TabularInline):
    model = SalesInvoiceItem
    extra = 1


@admin.register(SalesInvoice)
class SalesInvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_id', 'customer', 'date', 'total', 'amount_paid', 'payment_status', 'created_at']
    search_fields = ['invoice_id', 'customer__name']
    list_filter = ['date', 'payment_status', 'is_loan', 'created_at']
    inlines = [SalesInvoiceItemInline]


@admin.register(SalesLoanPayment)
class SalesLoanPaymentAdmin(admin.ModelAdmin):
    list_display = ['invoice', 'amount', 'date', 'created_at']
    search_fields = ['invoice__invoice_id', 'notes']
    list_filter = ['date', 'created_at']


class PurchaseInvoiceItemInline(admin.TabularInline):
    model = PurchaseInvoiceItem
    extra = 1


@admin.register(PurchaseInvoice)
class PurchaseInvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_id', 'supplier', 'date', 'total', 'amount_paid', 'payment_status', 'created_at']
    search_fields = ['invoice_id', 'supplier__name']
    list_filter = ['date', 'payment_status', 'is_loan', 'created_at']
    inlines = [PurchaseInvoiceItemInline]


@admin.register(PurchaseLoanPayment)
class PurchaseLoanPaymentAdmin(admin.ModelAdmin):
    list_display = ['invoice', 'amount', 'date', 'created_at']
    search_fields = ['invoice__invoice_id', 'notes']
    list_filter = ['date', 'created_at']