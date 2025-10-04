# Enhanced System Processes Dashboard

🚀 **A comprehensive, real-time system process monitoring dashboard with historical data visualization and advanced management capabilities.**

## 📋 **Quick Start**

```bash
# Clone the repository
git clone git@github.com:rancoor/threedots.cc.git
cd threedots.cc

# Install dependencies
npm install

# Start the server
npm start

# Access the dashboard
# Navigate to: http://localhost:9100
# Login: cheruiyotca@gmail.com / @Darth77.
```

## ✨ **Key Features**

### 🔍 **Real-time Process Monitoring**
- Live WebSocket-based updates every 5 seconds
- Process termination (SIGTERM) and force kill (SIGKILL)
- Multi-client synchronization
- Comprehensive process details (PID, User, CPU, Memory, Status)

### 📊 **Historical Data & Charts**
- **1-hour historical storage** with up to 720 data points per process
- Professional Chart.js visualizations with dual Y-axes
- Interactive tooltips and timeline analysis
- Smart label management for data density optimization

### 🔐 **Enterprise Security**
- Secure authentication with bcrypt password hashing
- Rate limiting (5 login attempts per 15 minutes)
- Session management with 4-hour timeout
- CSRF protection and input validation

### 📈 **Advanced Analytics**
- System-wide statistics and metrics
- Multi-source log viewing (systemd, syslog, process-specific)
- Memory usage tracking (VSZ/RSS)
- Process performance trend analysis

### 🧪 **Testing Infrastructure**
- Comprehensive test processes (Node.js, Bash, Python)
- Process manager script for easy testing
- Realistic resource usage simulation
- Signal handling and graceful shutdown

## 📚 **Documentation**

| Document | Description |
|----------|-------------|
| [`COMPLETE_FEATURES.md`](./COMPLETE_FEATURES.md) | **Comprehensive feature overview** |
| [`SYSTEM_FEATURES.md`](./SYSTEM_FEATURES.md) | System dashboard capabilities |
| [`HISTORICAL_DATA.md`](./HISTORICAL_DATA.md) | Historical data implementation details |
| [`TEST_PROCESSES.md`](./TEST_PROCESSES.md) | Testing infrastructure guide |
| [`WARP.md`](./WARP.md) | Warp AI integration details |

## 🛠️ **API Endpoints**

```javascript
GET  /system              // Main system processes page
GET  /system/stats        // System statistics and metrics
GET  /system/logs/:pid    // Multi-source process logs
GET  /system/details/:pid // Enhanced process details
GET  /system/history/:pid // Complete historical data
POST /system/kill/:pid    // Process termination
WebSocket systemUpdate   // Real-time process updates
```

## 🎯 **Testing the Dashboard**

```bash
# Start test processes for demonstration
./test-process-manager.sh start all

# Check status of test processes
./test-process-manager.sh status

# View logs
./test-process-manager.sh logs all

# Stop test processes
./test-process-manager.sh stop all
```

## 🚀 **Technology Stack**

- **Backend**: Node.js, Express.js, Socket.IO
- **Frontend**: EJS templates, Chart.js, TailwindCSS
- **Security**: bcrypt, rate limiting, session management
- **Real-time**: WebSocket communication
- **Data**: In-memory historical storage with automatic cleanup

## 📊 **Dashboard Features**

### **Process Management**
- ✅ Kill processes (SIGTERM) with confirmation
- ✅ Force kill unresponsive processes (SIGKILL)
- ✅ View detailed process information
- ✅ Access multi-source logs
- ✅ Monitor historical performance

### **Data Visualization**
- ✅ Real-time charts for CPU and memory usage
- ✅ 1-hour historical timeline with 5-second intervals
- ✅ Professional dark theme with gradient fills
- ✅ Interactive tooltips and data point counters
- ✅ Responsive design for all devices

### **System Statistics**
- ✅ Active process count
- ✅ Average CPU usage
- ✅ System memory percentage
- ✅ Load average monitoring
- ✅ Total data points collected

## 🔧 **Configuration**

Copy `.env.example` to `.env` and configure:

```env
PORT=9100
NODE_ENV=development
SESSION_SECRET=your-super-secret-session-key-here
ADMIN_EMAIL=your-email@example.com
ADMIN_PASSWORD=your-secure-password
```

## 🎨 **User Interface**

- **Modern UI** with TailwindCSS styling
- **Professional modals** with backdrop blur effects
- **Toast notifications** for user feedback
- **Mobile-responsive** design
- **Font Awesome icons** throughout
- **Loading indicators** for all operations

## 📱 **Responsive Design**

The dashboard is fully responsive and optimized for:
- **Desktop**: Full feature experience with detailed charts
- **Tablet**: Touch-friendly interface with adaptive layouts  
- **Mobile**: Optimized for small screens with essential features

## 🏗️ **Architecture**

```
threedots.cc/
├── server.js                 # Main Express server with Socket.IO
├── views/
│   ├── system.ejs           # System dashboard page
│   ├── login.ejs            # Authentication page
│   └── header.ejs           # Shared header component
├── test-process*.{js,py,sh} # Test processes for demonstration
├── test-process-manager.sh   # Process management utility
├── docs/                    # Comprehensive documentation
└── public/                  # Static assets
```

## 🔮 **Future Enhancements**

- Database persistence for historical data
- Custom alert thresholds and notifications
- Data export capabilities (CSV, JSON, PDF)
- Process dependency tracking
- Integration with external monitoring systems
- Advanced analytics and trend prediction

## 📝 **License**

This project is available under the MIT License. See the repository for details.

## 🤝 **Contributing**

Contributions are welcome! Please read the documentation and test your changes with the provided test infrastructure.

---

**Built with ❤️ using Node.js, Express, Socket.IO, Chart.js, and TailwindCSS**

🌟 **Star this repository** if you find it useful!

📧 **Contact**: cheruiyotca@gmail.com

🔗 **Repository**: [github.com/rancoor/threedots.cc](https://github.com/rancoor/threedots.cc)