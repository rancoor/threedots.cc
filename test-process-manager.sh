#!/bin/bash

# Test Process Manager for System Dashboard Testing
# This script helps you start, stop, and manage dummy test processes

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Process definitions
declare -A PROCESSES=(
    ["node"]="./test-process.js"
    ["bash"]="./test-bash-process.sh"  
    ["python"]="./test-python-process.py"
)

# Function to display usage
show_usage() {
    echo -e "${BLUE}Test Process Manager for System Dashboard Testing${NC}"
    echo ""
    echo "Usage: $0 <command> [process_type]"
    echo ""
    echo "Commands:"
    echo "  start [type]    - Start dummy process(es)"
    echo "  stop [type]     - Stop dummy process(es)" 
    echo "  status          - Show status of all dummy processes"
    echo "  logs [type]     - Show logs for process type"
    echo "  clean           - Clean up all temporary files and logs"
    echo "  list            - List all available process types"
    echo "  killall         - Force kill all dummy processes"
    echo ""
    echo "Process types:"
    echo "  node     - Node.js dummy process"
    echo "  bash     - Bash shell dummy process" 
    echo "  python   - Python dummy process"
    echo "  all      - All process types (for start/stop)"
    echo ""
    echo "Examples:"
    echo "  $0 start node              # Start Node.js process"
    echo "  $0 start all               # Start all processes"
    echo "  $0 stop python             # Stop Python process"
    echo "  $0 status                  # Show all process status"
    echo "  $0 logs bash               # Show bash process logs"
    echo ""
}

# Function to check if a process is running
is_process_running() {
    local process_name="$1"
    local script_file="${PROCESSES[$process_name]}"
    
    if [ -z "$script_file" ]; then
        return 1
    fi
    
    # Look for processes running our test scripts
    if pgrep -f "$script_file" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to get process PID
get_process_pid() {
    local process_name="$1"
    local script_file="${PROCESSES[$process_name]}"
    
    if [ -z "$script_file" ]; then
        echo ""
        return
    fi
    
    pgrep -f "$script_file" 2>/dev/null | head -1
}

# Function to start a process
start_process() {
    local process_name="$1"
    local script_file="${PROCESSES[$process_name]}"
    
    if [ -z "$script_file" ]; then
        echo -e "${RED}Error: Unknown process type '$process_name'${NC}"
        return 1
    fi
    
    if ! [ -f "$script_file" ]; then
        echo -e "${RED}Error: Script file '$script_file' not found${NC}"
        return 1
    fi
    
    if is_process_running "$process_name"; then
        local pid=$(get_process_pid "$process_name")
        echo -e "${YELLOW}Warning: $process_name process is already running (PID: $pid)${NC}"
        return 0
    fi
    
    echo -e "${BLUE}Starting $process_name dummy process...${NC}"
    
    # Start the process in background
    case "$process_name" in
        "node")
            nohup node "$script_file" > /dev/null 2>&1 &
            ;;
        "bash")
            nohup bash "$script_file" > /dev/null 2>&1 &
            ;;
        "python")
            nohup python3 "$script_file" > /dev/null 2>&1 &
            ;;
        *)
            echo -e "${RED}Error: Don't know how to start $process_name${NC}"
            return 1
            ;;
    esac
    
    # Wait a moment and check if it started
    sleep 2
    
    if is_process_running "$process_name"; then
        local pid=$(get_process_pid "$process_name")
        echo -e "${GREEN}✓ $process_name process started successfully (PID: $pid)${NC}"
    else
        echo -e "${RED}✗ Failed to start $process_name process${NC}"
        return 1
    fi
}

# Function to stop a process
stop_process() {
    local process_name="$1"
    
    if ! is_process_running "$process_name"; then
        echo -e "${YELLOW}$process_name process is not running${NC}"
        return 0
    fi
    
    local pid=$(get_process_pid "$process_name")
    echo -e "${BLUE}Stopping $process_name process (PID: $pid)...${NC}"
    
    # Try graceful shutdown first (SIGTERM)
    if kill -TERM "$pid" 2>/dev/null; then
        # Wait up to 10 seconds for graceful shutdown
        local count=0
        while [ $count -lt 10 ] && is_process_running "$process_name"; do
            sleep 1
            count=$((count + 1))
        done
        
        if is_process_running "$process_name"; then
            echo -e "${YELLOW}Process didn't stop gracefully, using SIGKILL...${NC}"
            kill -KILL "$pid" 2>/dev/null
            sleep 1
        fi
        
        if ! is_process_running "$process_name"; then
            echo -e "${GREEN}✓ $process_name process stopped successfully${NC}"
        else
            echo -e "${RED}✗ Failed to stop $process_name process${NC}"
            return 1
        fi
    else
        echo -e "${RED}✗ Failed to send signal to $process_name process${NC}"
        return 1
    fi
}

