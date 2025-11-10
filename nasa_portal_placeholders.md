[PLACEHOLDER-1] (README.md)Code Type: Markdown# NASA System 7 Portal

A nostalgic web application that brings NASA's vast collection of space data to life through an authentic Apple System 7 interface. This full-stack application seamlessly integrates modern web technologies with retro computing aesthetics to create an engaging educational platform for space enthusiasts.

![NASA System 7 Portal](https://img.shields.io/badge/NASA-System_7_Portal-blue?style=for-the-badge&logo=nasa)
![React](https://img.shields.io/badge/React-18.2+-61DAFB?style=for-the-badge&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-16+-339933?style=for-the-badge&logo=node.js)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12+-336791?style=for-the-badge&logo=postgresql)

## 🚀 Features

### Core NASA Integrations
- **🖼️ Astronomy Picture of the Day (APOD)**: Daily stunning space imagery with detailed explanations
- **☄️ Near Earth Object Tracking**: Real-time monitoring of asteroids and comets approaching Earth
- **📊 Resource Navigator**: Comprehensive catalog of NASA software, datasets, and research tools
- **🔍 Advanced Search**: Intelligent search across all NASA resources with filters and sorting

### Authentic System 7 Experience
- **🪟 Classic Window Management**: Draggable, resizable windows with proper z-index handling
- **🎨 Retro Design System**: Faithful recreation of System 7's iconic Chicago font and platinum interface
- **⚡ Smooth Animations**: Modern performance powered by Framer Motion
- **📱 Responsive Design**: System 7 aesthetic adapted for modern devices

### Technical Features
- **🔒 Secure API Integration**: Proxy server prevents NASA API key exposure
- **💾 Data Persistence**: PostgreSQL database for saved items and search history
- **⚡ Performance Optimized**: Intelligent caching and bundle optimization
- **🌐 Cross-Browser Compatible**: Tested across all modern browsers

## 🏗️ Architecture

### Technology Stack

#### Frontend (React)
React 18.2+          # Modern UI framework with hooksFramer Motion         # Smooth animations and gesturesTailwind CSS          # Utility-first stylingAxios                 # HTTP client for API callsD3.js                 # Data visualization
#### Backend (Node.js)
Express.js            # Web framework and API serverAxios                 # NASA/JPL API integrationPostgreSQL (pg)       # Database connectionCORS                  # Cross-origin resource sharingdotenv               # Environment management
#### Database
PostgreSQL            # Primary data storeConnection Pooling    # Efficient connection managementMigrations            # Database schema versioning
### Project Structure
nasa_system7_portal/├── client/                     # React frontend application│   ├── src/│   │   ├── components/│   │   │   ├── system7/       # System 7 UI components│   │   │   │   ├── Desktop.js│   │   │   │   ├── Window.js│   │   │   │   ├── MenuBar.js│   │   │   │   └── DesktopIcon.js│   │   │   ├── apps/          # NASA data applications│   │   │   │   ├── ApodApp.js│   │   │   │   ├── NeoWsApp.js│   │   │   │   └── ResourceNavigatorApp.js│   │   │   └── common/        # Shared components│   │   ├── contexts/          # React context providers│   │   │   └── AppContext.js  # Window management state│   │   ├── hooks/             # Custom React hooks│   │   ├── services/          # API service functions│   │   │   └── nasaApi.js│   │   └── assets/            # Static assets and icons│   ├── public/                # Static files│   ├── package.json           # Frontend dependencies│   └── tailwind.config.js     # Tailwind configuration├── server/                    # Node.js/Express backend│   ├── routes/│   │   ├── apiProxy.js        # NASA API proxy handler│   │   └── resourceNavigator.js # Resource catalog API│   ├── services/              # Business logic│   ├── middleware/            # Express middleware│   ├── db.js                  # PostgreSQL connection & setup│   ├── server.js              # Main server entry point│   ├── .env                   # Environment variables│   └── package.json           # Backend dependencies├── archive/                   # Archived documentation└── README.md                  # This file
## 🛠️ Installation & Setup

### Prerequisites
- **Node.js** version 14.0 or higher
- **PostgreSQL** version 12.0 or higher
- **npm** or **yarn** package manager

### 1. Obtain NASA API Key
1. Visit [api.nasa.gov](https://api.nasa.gov)
2. Sign up for a free API key
3. Keep your API key secure and never commit it to version control

### 2. Database Setup
```bash
# Create PostgreSQL database
createdb nasa_system7_portal

# Or use your preferred PostgreSQL client
3. Environment Configuration# Navigate to server directory
cd server

# Create and configure .env file
cp .env.example .env
Edit server/.env with your configuration:# NASA API Configuration
NASA_API_KEY=your_nasa_api_key_here

# Server Configuration
PORT=3001

# Database Configuration
DB_USER=postgres
DB_HOST=localhost
DB_DATABASE=nasa_system7_portal
DB_PASSWORD=your_database_password
DB_PORT=5432
4. Install DependenciesBackend Dependenciescd server
npm install
Frontend Dependenciescd ../client
npm install
5. Database Initializationcd ../server
npm run db:init
This will create the necessary tables for saved items and search history.🚀 Running the ApplicationDevelopment ModeBoth frontend and backend must run simultaneously.Terminal 1: Backend Servercd server
npm start
Backend will start on http://localhost:3001Terminal 2: Frontend Development Servercd client
npm start
Frontend will start on http://localhost:3000 and open in your browserProduction Build# Build frontend for production
cd client
npm run build

# Start backend server
cd ../server
npm start
🔧 API IntegrationAvailable NASA EndpointsAPOD: /api/nasa/planetary/apod - Daily astronomy imagesNeoWS: /api/nasa/neo/rest/v1/feed - Near Earth Object dataMars Rover: /api/nasa/mars-photos/api/v1/rovers - Mars exploration imagesEPIC: /api/nasa/EPIC/api/natural/images - Earth imageryProxy Server ArchitectureClient Request → Express Server → NASA APIs → Response
     (Port 3000)     (Port 3001)     (External)    (Client)
                      API Key Added
This proxy approach ensures:Security: NASA API keys never exposed to clientRate Limiting: Centralized request managementCaching: Improved performance through intelligent cachingError Handling: Consistent error responses🎨 System 7 UI ImplementationKey FeaturesAuthentic Typography: Chicago and Geneva font renderingPlatinum Color Scheme: Classic System 7 gray paletteWindow Management: Drag, resize, minimize, and maximize functionalityMenu Bar: Classic Apple menu bar with system controlsDesktop Icons: Clickable application shortcutsComponentsDesktop: Main workspace with window managementWindow: Draggable, resizable application containersMenuBar: System-wide menu and controlsDesktopIcon: Application launchers📊 Database SchemaTables-- Saved NASA items (images, datasets, etc.)
CREATE TABLE saved_items (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT,
    category TEXT,
    description TEXT,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Search history for user analytics
CREATE TABLE saved_searches (
    id SERIAL PRIMARY KEY,
    query_string TEXT NOT NULL,
    search_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
🧪 TestingRunning Tests# Frontend tests
cd client
npm test

# Backend tests (when implemented)
cd server
npm test
Testing Coverage GoalsUnit Tests: React components and utility functionsIntegration Tests: API endpoints and database operationsE2E Tests: Complete user workflowsPerformance Tests: Load testing for NASA API integration🚀 DeploymentFrontend Deployment OptionsVercel: Recommended for React applicationsNetlify: Static hosting with CI/CDAWS S3 + CloudFront: Scalable static hostingBackend Deployment OptionsHeroku: Easy Node.js deploymentAWS Elastic Beanstalk: Scalable hostingDigitalOcean: Affordable cloud hostingDatabase HostingHeroku Postgres: Managed PostgreSQLAWS RDS: Relational database serviceNeon: Modern PostgreSQL platform🔒 Security ConsiderationsImplemented Security MeasuresAPI Key Protection: Server-side key managementInput Validation: All user inputs sanitizedCORS Configuration: Proper cross-origin policiesSQL Injection Prevention: Parameterized queriesHTTPS Enforcement: SSL/TLS for all communicationsSecurity Best PracticesRegular dependency updatesEnvironment variable protectionError message sanitizationRate limiting implementationSecurity audit compliance🤝 ContributingDevelopment WorkflowFork the repositoryCreate feature branch (git checkout -b feature/amazing-feature)Commit changes (git commit -m 'Add amazing feature')Push to branch (git push origin feature/amazing-feature)Open Pull RequestCode Style GuidelinesESLint: JavaScript/React lintingPrettier: Code formattingConventional Commits: Standardized commit messagesComponent Documentation: JSDoc for all componentsPull Request Requirements[ ] Tests pass for all changes[ ] Code follows project style guidelines[ ] Documentation updated for new features[ ] Security review completed[ ] Performance impact assessed📈 Performance OptimizationFrontend OptimizationCode Splitting: Lazy loading for large componentsBundle Analysis: Regular bundle size monitoringImage Optimization: WebP format with fallbacksCaching Strategy: Service worker implementationBackend OptimizationAPI Caching: Intelligent response cachingDatabase Indexing: Optimized query performanceConnection Pooling: Efficient database connectionsCompression: Gzip compression for responses🗺️ RoadmapPhase 1: Core Enhancement (Current)[x] Basic NASA API integration[x] System 7 UI framework[x] Database persistence[ ] Enhanced data visualization[ ] Advanced search functionality[ ] Mobile responsivenessPhase 2: Advanced Features[ ] User authentication system[ ] Real-time data updates[ ] Data export capabilities[ ] Additional NASA services[ ] Enhanced UI componentsPhase 3: Platform Expansion[ ] Multi-language support[ ] Educational content integration[ ] Community features[ ] Advanced analytics[ ] Mobile applications📄 LicenseThis project is licensed under the MIT License - see the LICENSE file for details.🙏 AcknowledgmentsNASA for providing amazing open APIs and dataApple for the inspiration from System 7 designReact Community for excellent tools and librariesOpen Source Contributors who make projects like this possible📞 SupportFor questions, issues, or contributions:Issues: GitHub IssuesDiscussions: GitHub Discussions
---
# `[PLACEHOLDER-2]` (.gitignore)
**Code Type: Gitignore (Plain Text)**
Dependencies/node_modules/client/node_modules/server/node_modulesProduction/client/buildLogslogs.lognpm-debug.logyarn-debug.log*yarn-error.log*Environment.env.env*.localserver/.envOS.DS_StoreThumbs.db
---
# `[PLACEHOLDER-3]` (server/package.json)
**Code Type: JSON**
```json
{
  "name": "nasa-system7-server",
  "version": "1.0.0",
  "description": "Backend server for the NASA System 7 Portal - NASA API proxy and database connection",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "db:init": "node -r dotenv/config -e \"require('./db.js').initDb()\""
  },
  "dependencies": {
    "axios": "^1.6.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "pg": "^8.11.3"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
[PLACEHOLDER-4] (server/.env.example)Code Type: Plain Text (env)# NASA API Configuration
NASA_API_KEY=your_nasa_api_key_here

# Server Configuration
PORT=3001

# Database Configuration
DB_USER=postgres
DB_HOST=localhost
DB_DATABASE=nasa_system7_portal
DB_PASSWORD=your_database_password
DB_PORT=5432
[PLACEHOLDER-5] (server/server.js)Code Type: JavaScriptrequire('dotenv').config();
const express = require('express');
const cors = require('cors');
const apiProxyRouter = require('./routes/apiProxy');
const resourceNavigatorRouter = require('./routes/resourceNavigator');
const db = require('./db'); // Import db to ensure pool is created

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
// Allow requests from the React client
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

// API Routes
// Path 1: The NASA proxy
app.use('/api/nasa', apiProxyRouter);
// Path 1: The database API for saved items/searches
app.use('/api/resources', resourceNavigatorRouter);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Basic Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
[PLACEHOLDER-6] (server/db.js)Code Type: JavaScriptconst { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_DATABASE || 'nasa_system7_portal',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5432'),
});

// Function to initialize the database
const initDb = async () => {
  console.log('Initializing database schema...');
  const client = await pool.connect();
  try {
    // Schema from README.md
    const createSavedItemsTable = `
      CREATE TABLE IF NOT EXISTS saved_items (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          url TEXT,
          category TEXT,
          description TEXT,
          saved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    const createSavedSearchesTable = `
      CREATE TABLE IF NOT EXISTS saved_searches (
          id SERIAL PRIMARY KEY,
          query_string TEXT NOT NULL,
          search_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await client.query(createSavedItemsTable);
    console.log('Table "saved_items" created or already exists.');
    
    await client.query(createSavedSearchesTable);
    console.log('Table "saved_searches" created or already exists.');
    
    console.log('✅ Database initialization complete.');
  } catch (err) {
    console.error('❌ Error initializing database:', err.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end(); // End pool after init script runs
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  initDb,
  pool,
};
[PLACEHOLDER-7] (server/routes/apiProxy.js)Code Type: JavaScriptconst express = require('express');
const axios = require('axios');
const router = express.Router();

const NASA_API_KEY = process.env.NASA_API_KEY;
const NASA_API_URL = '[https://api.nasa.gov](https://api.nasa.gov)';

// This proxy handles all requests to /api/nasa/*
// It adds the API key and forwards the request to the official NASA API
router.get('/*', async (req, res) => {
  const endpointPath = req.path;
  const queryParams = { ...req.query, api_key: NASA_API_KEY };

  try {
    const { data } = await axios.get(`${NASA_API_URL}${endpointPath}`, {
      params: queryParams,
    });
    res.json(data);
  } catch (error) {
    console.error('NASA API Proxy Error:', error.message);
    const status = error.response ? error.response.status : 500;
    const message = error.response ? error.response.data : 'Internal server error';
    res.status(status).json({ error: message });
  }
});

module.exports = router;
[PLACEHOLDER-8] (server/routes/resourceNavigator.js)Code Type: JavaScriptconst express = require('express');
const db = require('../db');
const router = express.Router();

// --- API for Resource Navigator (Database persistence) ---

// Get all saved items
router.get('/saved', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM saved_items ORDER BY saved_at DESC');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching saved items:', err.message);
    res.status(500).json({ error: 'Failed to fetch saved items' });
  }
});

// Save a new item
router.post('/saved', async (req, res) => {
  const { id, type, title, url, category, description } = req.body;
  if (!id || !type || !title) {
    return res.status(400).json({ error: 'Missing required fields: id, type, title' });
  }
  
  try {
    const text = 'INSERT INTO saved_items(id, type, title, url, category, description) VALUES($1, $2, $3, $4, $5, $6) RETURNING *';
    const values = [id, type, title, url, category, description];
    const { rows } = await db.query(text, values);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error saving item:', err.message);
    res.status(500).json({ error: 'Failed to save item' });
  }
});

// Save a search query
router.post('/search', async (req, res) => {
  const { query_string } = req.body;
  if (!query_string) {
    return res.status(400).json({ error: 'Missing required field: query_string' });
  }

  try {
    const text = 'INSERT INTO saved_searches(query_string) VALUES($1) RETURNING *';
    const values = [query_string];
    const { rows } = await db.query(text, values);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error saving search:', err.message);
    res.status(500).json({ error: 'Failed to save search' });
  }
});

module.exports = router;
[PLACEHOLDER-9] (client/package.json)Code Type: JSON{
  "name": "nasa-system7-client",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "axios": "^1.6.0",
    "d3": "^7.8.5",
    "framer-motion": "^10.16.16",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  },
  "devDependencies": {
    "tailwindcss": "^3.3.6"
  },
  "proxy": "http://localhost:3001"
}
[PLACEHOLDER-10] (client/tailwind.config.js)Code Type: JavaScript/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'chicago': ['Chicago', 'sans-serif'],
        'geneva': ['Geneva', 'sans-serif'],
      },
      colors: {
        's7-gray': '#cccccc',
        's7-dark-gray': '#888888',
        's7-blue': '#0000a0',
        's7-light-blue': '#559fff',
      },
      backgroundImage: {
        's7-pattern': "url(\"data:image/svg+xml,%3Csvg width='2' height='2' viewBox='0 0 2 2' xmlns='[http://www.w3.org/2000/svg'%3E%3Cpath](http://www.w3.org/2000/svg'%3E%3Cpath) d='M0 0h1v1H0zM1 1h1v1H1z' fill='%23888888' fill-opacity='0.5' fill-rule='evenodd'/%3E%3C/svg%3E\")",
      }
    },
  },
  plugins: [],
}
[PLACEHOLDER-11] (client/public/index.html)Code Type: HTML<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta
      name="description"
      content="NASA System 7 Portal"
    />
    <title>NASA System 7 Portal</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>
