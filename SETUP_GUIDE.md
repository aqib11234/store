# 🚀 Complete Setup Guide for Store Management System

## 📋 **Step-by-Step Installation on New System**

### **Prerequisites** ✅
Before starting, make sure you have:
- **Node.js** (v18+) - [Download here](https://nodejs.org/)
- **Python** (v3.8+) - [Download here](https://python.org/)
- **PostgreSQL** (v12+) - [Download here](https://postgresql.org/)
- **Git** - [Download here](https://git-scm.com/)

---

## **🗄️ Step 1: Database Setup**

### **Install PostgreSQL**
1. Download and install PostgreSQL
2. Remember your **postgres user password**
3. Open **pgAdmin** or **psql** command line

### **Create Database**
```sql
-- Connect to PostgreSQL as postgres user
CREATE DATABASE store_management;
CREATE USER store_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE store_management TO store_user;
```

---

## **📥 Step 2: Clone Project from GitHub**

```bash
# Clone the repository
git clone https://github.com/aqib11234/store.git
cd store
```

---

## **🐍 Step 3: Backend Setup (Django)**

### **Navigate to Backend**
```bash
cd backend
```

### **Create Virtual Environment** (Recommended)
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### **Install Dependencies**
```bash
pip install -r requirements.txt
```

### **Create Environment File**
Create `.env` file in `backend` directory:
```env
DEBUG=True
SECRET_KEY=django-insecure-your-secret-key-here-change-in-production
DATABASE_NAME=store_management
DATABASE_USER=store_user
DATABASE_PASSWORD=your_secure_password
DATABASE_HOST=localhost
DATABASE_PORT=5432
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### **Run Database Migrations**
```bash
python manage.py makemigrations
python manage.py migrate
```

### **Create Admin User**
```bash
python manage.py createsuperuser
# Enter username, email, and password
```

### **Load Sample Data** (Optional)
```bash
python manage.py shell
```
Then run:
```python
from inventory.models import *
from decimal import Decimal

# Create sample supplier
supplier = Supplier.objects.create(
    name="ABC Wholesale",
    contact_person="John Doe",
    email="john@abc.com",
    phone="123-456-7890"
)

# Create sample customer
customer = Customer.objects.create(
    name="Retail Store XYZ",
    contact_person="Jane Smith",
    email="jane@xyz.com",
    phone="098-765-4321"
)

# Create sample products
products = [
    {"name": "Rice", "price": "50.00", "sale_price": "55.00", "quantity": 100},
    {"name": "Flour", "price": "40.00", "sale_price": "45.00", "quantity": 80},
    {"name": "Sugar", "price": "60.00", "sale_price": "65.00", "quantity": 50},
]

for p in products:
    Product.objects.create(
        name=p["name"],
        price=Decimal(p["price"]),
        sale_price=Decimal(p["sale_price"]),
        quantity=p["quantity"],
        supplier=supplier
    )

print("Sample data created successfully!")
exit()
```

### **Start Backend Server**
```bash
python manage.py runserver
```
✅ Backend running at: **http://localhost:8000**

---

## **⚛️ Step 4: Frontend Setup (Next.js)**

### **Open New Terminal** and navigate to frontend:
```bash
cd store  # Navigate to frontend directory
```

### **Install Dependencies**
```bash
npm install
```

### **Create Environment File**
Create `.env.local` file in `store` directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### **Start Frontend Server**
```bash
npm run dev
```
✅ Frontend running at: **http://localhost:3000**

---

## **🎯 Step 5: Verify Installation**

### **Check Backend**
1. Visit: http://localhost:8000/admin
2. Login with your superuser credentials
3. Check if you can see the admin panel

### **Check Frontend**
1. Visit: http://localhost:3000
2. Should redirect to dashboard
3. Check if data loads properly

### **Test API Connection**
1. Visit: http://localhost:8000/api/products/
2. Should see JSON response with products

---

## **🔧 Troubleshooting**

### **Common Issues & Solutions**

#### **Database Connection Error**
```
django.db.utils.OperationalError: could not connect to server
```
**Solution:**
- Check PostgreSQL is running
- Verify database credentials in `.env`
- Ensure database exists

#### **CORS Error in Frontend**
```
Access to fetch at 'http://localhost:8000' has been blocked by CORS policy
```
**Solution:**
- Check `CORS_ALLOWED_ORIGINS` in backend `.env`
- Restart backend server after changes

#### **Module Not Found Error**
```
ModuleNotFoundError: No module named 'django'
```
**Solution:**
- Activate virtual environment
- Run `pip install -r requirements.txt`

#### **Port Already in Use**
```
Error: listen EADDRINUSE: address already in use :::3000
```
**Solution:**
- Kill process: `npx kill-port 3000`
- Or use different port: `npm run dev -- -p 3001`

---

## **📁 Project Structure After Setup**

```
store/
├── backend/                 # Django Backend
│   ├── venv/               # Virtual environment
│   ├── .env                # Environment variables
│   ├── manage.py           # Django management
│   └── inventory/          # Main app
├── store/                  # Next.js Frontend
│   ├── .env.local          # Environment variables
│   ├── package.json        # Dependencies
│   └── components/         # React components
├── README.md               # Project documentation
└── SETUP_GUIDE.md         # This guide
```

---

## **🚀 Production Deployment**

### **Backend (Django)**
1. Set `DEBUG=False`
2. Use production database
3. Configure static files
4. Use WSGI server (Gunicorn)

### **Frontend (Next.js)**
1. Build: `npm run build`
2. Deploy to Vercel/Netlify
3. Update API URL to production

---

## **✅ Quick Checklist**

- [ ] PostgreSQL installed and running
- [ ] Database created with correct credentials
- [ ] Project cloned from GitHub
- [ ] Backend virtual environment activated
- [ ] Backend dependencies installed
- [ ] Backend `.env` file configured
- [ ] Database migrations completed
- [ ] Admin user created
- [ ] Backend server running (port 8000)
- [ ] Frontend dependencies installed
- [ ] Frontend `.env.local` configured
- [ ] Frontend server running (port 3000)
- [ ] Both servers accessible in browser

---

## **🆘 Need Help?**

If you encounter any issues:
1. Check this troubleshooting guide
2. Verify all environment variables
3. Ensure all services are running
4. Check console/terminal for error messages

**Happy coding! 🎉**