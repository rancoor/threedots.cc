# Test Processes for System Dashboard

This directory contains dummy test processes that you can use to test the kill process functionality in your enhanced system dashboard.

## 🎯 Available Test Processes

### 1. Node.js Test Process (`test-process.js`)
- **Language**: Node.js/JavaScript
- **Features**:
  - Uses CPU and memory resources
  - Creates temporary files
  - Writes detailed logs
  - Handles SIGTERM gracefully
  - Allocates memory in chunks (up to 50MB)
  - Displays process information on startup

### 2. Bash Test Process (`test-bash-process.sh`)
- **Language**: Bash shell script
- **Features**:
  - CPU-intensive calculations
  - Creates/manages temporary files
  - Logs to file with timestamps
  - Responds to signals gracefully
  - Shows memory usage via ps command

### 3. Python Test Process (`test-python-process.py`)
- **Language**: Python 3
- **Features**:
  - Advanced memory tracking
  - Creates JSON temporary files
  - Comprehensive logging
  - Signal handling with cleanup
  - Memory allocation simulation (up to 20MB)

## 🚀 Quick Start

### Using the Process Manager (Recommended)

The easiest way to manage test processes is using the included management script:

```bash
# Start a single test process
./test-process-manager.sh start node
./test-process-manager.sh start bash
./test-process-manager.sh start python

# Start all test processes at once
./test-process-manager.sh start all

# Check status of all processes
./test-process-manager.sh status

# View logs
./test-process-manager.sh logs node
./test-process-manager.sh logs all

# Stop processes
./test-process-manager.sh stop python
./test-process-manager.sh stop all

# Clean up temporary files
./test-process-manager.sh clean
```

### Manual Process Management

You can also run the processes manually:

```bash
# Start processes in background
node test-process.js &
bash test-bash-process.sh &
python3 test-python-process.py &

# View running processes
ps aux | grep -E "(test-process|test-bash|test-python)"

# Kill processes manually
kill <PID>
kill -9 <PID>  # Force kill
```

## 📊 Testing the Dashboard

1. **Start your system dashboard**:
   ```bash
   npm start
   ```

2. **Login to the dashboard**:
   - Navigate to `http://localhost:9100`
   - Login with email: `cheruiyotca@gmail.com`
   - Password: `@Darth77.`

3. **Start some test processes**:
   ```bash
   ./test-process-manager.sh start all
   ```

4. **Navigate to the System Processes page**:
   - Go to `http://localhost:9100/system`
   - You should see your test processes listed

5. **Test the features**:
   - **Kill Process**: Click "Kill" button and confirm
   - **Force Kill**: Click "Force Kill" for immediate termination
   - **View Details**: Click "Details" to see comprehensive process info
   - **View Logs**: Click "Logs" to see process logs from multiple sources
   - **Real-time Updates**: Watch CPU/Memory charts update in real-time

## 🔍 What Each Process Does

### Node.js Process Characteristics
- **CPU Usage**: ~5-15% during calculation bursts
- **Memory Usage**: Gradually increases, peaks around 50MB
- **File Operations**: Creates `temp-<PID>-<iteration>.txt` files
- **Log File**: `test-process.log`
- **Behavior**: Performs calculations every 1-3 seconds

### Bash Process Characteristics  
- **CPU Usage**: ~2-8% during calculations
- **Memory Usage**: Limited memory allocation (~10MB max)
- **File Operations**: Creates `temp-<PID>-<iteration>.txt` files
- **Log File**: `test-bash-process.log`
- **Behavior**: Runs calculations every 2-4 seconds

### Python Process Characteristics
- **CPU Usage**: ~10-20% during processing
- **Memory Usage**: Can reach 20MB+ with JSON data
- **File Operations**: Creates `temp-python-<PID>-<iteration>.json` files
- **Log File**: `test-python-process.log`
- **Behavior**: Most resource-intensive, updates every 1-3 seconds

## 📝 Log Files

Each process creates its own log file with detailed information:

- `test-process.log` - Node.js process logs
- `test-bash-process.log` - Bash process logs  
- `test-python-process.log` - Python process logs

You can view logs using:
```bash
tail -f test-process.log
./test-process-manager.sh logs all
```

## 🧹 Cleanup

To clean up all temporary files and logs:

```bash
# Using the manager (recommended)
./test-process-manager.sh clean

# Manual cleanup
rm -f test-*.log temp-*.txt temp-*.json temp-python-*
```

## 🎯 Testing Scenarios

### 1. Basic Kill Testing
- Start a process: `./test-process-manager.sh start node`
- Use dashboard to kill it with "Kill" button
- Verify graceful shutdown in logs

### 2. Force Kill Testing
- Start a process: `./test-process-manager.sh start python`
- Use "Force Kill" button in dashboard
- Verify immediate termination

### 3. Multi-process Testing  
- Start all processes: `./test-process-manager.sh start all`
- Kill different processes using different methods
- Watch real-time updates as processes disappear

### 4. Process Details Testing
- Start processes and click "Details" button
- Verify all process information is displayed correctly
- Check VSZ/RSS memory information

### 5. Log Viewing Testing
- Let processes run for a few iterations
- Click "Logs" button to view process logs
- Verify logs from different sources are displayed

## ⚠️ Important Notes

- These processes are designed to be safe and use minimal resources
- They create temporary files that are cleaned up on graceful shutdown
- Memory usage is limited to prevent system issues
- All processes respond to SIGTERM for graceful shutdown
- Use SIGKILL (-9) only if SIGTERM doesn't work

## 🐛 Troubleshooting

### Process Won't Start
- Check if the script files are executable: `ls -la test-*.js test-*.sh test-*.py`
- Verify Node.js and Python3 are installed
- Check for port conflicts or permission issues

### Process Won't Stop
- Try force kill: `./test-process-manager.sh killall`
- Check process status: `./test-process-manager.sh status`
- Use system tools: `pkill -f test-process`

### Dashboard Not Showing Processes
- Verify processes are actually running: `./test-process-manager.sh status`
- Check dashboard is connected: Look for "Client connected" in server logs
- Refresh the browser page

### Logs Not Displaying
- Check log files exist: `ls -la test-*.log`
- Verify process is writing logs: `tail -f test-process.log`
- Check dashboard logs endpoint is working

These test processes provide a safe, controlled environment for testing all aspects of your enhanced system dashboard's process management capabilities!