# Function to show process status
show_status() {
    echo -e "${BLUE}Dummy Test Process Status:${NC}"
    echo ""
    
    local any_running=false
    
    for process_name in "${!PROCESSES[@]}"; do
        local script_file="${PROCESSES[$process_name]}"
        
        if is_process_running "$process_name"; then
            local pid=$(get_process_pid "$process_name")
            local mem_usage=""
            
            # Try to get memory usage
            if command -v ps >/dev/null 2>&1; then
                mem_usage=$(ps -p "$pid" -o rss= 2>/dev/null | xargs)
                if [ ! -z "$mem_usage" ]; then
                    mem_usage=" (Memory: ${mem_usage}KB)"
                fi
            fi
            
            echo -e "  ${GREEN}✓ $process_name${NC} - Running (PID: $pid)$mem_usage"
            any_running=true
        else
            echo -e "  ${RED}✗ $process_name${NC} - Stopped"
        fi
    done
    
    if [ "$any_running" = true ]; then
        echo ""
        echo -e "${BLUE}You can now test the kill functionality in your system dashboard!${NC}"
        echo -e "Navigate to ${YELLOW}http://localhost:9100/system${NC} after logging in."
    fi
}

# Function to show logs
show_logs() {
    local process_name="$1"
    local log_files=()
    
    if [ "$process_name" = "all" ] || [ -z "$process_name" ]; then
        log_files=("test-process.log" "test-bash-process.log" "test-python-process.log")
    else
        case "$process_name" in
            "node") log_files=("test-process.log") ;;
            "bash") log_files=("test-bash-process.log") ;;
            "python") log_files=("test-python-process.log") ;;
            *)
                echo -e "${RED}Error: Unknown process type '$process_name'${NC}"
                return 1
                ;;
        esac
    fi
    
    for log_file in "${log_files[@]}"; do
        if [ -f "$log_file" ]; then
            echo -e "${BLUE}=== $log_file ===${NC}"
            tail -20 "$log_file"
            echo ""
        else
            echo -e "${YELLOW}Log file $log_file not found${NC}"
        fi
    done
}

# Function to clean up files
clean_files() {
    echo -e "${BLUE}Cleaning up temporary files and logs...${NC}"
    
    # Remove log files
    rm -f test-*.log
    
    # Remove temporary files
    rm -f temp-*.txt temp-*.json temp-python-*
    
    # Remove any other temp files our processes might have created
    find . -name "temp-*" -type f -delete 2>/dev/null || true
    
    echo -e "${GREEN}✓ Cleanup completed${NC}"
}

# Function to force kill all processes
killall_processes() {
    echo -e "${YELLOW}Force killing all dummy test processes...${NC}"
    
    local killed_any=false
    
    for process_name in "${!PROCESSES[@]}"; do
        if is_process_running "$process_name"; then
            local pid=$(get_process_pid "$process_name")
            echo -e "${BLUE}Force killing $process_name process (PID: $pid)...${NC}"
            kill -KILL "$pid" 2>/dev/null && killed_any=true
        fi
    done
    
    if [ "$killed_any" = true ]; then
        sleep 1
        echo -e "${GREEN}✓ All processes killed${NC}"
    else
        echo -e "${YELLOW}No dummy processes were running${NC}"
    fi
}

# Main script logic
case "${1:-}" in
    "start")
        process_type="${2:-}"
        
        if [ "$process_type" = "all" ]; then
            echo -e "${BLUE}Starting all dummy processes...${NC}"
            for process_name in "${!PROCESSES[@]}"; do
                start_process "$process_name"
            done
        elif [ -n "$process_type" ]; then
            start_process "$process_type"
        else
            echo -e "${RED}Error: Please specify a process type or 'all'${NC}"
            show_usage
            exit 1
        fi
        ;;
        
    "stop")
        process_type="${2:-}"
        
        if [ "$process_type" = "all" ]; then
            echo -e "${BLUE}Stopping all dummy processes...${NC}"
            for process_name in "${!PROCESSES[@]}"; do
                stop_process "$process_name"
            done
        elif [ -n "$process_type" ]; then
            stop_process "$process_type"
        else
            echo -e "${RED}Error: Please specify a process type or 'all'${NC}"
            show_usage
            exit 1
        fi
        ;;
        
    "status")
        show_status
        ;;
        
    "logs")
        show_logs "${2:-all}"
        ;;
        
    "clean")
        clean_files
        ;;
        
    "list")
        echo -e "${BLUE}Available process types:${NC}"
        for process_name in "${!PROCESSES[@]}"; do
            echo "  - $process_name (${PROCESSES[$process_name]})"
        done
        ;;
        
    "killall")
        killall_processes
        ;;
        
    "help"|"-h"|"--help"|"")
        show_usage
        ;;
        
    *)
        echo -e "${RED}Error: Unknown command '$1'${NC}"
        show_usage
        exit 1
        ;;
esac