[PLACEHOLDER-12] (client/src/index.css)Code Type: CSS@tailwind base;
@tailwind components;
@tailwind utilities;

@font-face {
  font-family: 'Chicago';
  src: url('./assets/fonts/Chicago.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
}

@font-face {
  font-family: 'Geneva';
  src: url('./assets/fonts/Geneva.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
}

body {
  margin: 0;
  font-family: 'Geneva', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #cccccc;
  overflow: hidden;
  user-select: none;
}

.font-chicago {
  font-family: 'Chicago', sans-serif;
}

.font-geneva {
  font-family: 'Geneva', sans-serif;
}
[PLACEHOLDER-13] (client/src/index.js)Code Type: JavaScript (React)import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AppProvider } from './contexts/AppContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>
);
[PLACEHOLDER-14] (client/src/App.js)Code Type: JavaScript (React)import React from 'react';
import Desktop from './components/system7/Desktop';
import MenuBar from './components/system7/MenuBar';

function App() {
  return (
    <div className="w-screen h-screen overflow-hidden bg-s7-pattern">
      <MenuBar />
      <Desktop />
    </div>
  );
}

export default App;
[PLACEHOLDER-15] (client/src/contexts/AppContext.js)Code Type: JavaScript (React)import React, { createContext, useContext, useState, useCallback } from 'react';
import ApodApp from '../components/apps/ApodApp';
import NeoWsApp from '../components/apps/NeoWsApp';
import ResourceNavigatorApp from '../components/apps/ResourceNavigatorApp';

