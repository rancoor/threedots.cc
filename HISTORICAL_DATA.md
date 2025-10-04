# Historical Process Data - 1 Hour Charts

The system dashboard now stores and displays up to 1 hour of historical process data with 5-second intervals.

## 🕒 **Data Collection**

### **Automatic Data Storage**
- **Collection Interval**: Every 5 seconds via WebSocket updates
- **Data Retention**: Up to 1 hour (720 data points maximum)
- **Metrics Stored**: CPU usage (%) and Memory usage (%) for each process
- **Storage**: In-memory storage (resets on server restart)

### **Data Points**
- **Maximum per Process**: 720 data points (1 hour × 12 points per minute)
- **Time Resolution**: 5-second intervals
- **Automatic Cleanup**: Old data points are automatically removed after 1 hour
- **Process Lifecycle**: Data is automatically cleaned up when processes terminate

## 📊 **Chart Features**

### **Individual Process Charts**
- **Location**: Small chart on each process card
- **Data**: Shows complete historical data for that process
- **Real-time Updates**: Charts update every 5 seconds with new data points
- **Data Point Counter**: Shows number of historical data points collected
- **Time Range**: Displays up to 1 hour of data

### **Chart Enhancements**
- **Smooth Lines**: Tension curves for better visual representation
- **Dual Y-Axes**: Separate scales for CPU (left) and Memory (right)
- **Color Coding**: Green for CPU, Cyan for Memory
- **Smart Labels**: Automatic label thinning for readability
- **Interactive Tooltips**: Show exact values and timestamps
- **Responsive Design**: Adapts to different screen sizes

## 🔍 **Historical Data Modal**

### **Full History View**
- **Access**: Click "History" button on any process card
- **Features**:
  - Large, detailed chart showing all historical data
  - Complete time range information
  - Data point count and collection period
  - Enhanced tooltip information
  - Professional chart styling

### **Data Information**
- **Time Range**: Shows exact start and end times of data collection
- **Data Points**: Total number of data points collected
- **Collection Period**: How long the process has been monitored

## 📈 **System Statistics**

### **Enhanced Stats Panel**
- **Total Data Points**: Sum of all data points across all processes
- **Data Range Info**: Shows average time span and total data collection
- **Real-time Updates**: Statistics update every 10 seconds
- **Process Count**: Number of active processes being monitored

### **Smart Data Display**
- **Time Calculation**: Automatically calculates time span based on data points
- **Multi-process Summary**: Shows aggregate statistics across all processes
- **Dynamic Info**: Updates as processes start/stop

## 🔄 **Real-time Features**

### **Live Chart Updates**
- **WebSocket Integration**: Real-time data streaming via WebSocket
- **Performance Optimized**: Charts update without animations for smooth performance
- **Memory Efficient**: Automatic cleanup of old data points
- **Bandwidth Optimized**: Only sends necessary data updates

### **Process Management**
- **New Process Detection**: Automatically starts collecting data for new processes
- **Process Termination**: Automatically stops data collection and cleans up
- **Data Persistence**: Data survives process kills until cleanup interval

## 🛠️ **Technical Implementation**

### **Server-side Data Management**
```javascript
// Data structure for each process
{
  timestamp: 1696443600000,
  cpu: 15.2,
  memory: 8.7,
  time: "2:30:00 PM"
}

// Storage: Map<PID, Array<DataPoint>>
// Max points per process: 720 (1 hour)
// Cleanup: Automatic after 1 hour
```

### **API Endpoints**
- `GET /system/history/:pid` - Get complete historical data for a process
- `WebSocket systemUpdate` - Real-time updates with embedded chart data
- `GET /system/stats` - System statistics including data collection info

### **Chart Configuration**
- **Library**: Chart.js with optimized settings
- **Performance**: Disabled animations, smart label management
- **Styling**: Dark theme with professional color scheme
- **Interaction**: Hover tooltips, zoom capabilities

## 📊 **Data Visualization**

### **Chart Types**
- **Line Charts**: Smooth curves showing trends over time
- **Dual Metrics**: CPU and Memory on same chart with separate axes
- **Time-based X-axis**: Shows actual timestamps for data points
- **Responsive Scaling**: Automatically adjusts to data density

### **Visual Enhancements**
- **Background Fill**: Subtle gradient fills under lines
- **Grid Lines**: Semi-transparent grid for easier reading
- **Point Styling**: Small points that expand on hover
- **Professional Colors**: Consistent color scheme across all charts

## ⚡ **Performance Features**

### **Memory Management**
- **Automatic Cleanup**: Old data points automatically removed
- **Process Cleanup**: Data removed when processes terminate
- **Memory Limits**: Maximum 720 points per process prevents memory bloat
- **Efficient Storage**: Optimized data structures for fast access

### **Update Optimization**
- **Smart Updates**: Only update changed data
- **Animation Control**: Disabled for better performance with large datasets
- **Batch Processing**: Multiple processes updated efficiently
- **Minimal DOM Manipulation**: Optimized chart updates

## 🎯 **Usage Examples**

### **Monitoring Long-running Processes**
1. Start your test processes: `./test-process-manager.sh start all`
2. Navigate to the system dashboard
3. Watch charts populate with historical data over time
4. Click "History" to see detailed timeline views

### **Performance Analysis**
1. Identify processes with high resource usage
2. View historical trends to understand usage patterns
3. Use full history view for detailed analysis
4. Monitor resource usage over extended periods

### **System Health Monitoring**
1. Track overall system performance via statistics panel
2. Monitor multiple processes simultaneously
3. Identify resource spikes and usage patterns
4. Use historical data for capacity planning

## 🔧 **Configuration Options**

### **Customizable Settings**
- `MAX_HISTORY_MINUTES`: 60 (1 hour of data retention)
- `DATA_POINTS_PER_HOUR`: 720 (5-second intervals)
- Collection interval: 5 seconds (WebSocket update rate)
- Chart update rate: Real-time via WebSocket

### **Future Enhancements**
- **Persistent Storage**: Database storage for data persistence
- **Export Functionality**: CSV/JSON export of historical data
- **Custom Time Ranges**: User-selectable time ranges for viewing
- **Alert Thresholds**: Notifications based on historical patterns

## 🎪 **Testing Historical Data**

### **Quick Test Scenario**
1. Start test processes: `./test-process-manager.sh start all`
2. Let them run for 10-15 minutes to collect data
3. View individual process charts showing historical trends
4. Click "History" buttons to see detailed views
5. Test process kill functionality and watch data cleanup

### **Extended Test Scenario**
1. Start processes and let them run for the full hour
2. Watch charts accumulate full 720 data points
3. Test automatic data cleanup as old points are removed
4. Verify system statistics show accurate data point counts
5. Test historical data modal with complete hour of data

The historical data feature provides comprehensive monitoring capabilities while maintaining excellent performance and user experience. Charts now show meaningful trends and patterns rather than just recent snapshots, making the dashboard much more valuable for system monitoring and analysis.