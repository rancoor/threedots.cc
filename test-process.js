#!/usr/bin/env node

/**
 * Dummy Test Process for System Dashboard
 * 
 * This script creates a simple long-running process that:
 * - Uses some CPU and memory
 * - Writes to a log file
 * - Responds to signals gracefully
 * - Can be used to test the kill process functionality
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Process configuration
const PROCESS_NAME = 'TestDummyProcess';
const LOG_FILE = path.join(__dirname, 'test-process.log');
const MEMORY_LEAK_SIZE = 1024 * 1024; // 1MB chunks

// Global state
let memoryArray = [];
let isRunning = true;
let iteration = 0;

// Logging function
function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [PID:${process.pid}] ${message}\n`;
    
    // Write to console
    console.log(logMessage.trim());
    
    // Write to log file
    try {
        fs.appendFileSync(LOG_FILE, logMessage);
    } catch (err) {
        console.error('Failed to write to log file:', err.message);
    }
}

// CPU intensive task
function cpuIntensiveTask() {
    const start = Date.now();
    let result = 0;
    
    // Perform some calculations for about 100ms
    while (Date.now() - start < 100) {
        result += Math.random() * Math.random();
    }
    
    return result;
}

// Memory allocation task
function allocateMemory() {
    // Allocate 1MB of memory every 10 iterations
    if (iteration % 10 === 0) {
        const chunk = new Array(MEMORY_LEAK_SIZE / 8).fill(Math.random());
        memoryArray.push(chunk);
        
        // Keep only last 50MB (50 chunks)
        if (memoryArray.length > 50) {
            memoryArray.shift();
        }
    }
}

// Simulate some file operations
function simulateFileOperations() {
    const tempFile = path.join(__dirname, `temp-${process.pid}-${iteration}.txt`);
    
    try {
        // Write a temporary file
        fs.writeFileSync(tempFile, `Iteration ${iteration} - ${new Date().toISOString()}`);
        
        // Read it back
        const content = fs.readFileSync(tempFile, 'utf8');
        
        // Delete it after a few iterations
        if (iteration % 5 === 0) {
            try {
                fs.unlinkSync(tempFile);
            } catch (err) {
                // File might not exist, ignore
            }
        }
    } catch (err) {
        log(`File operation error: ${err.message}`);
    }
}

// Main process loop
function mainLoop() {
    if (!isRunning) {
        return;
    }
    
    iteration++;
    
    try {
        // Log current status
        const memoryUsage = process.memoryUsage();
        log(`Iteration ${iteration} - Memory: ${Math.round(memoryUsage.rss / 1024 / 1024)}MB RSS, ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB Heap`);
        
        // Perform CPU intensive task
        const cpuResult = cpuIntensiveTask();
        
        // Allocate some memory
        allocateMemory();
        
        // Simulate file operations
        simulateFileOperations();
        
        // Random delay between 1-3 seconds
        const delay = 1000 + Math.random() * 2000;
        setTimeout(mainLoop, delay);
        
    } catch (err) {
        log(`Error in main loop: ${err.message}`);
        setTimeout(mainLoop, 2000);
    }
}

// Signal handlers for graceful shutdown
function gracefulShutdown(signal) {
    log(`Received ${signal} signal. Starting graceful shutdown...`);
    isRunning = false;
    
    // Clean up resources
    log('Cleaning up resources...');
    
    // Clear memory
    memoryArray = [];
    
    // Remove temporary files
    try {
        const files = fs.readdirSync(__dirname);
        files.forEach(file => {
            if (file.startsWith(`temp-${process.pid}-`)) {
                try {
                    fs.unlinkSync(path.join(__dirname, file));
                    log(`Cleaned up temporary file: ${file}`);
                } catch (err) {
                    log(`Failed to clean up ${file}: ${err.message}`);
                }
            }
        });
    } catch (err) {
        log(`Error during cleanup: ${err.message}`);
    }
    
    log('Graceful shutdown completed. Goodbye!');
    process.exit(0);
}

// Register signal handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGUSR1', () => gracefulShutdown('SIGUSR1'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    log(`Uncaught exception: ${err.message}`);
    log(err.stack);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    log(`Unhandled promise rejection: ${reason}`);
    process.exit(1);
});

// Start the process
log(`=== ${PROCESS_NAME} Started ===`);
log(`PID: ${process.pid}`);
log(`Command: ${process.argv.join(' ')}`);
log(`Working directory: ${process.cwd()}`);
log(`Log file: ${LOG_FILE}`);
log(`Node.js version: ${process.version}`);
log(`Platform: ${process.platform} ${process.arch}`);

// Display startup message
console.log(`
🟢 Test Dummy Process Started!
┌─────────────────────────────────────┐
│  PID: ${process.pid.toString().padEnd(28)} │
│  Name: ${PROCESS_NAME.padEnd(26)} │
│  Log File: test-process.log         │
└─────────────────────────────────────┘

This process will:
• Use CPU and memory resources
• Write to log file every iteration
• Create/delete temporary files
• Respond to SIGTERM gracefully
• Require SIGKILL (-9) if unresponsive

Use Ctrl+C to stop gracefully, or test the dashboard kill functionality!
`);

// Start the main loop
mainLoop();