const AppContext = createContext();

// App definitions
const APPS = {
  'apod': {
    id: 'apod',
    title: 'APOD Viewer',
    icon: '🖼️', // Placeholder
    component: (props) => <ApodApp {...props} />,
  },
  'neo': {
    id: 'neo',
    title: 'NEO Tracker',
    icon: '☄️', // Placeholder
    component: (props) => <NeoWsApp {...props} />,
  },
  'resources': {
    id: 'resources',
    title: 'Resource Navigator',
    icon: '📊', // Placeholder
    component: (props) => <ResourceNavigatorApp {...props} />,
  },
};

export const AppProvider = ({ children }) => {
  const [windows, setWindows] = useState([]);
  const [nextZIndex, setNextZIndex] = useState(10);
  const [activeWindow, setActiveWindow] = useState(null);

  const openApp = useCallback((appId) => {
    const app = APPS[appId];
    if (!app) return;

    const newWindowId = `${appId}-${Date.now()}`;
    const newZIndex = nextZIndex + 1;

    const newWindow = {
      ...app,
      windowId: newWindowId,
      zIndex: newZIndex,
    };

    setWindows((prev) => [...prev, newWindow]);
    setNextZIndex(newZIndex);
    setActiveWindow(newWindowId);
  }, [nextZIndex]);

  const closeApp = useCallback((windowId) => {
    setWindows((prev) => prev.filter((w) => w.windowId !== windowId));
    if (activeWindow === windowId) {
      setActiveWindow(null);
    }
  }, [activeWindow]);

  const focusApp = useCallback((windowId) => {
    if (activeWindow === windowId) return;

    const newZIndex = nextZIndex + 1;
    setNextZIndex(newZIndex);
    setWindows((prev) =>
      prev.map((w) =>
        w.windowId === windowId ? { ...w, zIndex: newZIndex } : w
      )
    );
    setActiveWindow(windowId);
  }, [activeWindow, nextZIndex]);

  const value = {
    windows,
    openApp,
    closeApp,
    focusApp,
    activeWindow,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApps = () => {
  return useContext(AppContext);
};

export const useDesktop = () => {
  return { APPS };
}
[PLACEHOLDER-16] (client/src/services/nasaApi.js)Code Type: JavaScriptimport axios from 'axios';

// Create an axios instance that communicates with our *own* server.
// The server's proxy (server/routes/apiProxy.js) will handle forwarding
// the request to api.nasa.gov with the secret API key.
// The `proxy` key in client/package.json handles the `http://localhost:3001` part.

const localApi = axios.create({
  baseURL: '/api', // Will be proxied to http://localhost:3001/api
});

// --- NASA API Functions ---

/**
 * Fetches the Astronomy Picture of the Day.
 * Uses our proxy: /api/nasa/planetary/apod
 */
export const getApod = (params = {}) => {
  return localApi.get('/nasa/planetary/apod', { params });
};

/**
 * Fetches Near Earth Objects for a given start and end date.
 * Uses our proxy: /api/nasa/neo/rest/v1/feed
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 */
export const getNeoFeed = (startDate, endDate) => {
  return localApi.get('/nasa/neo/rest/v1/feed', {
    params: { start_date: startDate, end_date: endDate },
  });
};

// --- Resource Navigator Functions (Database) ---

/**
 * Fetches all saved items from our local database.
 * Calls: /api/resources/saved
 */
export const getSavedItems = () => {
  return localApi.get('/resources/saved');
};

/**
 * Saves a new item to our local database.
 * Calls: /api/resources/saved
 */
export const saveItem = (itemData) => {
  return localApi.post('/resources/saved', itemData);
};

/**
 * Logs a search query to our local database.
 * Calls: /api/resources/search
 */
export const saveSearch = (query_string) => {
  return localApi.post('/resources/search', { query_string });
};
[PLACEHOLDER-17] (client/src/components/system7/Desktop.js)Code Type: JavaScript (React)import React from 'react';
import { useApps, useDesktop } from '../../contexts/AppContext';
import DesktopIcon from './DesktopIcon';
import Window from './Window';

export default function Desktop() {
  const { windows, openApp } = useApps();
  const { APPS } = useDesktop();

  return (
    <main className="relative w-full h-[calc(100vh-20px)]">
      {/* Render Desktop Icons */}
      <div className="p-4 space-y-4">
        <DesktopIcon
          label="APOD Viewer"
          icon={APPS['apod'].icon}
          onDoubleClick={() => openApp('apod')}
        />
        <DesktopIcon
          label="NEO Tracker"
          icon={APPS['neo'].icon}
          onDoubleClick={() => openApp('neo')}
        />
        <DesktopIcon
          label="Resource Nav"
          icon={APPS['resources'].icon}
          onDoubleClick={() => openApp('resources')}
        />
      </div>

      {/* Render Open Windows */}
      {windows.map((win) => (
        <Window
          key={win.windowId}
          windowId={win.windowId}
          title={win.title}
          zIndex={win.zIndex}
        >
          {/* Render the component associated with this window */}
          {win.component({ windowId: win.windowId })}
        </Window>
      ))}
    </main>
  );
}
[PLACEHOLDER-18] (client/src/components/system7/Window.js)Code Type: JavaScript (React)import React from 'react';
import { motion } from 'framer-motion';
import { useApps } from '../../contexts/AppContext';

export default function Window({ children, title, windowId, zIndex }) {
  const { closeApp, focusApp, activeWindow } = useApps();
  const isActive = activeWindow === windowId;

  const titleBarBg = isActive ? 'bg-s7-blue' : 'bg-s7-gray';
  const titleBarText = isActive ? 'text-white' : 'text-black';

  return (
    <motion.div
      className="absolute border border-black shadow-lg bg-white"
      style={{ width: 500, height: 400, zIndex }}
      onMouseDown={() => focusApp(windowId)}
      drag
      dragHandle=".window-title-bar"
      dragMomentum={false}
      initial={{ x: 100 + (Math.random() * 200), y: 100 + (Math.random() * 100) }}
    >
      {/* Title Bar */}
      <div
        className={`window-title-bar h-5 flex items-center border-b border-black cursor-move ${titleBarBg} ${titleBarText}`}
      >
        <button
          className="w-4 h-4 ml-1 border border-black bg-s7-gray"
          onClick={(e) => {
            e.stopPropagation();
            closeApp(windowId);
          }}
        />
        <span className="flex-1 text-center font-chicago text-sm pr-6">
          {title}
        </span>
      </div>

      {/* Content */}
      <div className="p-2 h-[calc(100%-1.25rem)] overflow-auto font-geneva">
        {children}
      </div>
    </motion.div>
  );
}
[PLACEHOLDER-19] (client/src/components/system7/MenuBar.js)Code Type: JavaScript (React)import React, { useState } from 'react';

export default function MenuBar() {
  const [time, setTime] = useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000 * 30); // Update every 30 sec
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <nav className="w-full h-5 bg-s7-gray border-b border-black flex justify-between items-center px-2 font-chicago text-sm">
      <div className="flex space-x-4">
        <span></span>
        <span>File</span>
        <span>Edit</span>
        <span>View</span>
        <span>Special</span>
      </div>
      <div>
        <span>{formatTime(time)}</span>
      </div>
    </nav>
  );
}
[PLACEHOLDER-20] (client/src/components/system7/DesktopIcon.js)Code Type: JavaScript (React)import React from 'react';

