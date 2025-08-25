from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'suppliers', views.SupplierViewSet)
router.register(r'customers', views.CustomerViewSet)
router.register(r'products', views.ProductViewSet)
router.register(r'sales-invoices', views.SalesInvoiceViewSet)
router.register(r'purchase-invoices', views.PurchaseInvoiceViewSet)
router.register(r'account-transactions', views.AccountTransactionViewSet)
router.register(r'customer-ledgers', views.CustomerLedgerViewSet)
router.register(r'supplier-ledgers', views.SupplierLedgerViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/dashboard-stats/', views.dashboard_stats, name='dashboard-stats'),
]
