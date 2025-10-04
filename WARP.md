# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a Node.js web application that provides a real-time dashboard for monitoring PM2 processes and Docker containers. It's built with Express.js, EJS templating, Socket.io for real-time updates, and uses an external API to fetch process/container data.

## Development Commands

### Setup and Installation
```bash
# Install dependencies
npm install

# Copy environment variables template
cp .env.example .env
```

### Running the Application
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start

# Direct node execution
node server.js
```

### PM2 Deployment
```bash
# Start with PM2 (already included as dependency)
pm2 start server.js --name "threedots-dashboard"

# Monitor PM2 processes
pm2 monit

# View logs
pm2 logs threedots-dashboard
```

## Application Architecture

### Core Structure
The application follows a simple Express.js server pattern with the following key components:

1. **API Client Layer** (`server.js`): Axios client configured with base URL and authentication
2. **Route Handlers** (`server.js`): REST endpoints for PM2 and Docker operations
3. **WebSocket Layer** (`server.js`): Socket.io for real-time data updates
4. **View Layer** (`views/`): EJS templates for dashboard rendering

### Key Components

#### External API Integration
- Communicates with external API using axios client with Bearer token authentication
- Base URL and API key configured via environment variables (`API_BASE`, `API_KEY`)
- Endpoints: `/pm2`, `/docker`, `/pm2/logs/:id`, `/docker/logs/:id`

#### Real-time Updates
- Socket.io server pushes live PM2/Docker data every 5 seconds
- Client-side charts update automatically with CPU and memory metrics
- Limited to 20 data points per chart to prevent memory issues

#### Dashboard Views
- **PM2 Dashboard** (`/`): Grid layout showing process status, memory, CPU with interactive charts
- **Docker Dashboard** (`/docker`): Similar layout for Docker containers
- **Logs View** (`/logs/:id`, `/docker/logs/:id`): Full-screen log viewer

### Environment Configuration
Required environment variables:
- `PORT` (default: 7100)
- `API_BASE` - Base URL for the external monitoring API
- `API_KEY` - Bearer token for API authentication

### Frontend Dependencies
- **TailwindCSS** - Utility-first CSS framework (loaded via CDN)
- **Chart.js** - Real-time line charts for CPU/memory visualization
- **Socket.io Client** - WebSocket communication for live updates

### File Structure
```
├── server.js           # Main Express server with all routes
├── views/
│   ├── dashboard.ejs   # PM2 processes dashboard
│   ├── docker.ejs      # Docker containers dashboard
│   ├── logs.ejs        # Log viewer template
│   ├── header.ejs      # Navigation header partial
│   └── footer.ejs      # Footer partial
├── package.json        # Dependencies and scripts
└── .env.example        # Environment template
```

### API Routes
- `GET /` - PM2 dashboard
- `GET /docker` - Docker dashboard  
- `POST /action/:id/:cmd` - PM2 process actions (restart, stop)
- `POST /docker/action/:id/:cmd` - Docker container actions (start, stop, restart, rm)
- `GET /logs/:id` - PM2 process logs
- `GET /docker/logs/:id` - Docker container logs

### Development Notes
- Uses ES modules (`"type": "module"` in package.json)
- No static files directory exists (references `/public` but not present)
- Real-time updates limited to first Docker container for socket emissions
- Authentication handled entirely by external API
- No database - all data fetched from external API in real-time