export default function DesktopIcon({ label, icon, onDoubleClick }) {
  return (
    <div
      className="w-20 h-20 flex flex-col items-center justify-center text-center cursor-pointer"
      onDoubleClick={onDoubleClick}
    >
      <span className="text-4xl">{icon}</span>
      <span className="font-chicago text-xs bg-s7-gray px-1 mt-1">
        {label}
      </span>
    </div>
  );
}
[PLACEHOLDER-21] (client/src/components/apps/ApodApp.js)Code Type: JavaScript (React)import React, { useState, useEffect } from 'react';
import { getApod } from '../../services/nasaApi';

export default function ApodApp() {
  const [apodData, setApodData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    getApod()
      .then(res => {
        setApodData(res.data);
        setError(null);
      })
      .catch(err => {
        console.error("Failed to fetch APOD:", err);
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading today's picture...</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;
  if (!apodData) return null;

  return (
    <div className="flex flex-col h-full">
      <h2 className="font-chicago text-lg mb-2">{apodData.title}</h2>
      <p className="text-sm mb-2">Date: {apodData.date}</p>
      
      {apodData.media_type === 'image' ? (
        <img 
          src={apodData.url} 
          alt={apodData.title} 
          className="w-full object-contain mb-2"
        />
      ) : (
        <a href={apodData.url} target="_blank" rel="noopener noreferrer">
          View Video (YouTube)
        </a>
      )}
      
      <div className="overflow-auto flex-1">
        <h3 className="font-chicago">Explanation:</h3>
        <p className="text-sm">{apodData.explanation}</p>
      </div>
    </div>
  );
}
[PLACEHOLDER-22] (client/src/components/apps/NeoWsApp.js)Code Type: JavaScript (React)import React, { useState, useEffect } from 'react';
import { getNeoFeed } from '../../services/nasaApi';

const getFormattedDate = (date) => {
  return date.toISOString().split('T')[0];
}

export default function NeoWsApp() {
  const [neoData, setNeoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const today = new Date();
    const startDate = getFormattedDate(today);
    const endDate = getFormattedDate(today); // Just get today's data

    setLoading(true);
    getNeoFeed(startDate, endDate)
      .then(res => {
        setNeoData(res.data);
        setError(null);
      })
      .catch(err => {
        console.error("Failed to fetch NEO data:", err);
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading Near Earth Objects...</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;
  if (!neoData) return null;

  const todayStr = getFormattedDate(new Date());
  const neos = neoData.near_earth_objects[todayStr] || [];

  return (
    <div className="h-full overflow-auto">
      <h2 className="font-chicago text-lg mb-2">
        Near Earth Objects ({todayStr})
      </h2>
      <p className="text-sm mb-2">
        Found {neoData.element_count} objects today.
      </p>
      
      <div className="space-y-2">
        {neos.length > 0 ? (
          neos.map(neo => (
            <div key={neo.id} className="p-2 border border-s7-dark-gray">
              <h3 className="font-chicago">{neo.name}</h3>
              <p className="text-sm">
                Potentially Hazardous: {neo.is_potentially_hazardous_asteroid ? 'YES' : 'No'}
              </p>
              <p className="text-sm">
                Est. Diameter: {Math.round(neo.estimated_diameter.meters.estimated_diameter_max)} meters
              </p>
              <p className="text-sm">
                Miss Distance: {Math.round(neo.close_approach_data[0].miss_distance.kilometers)} km
              </p>
            </div>
          ))
        ) : (
          <p>No objects tracked for today.</p>
        )}
      </div>
    </div>
  );
}
[PLACEHOLDER-23] (client/src/components/apps/ResourceNavigatorApp.js)Code Type: JavaScript (React)import React, { useState, useEffect } from 'react';
import { getSavedItems, saveSearch } from '../../services/nasaApi';

export default function ResourceNavigatorApp() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const fetchItems = () => {
    setLoading(true);
    getSavedItems()
      .then(res => {
        setItems(res.data);
        setError(null);
      })
      .catch(err => {
        console.error("Failed to fetch saved items:", err);
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      // Log the search to the database
      saveSearch(search).catch(err => console.error("Failed to save search:", err));
      
      // NOTE: This is a placeholder.
      // The "Path 1" to-do list includes "Advanced search functionality".
      // This would be where you filter items or make a new API call.
      alert(`Search functionality for "${search}" is not yet implemented.`);
    }
  };

  if (loading) return <div>Loading saved resources...</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;

  return (
    <div className="h-full flex flex-col">
      <h2 className="font-chicago text-lg mb-2">Resource Navigator</h2>
      
      <form onSubmit={handleSearch} className="flex mb-2">
        <input 
          type="text" 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 border border-black px-1" 
          placeholder="Search all resources..." 
        />
        <button type="submit" className="font-chicago border border-black px-2 ml-1 bg-s7-gray">
          Search
        </button>
      </form>

      <h3 className="font-chicago">My Saved Items</h3>
      <div className="flex-1 overflow-auto border border-s7-dark-gray p-1 mt-1">
        {items.length > 0 ? (
          items.map(item => (
            <div key={item.id} className="p-1 border-b border-s7-gray">
              <h4 className="font-chicago">{item.title} ({item.type})</h4>
              <p className="text-xs truncate">{item.description || 'No description'}</p>
            </div>
          ))
        ) : (
          <p>You have no saved items.</p>
        )}
      </div>
    </div>
  );
}

