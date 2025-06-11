from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal


class Supplier(models.Model):
    """Model for suppliers/vendors"""
    name = models.CharField(max_length=255)
    contact_person = models.CharField(max_length=255, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']


class Customer(models.Model):
    """Model for customers"""
    name = models.CharField(max_length=255)
    contact_person = models.CharField(max_length=255, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']


class Product(models.Model):
    """Model for products in inventory"""
    STATUS_CHOICES = [
        ('in_stock', 'In Stock'),
        ('low_stock', 'Low Stock'),
        ('out_of_stock', 'Out of Stock'),
    ]

    UNIT_CHOICES = [
        ('kg', 'Kilogram'),
        ('liter', 'Liter'),
        ('can', 'Can'),
        ('box', 'Box'),
        ('piece', 'Piece'),
        ('gram', 'Gram'),
        ('ml', 'Milliliter'),
    ]

    name = models.CharField(max_length=255)
    unit = models.CharField(max_length=20, choices=UNIT_CHOICES, default='piece')
    quantity = models.IntegerField(validators=[MinValueValidator(0)], default=0)
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='in_stock')
    low_stock_threshold = models.IntegerField(default=10, validators=[MinValueValidator(0)])
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Auto-update status based on quantity
        if self.quantity == 0:
            self.status = 'out_of_stock'
        elif self.quantity <= self.low_stock_threshold:
            self.status = 'low_stock'
        else:
            self.status = 'in_stock'
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']


class SalesInvoice(models.Model):
    """Model for sales invoices"""
    invoice_id = models.CharField(max_length=50, unique=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE)
    date = models.DateField()
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=10.00)  # Tax percentage
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def calculate_totals(self):
        """Calculate total without tax"""
        items = self.salesinvoiceitem_set.all()
        self.subtotal = sum(item.total for item in items)
        self.tax_amount = 0  # No tax
        self.total = self.subtotal  # Total equals subtotal (no tax)
        self.save()

    def __str__(self):
        return f"{self.invoice_id} - {self.customer.name}"

    class Meta:
        ordering = ['-date', '-created_at']


class SalesInvoiceItem(models.Model):
    """Model for items in sales invoices"""
    invoice = models.ForeignKey(SalesInvoice, on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.IntegerField(validators=[MinValueValidator(1)])
    price = models.DecimalField(max_digits=10, decimal_places=2)
    total = models.DecimalField(max_digits=12, decimal_places=2)

    def save(self, *args, **kwargs):
        # Extract custom arguments before calling parent save
        skip_product_update = kwargs.pop('skip_product_update', False)
        skip_invoice_update = kwargs.pop('skip_invoice_update', False)

        self.total = self.quantity * self.price
        super().save(*args, **kwargs)

        # Update product quantity (only if not skipped)
        if not skip_product_update:
            self.product.quantity -= self.quantity
            self.product.save()

        # Recalculate invoice totals (only if not skipped)
        if not skip_invoice_update:
            self.invoice.calculate_totals()

    def __str__(self):
        return f"{self.invoice.invoice_id} - {self.product.name}"


class PurchaseInvoice(models.Model):
    """Model for purchase invoices"""
    invoice_id = models.CharField(max_length=50, unique=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE)
    date = models.DateField()
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=10.00)  # Tax percentage
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def calculate_totals(self):
        """Calculate total without tax"""
        items = self.purchaseinvoiceitem_set.all()
        self.subtotal = sum(item.total for item in items)
        self.tax_amount = 0  # No tax
        self.total = self.subtotal  # Total equals subtotal (no tax)
        self.save()

    def __str__(self):
        return f"{self.invoice_id} - {self.supplier.name}"

    class Meta:
        ordering = ['-date', '-created_at']


class PurchaseInvoiceItem(models.Model):
    """Model for items in purchase invoices"""
    invoice = models.ForeignKey(PurchaseInvoice, on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.IntegerField(validators=[MinValueValidator(1)])
    price = models.DecimalField(max_digits=10, decimal_places=2)
    total = models.DecimalField(max_digits=12, decimal_places=2)

    def save(self, *args, **kwargs):
        # Extract custom arguments before calling parent save
        skip_product_update = kwargs.pop('skip_product_update', False)
        skip_invoice_update = kwargs.pop('skip_invoice_update', False)

        self.total = self.quantity * self.price
        super().save(*args, **kwargs)

        # Update product quantity (only if not skipped)
        if not skip_product_update:
            self.product.quantity += self.quantity
            self.product.save()

        # Recalculate invoice totals (only if not skipped)
        if not skip_invoice_update:
            self.invoice.calculate_totals()

    def __str__(self):
        return f"{self.invoice.invoice_id} - {self.product.name}"