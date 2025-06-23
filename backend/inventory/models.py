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
    sale_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))], default=Decimal('0.00'))
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
    PAYMENT_STATUS_CHOICES = [
        ('paid', 'Fully Paid'),
        ('partial', 'Partially Paid'),
        ('unpaid', 'Unpaid'),
    ]

    invoice_id = models.CharField(max_length=50, unique=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE)
    date = models.DateField()
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=10.00)  # Tax percentage
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True)

    # Loan/Payment tracking fields
    is_loan = models.BooleanField(default=False, help_text="Whether this sale is on loan/credit")
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Amount paid so far")
    remaining_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Remaining amount to be paid")
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='paid')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def calculate_totals(self):
        """Calculate total without tax and update payment status"""
        items = self.salesinvoiceitem_set.all()
        self.subtotal = sum(item.total for item in items)
        self.tax_amount = 0  # No tax
        self.total = self.subtotal  # Total equals subtotal (no tax)

        # Update remaining balance and payment status
        if self.is_loan:
            self.remaining_balance = self.total - self.amount_paid
            if self.amount_paid >= self.total:
                self.payment_status = 'paid'
                self.remaining_balance = 0
            elif self.amount_paid > 0:
                self.payment_status = 'partial'
            else:
                self.payment_status = 'unpaid'
        else:
            # If not a loan, mark as fully paid
            self.amount_paid = self.total
            self.remaining_balance = 0
            self.payment_status = 'paid'

        self.save()

    def add_payment(self, amount, notes=""):
        """Add a payment to this loan"""
        if not self.is_loan:
            raise ValueError("Cannot add payment to non-loan invoice")

        if amount <= 0:
            raise ValueError("Payment amount must be positive")

        if self.amount_paid + amount > self.total:
            raise ValueError("Payment amount exceeds remaining balance")

        # Create payment record
        SalesLoanPayment.objects.create(
            invoice=self,
            amount=amount,
            notes=notes
        )

        # Update invoice payment status
        self.amount_paid += amount
        self.calculate_totals()  # This will update payment status and remaining balance

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


class SalesLoanPayment(models.Model):
    """Model for tracking loan payments on sales invoices"""
    invoice = models.ForeignKey(SalesInvoice, on_delete=models.CASCADE, related_name='loan_payments')
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    date = models.DateField(auto_now_add=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment ₨{self.amount} for {self.invoice.invoice_id}"

    class Meta:
        ordering = ['-date', '-created_at']


class PurchaseInvoice(models.Model):
    """Model for purchase invoices"""
    PAYMENT_STATUS_CHOICES = [
        ('paid', 'Fully Paid'),
        ('partial', 'Partially Paid'),
        ('unpaid', 'Unpaid'),
    ]

    invoice_id = models.CharField(max_length=50, unique=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE)
    date = models.DateField()
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=10.00)  # Tax percentage
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True)

    # Loan/Payment tracking fields
    is_loan = models.BooleanField(default=False, help_text="Whether this purchase is on loan/credit")
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Amount paid so far")
    remaining_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Remaining amount to be paid")
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='paid')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def calculate_totals(self):
        """Calculate total without tax and update payment status"""
        items = self.purchaseinvoiceitem_set.all()
        self.subtotal = sum(item.total for item in items)
        self.tax_amount = 0  # No tax
        self.total = self.subtotal  # Total equals subtotal (no tax)

        # Update remaining balance and payment status
        if self.is_loan:
            self.remaining_balance = self.total - self.amount_paid
            if self.amount_paid >= self.total:
                self.payment_status = 'paid'
                self.remaining_balance = 0
            elif self.amount_paid > 0:
                self.payment_status = 'partial'
            else:
                self.payment_status = 'unpaid'
        else:
            # If not a loan, mark as fully paid
            self.amount_paid = self.total
            self.remaining_balance = 0
            self.payment_status = 'paid'

        self.save()

    def add_payment(self, amount, notes=""):
        """Add a payment to this loan"""
        if not self.is_loan:
            raise ValueError("Cannot add payment to non-loan invoice")

        if amount <= 0:
            raise ValueError("Payment amount must be positive")

        if self.amount_paid + amount > self.total:
            raise ValueError("Payment amount exceeds remaining balance")

        # Create payment record
        PurchaseLoanPayment.objects.create(
            invoice=self,
            amount=amount,
            notes=notes
        )

        # Update invoice payment status
        self.amount_paid += amount
        self.calculate_totals()  # This will update payment status and remaining balance

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


class PurchaseLoanPayment(models.Model):
    """Model for tracking loan payments on purchase invoices"""
    invoice = models.ForeignKey(PurchaseInvoice, on_delete=models.CASCADE, related_name='loan_payments')
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    date = models.DateField(auto_now_add=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment ₨{self.amount} for {self.invoice.invoice_id}"

    class Meta:
        ordering = ['-date', '-created_at']


class AccountTransaction(models.Model):
    """Model for manual account money transactions (add/withdraw)"""
    TRANSACTION_TYPE_CHOICES = [
        ("add", "Deposit"),
        ("withdraw", "Withdrawal"),
    ]
    type = models.CharField(max_length=10, choices=TRANSACTION_TYPE_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    description = models.TextField(blank=True)
    date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_type_display()} ₨{self.amount} ({self.date:%Y-%m-%d %H:%M})"

    class Meta:
        ordering = ['-date']