# 🚀 Store Management System - Quick Setup

## One-Click Setup & Run

This project includes automated setup scripts that will clone, install, and run the entire application with a single command.

### 📋 Prerequisites

Before running the setup script, make sure you have these installed:

- **Git** (for cloning the repository)
- **Python 3.8+** (for Django backend)
- **Node.js 16+** (for Next.js frontend)
- **npm** (comes with Node.js)

### 🖥️ For Linux/Mac Users

1. **Download the setup script:**
   ```bash
   curl -O https://raw.githubusercontent.com/aqib11234/store/main/setup-and-run.sh
   ```

2. **Make it executable:**
   ```bash
   chmod +x setup-and-run.sh
   ```

3. **Run the script:**
   ```bash
   ./setup-and-run.sh
   ```

### 🪟 For Windows Users

1. **Download the setup script:**
   - Right-click and save: [setup-and-run.bat](https://raw.githubusercontent.com/aqib11234/store/main/setup-and-run.bat)

2. **Run the script:**
   - Double-click `setup-and-run.bat`
   - Or run from Command Prompt: `setup-and-run.bat`

### 🎯 What the Script Does

1. **🔍 Checks Dependencies** - Verifies Git, Python, Node.js are installed
2. **📥 Clones Repository** - Downloads the latest code from GitHub
3. **🐍 Sets up Backend** - Creates Python virtual environment, installs packages
4. **📦 Sets up Frontend** - Installs Node.js dependencies
5. **🗄️ Initializes Database** - Runs Django migrations
6. **🚀 Starts Both Servers** - Launches backend and frontend simultaneously

### 📱 Access Your Application

After the script completes, your application will be available at:

- **Main App**: http://localhost:3000
- **API Backend**: http://localhost:8000
- **Admin Panel**: http://localhost:8000/admin

### 🛑 Stopping the Application

- **Linux/Mac**: Press `Ctrl+C` in the terminal
- **Windows**: Close the terminal windows that opened

### 🔧 Manual Setup (Alternative)

If you prefer manual setup:

```bash
# 1. Clone repository
git clone https://github.com/aqib11234/store.git
cd store

# 2. Setup backend
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# OR
venv\Scripts\activate.bat  # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver &

# 3. Setup frontend (new terminal)
cd ../store
npm install
npm run dev
```

### 🆘 Troubleshooting

**Common Issues:**

1. **"Command not found" errors**: Install the missing dependency (Git, Python, Node.js)
2. **Permission denied**: Run `chmod +x setup-and-run.sh` on Linux/Mac
3. **Port already in use**: Stop other applications using ports 3000 or 8000
4. **Python virtual environment issues**: Try using `python3` instead of `python`

### 📞 Support

If you encounter any issues:
1. Check the error messages in the terminal
2. Ensure all prerequisites are installed
3. Try the manual setup method
4. Contact the developer for support

---

**🎉 Enjoy your Store Management System!**
