# Enhanced System Processes Dashboard

## 🚀 New Features Added

### Real-time Process Management
- **Live Process Updates**: Real-time WebSocket connection updates process data every 5 seconds
- **Kill Process**: Standard process termination with confirmation dialog
- **Force Kill Process**: Immediate process termination with `kill -9`
- **Process Details Modal**: Comprehensive process information including:
  - PID, User, CPU, Memory usage, Status, Start time
  - Virtual and Resident memory sizes (VSZ/RSS)
  - Full command line
- **Process Logs**: Intelligent log fetching from multiple sources:
  - Journal logs (systemd)
  - System log files (/var/log/syslog, /var/log/messages)
  - Process-specific log files
  - Open file descriptors

### Enhanced UI Components
- **Beautiful Modals**: Professional modal dialogs for process details and logs
- **Loading Indicators**: Smooth loading animations for all operations
- **Toast Notifications**: Non-intrusive success/error notifications
- **System Statistics Panel**: Real-time system overview showing:
  - Active process count
  - Average CPU usage across all processes
  - System memory usage percentage
  - Current system load (1-minute average)

### Real-time Charts
- **Individual Process Charts**: Line charts for each process showing CPU and memory usage over time
- **Chart Performance**: Optimized updates with disabled animations for better performance
- **Data History**: Maintains last 20 data points for each process

### WebSocket Features
- **Bi-directional Communication**: Client can send kill requests via WebSocket
- **Global Updates**: Process kills are broadcast to all connected clients
- **Automatic Cleanup**: Processes removed from UI when terminated

## 🛠️ Technical Implementation

### Server-side Enhancements

#### New API Endpoints
```
GET  /system/stats       - System statistics (CPU, memory, load, process count)
GET  /system/logs/:pid   - Process logs from multiple sources
GET  /system/details/:pid - Enhanced process details with memory info
POST /system/kill/:pid   - HTTP endpoint for process termination
```

#### WebSocket Events
```
// Client to Server
killProcess: { pid }         - Request standard process kill
forceKillProcess: { pid }    - Request force process kill (-9)

// Server to Client
systemUpdate: [processes]    - Updated process list every 5 seconds
processKilled: { success, pid, message } - Kill operation result
processRemoved: { pid }      - Process removed notification (broadcast)
```

#### Process Log Sources
1. **Journald**: Checks systemd journal for service logs
2. **System Logs**: Searches /var/log/syslog and /var/log/messages
3. **Process-specific Logs**: Looks for logs matching process name
4. **File Descriptors**: Lists open files using lsof

### Client-side Enhancements

#### Modal System
- Responsive modal dialogs with backdrop blur
- Click-outside-to-close functionality
- Loading modal for operations
- Structured content display

#### Real-time Updates
- Process grid automatically adds/removes/updates process cards
- Charts update in real-time without page refresh
- Smooth animations for process removal
- Performance optimized chart updates

#### User Experience
- Confirmation dialogs for destructive operations
- Visual feedback for all operations
- Error handling with user-friendly messages
- Responsive design for mobile devices

## 📊 System Statistics

The system statistics panel provides real-time monitoring of:

- **Process Count**: Total number of active system processes
- **Average CPU**: Mean CPU usage across all monitored processes  
- **Memory Usage**: System-wide memory utilization percentage
- **System Load**: 1-minute load average indicating system stress

## 🔧 Process Management Operations

### Standard Kill (SIGTERM)
- Sends SIGTERM signal allowing graceful shutdown
- Process can handle the signal and clean up resources
- Recommended for normal process termination

### Force Kill (SIGKILL)
- Sends SIGKILL signal for immediate termination
- Process cannot handle this signal
- Use only when standard kill fails
- May result in resource leaks or data loss

## 🔍 Log Analysis

The log viewer intelligently searches multiple sources:

1. **Journal Logs**: For systemd services and system processes
2. **System Logs**: General system activity logs
3. **Application Logs**: Process-specific log files
4. **File Handles**: Shows what files the process has open

## 🎨 UI/UX Improvements

- **Dark Theme**: Professional dark color scheme
- **TailwindCSS**: Utility-first CSS framework for consistent styling
- **Font Awesome Icons**: Professional icons throughout the interface
- **Responsive Grid**: Adaptive layout for different screen sizes
- **Smooth Animations**: Subtle transitions and animations
- **Color-coded Information**: Consistent color scheme for different data types

## 🔒 Security Features

- **Authentication Required**: All endpoints protected by session authentication
- **Rate Limiting**: Prevents abuse of system resources
- **Input Validation**: Proper validation of process IDs
- **Error Handling**: Graceful error handling without exposing system details
- **Session Management**: Secure session handling with timeout

## 📈 Performance Optimizations

- **WebSocket Efficiency**: Real-time updates without constant HTTP requests
- **Chart Performance**: Disabled animations for smooth updates
- **Data Limitation**: Charts maintain only last 20 data points
- **Selective Updates**: Only updates changed elements in the DOM
- **Memory Management**: Proper cleanup of destroyed charts and elements

## 🚦 Usage Instructions

1. **Access Dashboard**: Navigate to /system after authentication
2. **View Processes**: See all system processes with real-time updates
3. **Kill Process**: Click "Kill" button and confirm to terminate process
4. **Force Kill**: Use "Force Kill" for unresponsive processes
5. **View Details**: Click "Details" to see comprehensive process information
6. **Check Logs**: Click "Logs" to view process-related log entries
7. **Monitor Stats**: Watch system statistics panel for overall system health

## 🔧 Configuration

The system can be configured via environment variables:
- `NODE_ENV=production` - Enables trust proxy for nginx
- `PORT=9100` - Server port (default: 9100)

## 🐛 Error Handling

- Network errors are handled gracefully with user notifications
- Process not found scenarios are properly managed
- Log fetching failures fall back to basic process information
- Chart errors don't break the overall dashboard functionality

This enhanced system processes dashboard provides comprehensive real-time monitoring and management capabilities while maintaining security, performance, and user experience standards.