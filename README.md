# 🏪 Store Management System

A full-stack store management application with Next.js frontend and Django backend.

## 🚀 Features

### Frontend (Next.js)
- **Dashboard**: Real-time statistics and overview
- **Product Management**: View, add, edit, and delete products
- **Invoice Management**: Sales and purchase invoices
- **Responsive Design**: Works on desktop and mobile
- **Dark/Light Theme**: Toggle between themes
- **Modern UI**: Built with Tailwind CSS and Radix UI

### Backend (Django)
- **REST API**: Complete CRUD operations
- **PostgreSQL Database**: Robust data storage
- **Admin Panel**: Django admin for data management
- **CORS Support**: Frontend-backend integration
- **Data Validation**: Comprehensive input validation
- **Auto-calculations**: Automatic invoice totals and stock status

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **Python** (v3.8 or higher)
- **PostgreSQL** (v12 or higher)
- **Git**

## 🛠️ Installation & Setup

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd store
```

### 2. Backend Setup (Django)

#### Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

#### Database Setup
1. Create PostgreSQL database:
```sql
CREATE DATABASE store_db;
CREATE USER postgres WITH PASSWORD 'password123';
GRANT ALL PRIVILEGES ON DATABASE store_db TO postgres;
```

2. Update `.env` file in backend directory:
```env
DEBUG=True
SECRET_KEY=your-secret-key
DATABASE_NAME=store_db
DATABASE_USER=postgres
DATABASE_PASSWORD=your-password
DATABASE_HOST=localhost
DATABASE_PORT=5432
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

#### Run Migrations & Setup
```bash
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py populate_data  # Load sample data
```

#### Start Backend Server
```bash
python manage.py runserver
```
Backend will be available at: http://localhost:8000

### 3. Frontend Setup (Next.js)

#### Install Dependencies
```bash
cd store  # Navigate to frontend directory
npm install
```

#### Environment Variables
Create `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

#### Start Frontend Server
```bash
npm run dev
```
Frontend will be available at: http://localhost:3000

## 📊 Database Models

### Core Models
- **Supplier**: Vendor information
- **Customer**: Customer details
- **Product**: Inventory items with stock tracking
- **SalesInvoice**: Customer sales records
- **PurchaseInvoice**: Supplier purchase records
- **InvoiceItems**: Line items for invoices

### Key Features
- **Auto Stock Updates**: Inventory automatically updates on sales/purchases
- **Status Tracking**: Products automatically marked as low/out of stock
- **Invoice Calculations**: Automatic subtotal, tax, and total calculations

## 🔗 API Endpoints

### Products
- `GET /api/products/` - List all products
- `POST /api/products/` - Create new product
- `GET /api/products/{id}/` - Get product details
- `PUT /api/products/{id}/` - Update product
- `DELETE /api/products/{id}/` - Delete product

### Invoices
- `GET /api/sales-invoices/` - List sales invoices
- `GET /api/purchase-invoices/` - List purchase invoices
- `GET /api/dashboard-stats/` - Dashboard statistics

### Other Endpoints
- `GET /api/suppliers/` - List suppliers
- `GET /api/customers/` - List customers

## 🎨 Frontend Structure

```
store/
├── app/                    # Next.js app directory
│   ├── dashboard/         # Dashboard page
│   ├── invoices/          # Invoices page
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── ui/               # Base UI components
│   ├── dashboard-*.tsx   # Dashboard components
│   ├── products-*.tsx    # Product components
│   └── invoice-*.tsx     # Invoice components
├── lib/                  # Utilities
│   ├── api.ts           # API client
│   └── utils.ts         # Helper functions
└── public/              # Static assets
```

## 🗄️ Backend Structure

```
backend/
├── store_backend/        # Django project
│   ├── settings.py      # Configuration
│   └── urls.py          # URL routing
├── inventory/           # Main app
│   ├── models.py        # Database models
│   ├── views.py         # API views
│   ├── serializers.py   # Data serialization
│   ├── admin.py         # Admin configuration
│   └── urls.py          # App URLs
└── manage.py            # Django management
```

## 🚀 Deployment

### Backend (Django)
1. Set `DEBUG=False` in production
2. Configure production database
3. Set up static file serving
4. Use WSGI server (Gunicorn, uWSGI)

### Frontend (Next.js)
1. Build the application: `npm run build`
2. Deploy to Vercel, Netlify, or your preferred platform
3. Update `NEXT_PUBLIC_API_URL` to production backend URL

## 🔧 Development

### Adding New Features
1. **Backend**: Add models, serializers, views, and URLs
2. **Frontend**: Create components and integrate with API
3. **Testing**: Test both frontend and backend functionality

### Code Style
- **Backend**: Follow PEP 8 Python style guide
- **Frontend**: Use ESLint and Prettier for consistent formatting

## 📝 Sample Data

The system includes sample data with:
- 10 products (Rice, Flour, Sugar, etc.)
- Multiple suppliers and customers
- Sample invoices for testing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the documentation
2. Review existing issues
3. Create a new issue with detailed information

---

**Happy coding! 🎉**
