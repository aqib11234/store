# ⚡ Quick Start Guide

## 🚀 **For Experienced Developers**

### **1. Prerequisites**
- Node.js 18+, Python 3.8+, PostgreSQL 12+, Git

### **2. Clone & Setup**
```bash
# Clone repository
git clone https://github.com/aqib11234/store.git
cd store

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # Edit with your database credentials
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver  # Runs on :8000

# Frontend setup (new terminal)
cd store
npm install
cp .env.local.example .env.local
npm run dev  # Runs on :3000
```

### **3. Database Setup**
```sql
CREATE DATABASE store_management;
CREATE USER store_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE store_management TO store_user;
```

### **4. Access**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api
- **Admin Panel**: http://localhost:8000/admin

---

## 🎯 **For New Users**

**See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed step-by-step instructions.**

---

## 📋 **What You Get**

✅ **Complete Store Management System**
- Product inventory management
- Sales & purchase invoicing
- Customer & supplier management
- Real-time dashboard with statistics
- Smart price suggestions
- Account money tracking
- POS system with cart functionality

✅ **Modern Tech Stack**
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Django 5.0, PostgreSQL, REST API
- **Features**: Real-time updates, responsive design, dark/light theme

✅ **Production Ready**
- Comprehensive error handling
- Data validation
- Security best practices
- Scalable architecture