#!/bin/bash

# Dummy Bash Process for Testing Kill Functionality
# This script creates a long-running bash process that can be used to test
# the system dashboard's process management features

PROCESS_NAME="TestBashProcess"
LOG_FILE="./test-bash-process.log"
PID=$$
ITERATION=0

# Function to log messages
log_message() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [PID:$PID] $message" | tee -a "$LOG_FILE"
}

# Function to handle signals gracefully
cleanup() {
    local signal="$1"
    log_message "Received $signal signal. Starting graceful shutdown..."
    log_message "Cleaning up temporary files..."
    
    # Remove temporary files created by this process
    rm -f temp-$PID-*.txt 2>/dev/null
    
    log_message "Graceful shutdown completed. Goodbye!"
    exit 0
}

# Register signal handlers
trap 'cleanup SIGTERM' TERM
trap 'cleanup SIGINT' INT
trap 'cleanup SIGUSR1' USR1
trap 'cleanup SIGUSR2' USR2

# Function to simulate CPU usage
cpu_intensive_task() {
    local count=0
    local start_time=$(date +%s%N)
    
    # Run for about 0.1 seconds
    while [ $(($(date +%s%N) - start_time)) -lt 100000000 ]; do
        count=$((count + 1))
        result=$((result + count * count))
    done
    
    echo $result
}

# Function to create temporary files
create_temp_files() {
    local temp_file="temp-$PID-$ITERATION.txt"
    echo "Iteration $ITERATION - $(date)" > "$temp_file"
    
    # Clean up old temp files every 5 iterations
    if [ $((ITERATION % 5)) -eq 0 ]; then
        rm -f temp-$PID-$((ITERATION - 10))-*.txt 2>/dev/null
    fi
}

# Function to simulate memory usage (limited in bash)
allocate_memory() {
    # Create large string variables to use some memory
    if [ $((ITERATION % 10)) -eq 0 ]; then
        MEMORY_DATA=$(head -c 10240 /dev/zero | tr '\0' 'A')
    fi
}

# Display startup information
clear
echo "
🟢 Test Bash Process Started!
┌─────────────────────────────────────┐
│  PID: $(printf "%-28s" "$PID") │
│  Name: $(printf "%-26s" "$PROCESS_NAME") │
│  Log File: test-bash-process.log    │
└─────────────────────────────────────┘

This bash process will:
• Use CPU resources with calculations
• Create and manage temporary files
• Write to log file every iteration  
• Respond to SIGTERM gracefully
• Show up in your system dashboard

Press Ctrl+C to stop gracefully, or use the dashboard!
"

# Log startup information
log_message "=== $PROCESS_NAME Started ==="
log_message "PID: $PID"
log_message "Script: $0"
log_message "Working directory: $(pwd)"
log_message "Log file: $LOG_FILE"
log_message "Shell: $BASH_VERSION"
log_message "User: $(whoami)"
log_message "Date: $(date)"

# Main process loop
while true; do
    ITERATION=$((ITERATION + 1))
    
    # Log current iteration
    log_message "Iteration $ITERATION - Processing..."
    
    # Simulate CPU-intensive work
    result=$(cpu_intensive_task)
    
    # Create temporary files
    create_temp_files
    
    # Simulate memory allocation
    allocate_memory
    
    # Log memory usage (approximate)
    if command -v ps >/dev/null 2>&1; then
        mem_info=$(ps -p $PID -o pid,rss,vsz --no-headers 2>/dev/null)
        if [ ! -z "$mem_info" ]; then
            log_message "Memory info: $mem_info (RSS/VSZ in KB)"
        fi
    fi
    
    # Random delay between 2-4 seconds
    sleep_time=$((2 + RANDOM % 3))
    sleep $sleep_time
done