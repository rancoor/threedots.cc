#!/usr/bin/env python3

"""
Dummy Python Process for System Dashboard Testing

This script creates a long-running Python process that:
- Uses CPU and memory resources
- Writes to log files  
- Handles signals gracefully
- Creates temporary files
- Can be used to test the kill process functionality
"""

import os
import sys
import time
import signal
import random
import threading
from datetime import datetime
import tempfile
import json

class DummyTestProcess:
    def __init__(self):
        self.process_name = "TestPythonProcess"
        self.pid = os.getpid()
        self.log_file = "./test-python-process.log"
        self.iteration = 0
        self.is_running = True
        self.memory_data = []
        self.temp_files = []
        
        # Register signal handlers
        signal.signal(signal.SIGTERM, self.signal_handler)
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGUSR1, self.signal_handler)
        signal.signal(signal.SIGUSR2, self.signal_handler)
        
    def log(self, message):
        """Log message to both console and file"""
        timestamp = datetime.now().isoformat()
        log_entry = f"[{timestamp}] [PID:{self.pid}] {message}"
        
        # Print to console
        print(log_entry)
        
        # Write to log file
        try:
            with open(self.log_file, 'a') as f:
                f.write(log_entry + '\\n')
        except Exception as e:
            print(f"Failed to write to log file: {e}")
    
    def signal_handler(self, signum, frame):
        """Handle signals gracefully"""
        signal_name = signal.Signals(signum).name
        self.log(f"Received {signal_name} signal. Starting graceful shutdown...")
        self.is_running = False
        self.cleanup()
        
    def cleanup(self):
        """Clean up resources and temporary files"""
        self.log("Cleaning up resources...")
        
        # Clear memory
        self.memory_data.clear()
        
        # Remove temporary files
        for temp_file in self.temp_files:
            try:
                if os.path.exists(temp_file):
                    os.unlink(temp_file)
                    self.log(f"Cleaned up temporary file: {temp_file}")
            except Exception as e:
                self.log(f"Failed to clean up {temp_file}: {e}")
        
        self.log("Graceful shutdown completed. Goodbye!")
        sys.exit(0)
        
    def cpu_intensive_task(self):
        """Simulate CPU-intensive work"""
        start_time = time.time()
        result = 0
        
        # Run for about 0.1 seconds
        while (time.time() - start_time) < 0.1:
            result += random.random() ** 2
            
        return result
    
    def allocate_memory(self):
        """Simulate memory allocation"""
        # Allocate 1MB every 10 iterations
        if self.iteration % 10 == 0:
            # Create 1MB of random data
            chunk = [random.random() for _ in range(125000)]  # ~1MB
            self.memory_data.append(chunk)
            
            # Keep only last 20MB
            if len(self.memory_data) > 20:
                self.memory_data.pop(0)
    
    def file_operations(self):
        """Simulate file I/O operations"""
        try:
            # Create temporary file
            temp_file = f"temp-python-{self.pid}-{self.iteration}.json"
            self.temp_files.append(temp_file)
            
            # Write some data
            data = {
                'iteration': self.iteration,
                'timestamp': datetime.now().isoformat(),
                'pid': self.pid,
                'random_data': [random.random() for _ in range(100)]
            }
            
            with open(temp_file, 'w') as f:
                json.dump(data, f, indent=2)
            
            # Read it back
            with open(temp_file, 'r') as f:
                read_data = json.load(f)
            
            # Clean up old files every 3 iterations
            if self.iteration % 3 == 0 and len(self.temp_files) > 3:
                old_file = self.temp_files.pop(0)
                try:
                    if os.path.exists(old_file):
                        os.unlink(old_file)
                except Exception as e:
                    self.log(f"Error removing old temp file {old_file}: {e}")
                    
        except Exception as e:
            self.log(f"File operation error: {e}")
    
    def get_memory_usage(self):
        """Get current memory usage"""
        try:
            import psutil
            process = psutil.Process(self.pid)
            memory_info = process.memory_info()
            return {
                'rss': memory_info.rss // 1024 // 1024,  # MB
                'vms': memory_info.vms // 1024 // 1024   # MB
            }
        except ImportError:
            # Fallback to basic memory info
            try:
                with open(f'/proc/{self.pid}/status', 'r') as f:
                    for line in f:
                        if line.startswith('VmRSS:'):
                            rss_kb = int(line.split()[1])
                            return {'rss': rss_kb // 1024, 'vms': 0}
            except:
                return {'rss': 0, 'vms': 0}
        except:
            return {'rss': 0, 'vms': 0}
    
    def main_loop(self):
        """Main process loop"""
        while self.is_running:
            self.iteration += 1
            
            try:
                # Log current status
                memory_usage = self.get_memory_usage()
                self.log(f"Iteration {self.iteration} - Memory: {memory_usage['rss']}MB RSS")
                
                # CPU intensive work
                cpu_result = self.cpu_intensive_task()
                
                # Memory allocation
                self.allocate_memory()
                
                # File operations
                self.file_operations()
                
                # Random delay between 1-3 seconds
                delay = 1 + random.random() * 2
                time.sleep(delay)
                
            except Exception as e:
                self.log(f"Error in main loop: {e}")
                time.sleep(2)
    
    def start(self):
        """Start the dummy process"""
        # Display startup banner
        print(f"""
🟢 Test Python Process Started!
┌─────────────────────────────────────┐
│  PID: {str(self.pid).ljust(28)} │
│  Name: {self.process_name.ljust(26)} │  
│  Log File: test-python-process.log  │
└─────────────────────────────────────┘

This Python process will:
• Use CPU and memory resources
• Create JSON temporary files
• Write detailed logs every iteration
• Handle signals gracefully  
• Show advanced memory tracking

Use Ctrl+C to stop gracefully, or test the dashboard!
""")

        # Log startup information
        self.log(f"=== {self.process_name} Started ===")
        self.log(f"PID: {self.pid}")
        self.log(f"Python version: {sys.version}")
        self.log(f"Working directory: {os.getcwd()}")
        self.log(f"Log file: {self.log_file}")
        self.log(f"Command line: {' '.join(sys.argv)}")
        
        # Start main loop
        try:
            self.main_loop()
        except KeyboardInterrupt:
            self.log("Received KeyboardInterrupt")
            self.cleanup()
        except Exception as e:
            self.log(f"Unexpected error: {e}")
            self.cleanup()

if __name__ == "__main__":
    process = DummyTestProcess()
    process.start()