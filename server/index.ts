import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./fixed_routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from "cors";
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Block any notifications requests at the very top level
app.use((req, res, next) => {
  if (req.path.includes('/api/notifications')) {
    console.log(`BLOCKED: ${req.method} ${req.path} from ${req.ip}`);
    console.log(`REFERER: ${req.headers.referer || 'unknown'}`);
    console.log(`USER-AGENT: ${req.headers['user-agent'] || 'unknown'}`);
    console.log(`HEADERS: ${JSON.stringify(req.headers)}`);
    return res.status(200).set('Content-Type', 'application/json').send('[]');
  }
  next();
});

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Debug request middleware to log all incoming requests
app.use((req, res, next) => {
  // Log all API requests
  if (req.path.includes('/api/')) {
    console.log(`API Request: ${req.method} ${req.path} - Headers: ${JSON.stringify(req.headers['accept'] || '')}`);
  }
  
  // Debug problematic endpoints
  if (req.path.includes('/api/users') || req.path.includes('/api/tasks')) {
    console.log(`ENDPOINT ACCESS: ${req.method} ${req.path} from ${req.ip}`);
  }
   
  // Handle direct API access for problematic routes
  if (req.path === '/users' || req.path === '/tasks') {
    const correctedPath = `/api${req.path}`;
    console.log(`Redirecting: ${req.path} -> ${correctedPath}`);
    return res.redirect(307, correctedPath + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''));
  }
  
  if (req.path.slice(-1) === '/' && req.path.length > 1) {
    // Remove trailing slash from all paths except the root path
    const query = req.url.slice(req.path.length);
    const normalizedPath = req.path.slice(0, -1);
    console.log(`Normalizing URL: ${req.path} -> ${normalizedPath}`);
    res.redirect(301, normalizedPath + query);
  } else {
    next();
  }
});

// Add CORS middleware
app.use(cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Dedicated API middleware router to ensure no interference with other middleware
const apiRouter = express.Router();

// Add request logging middleware for API routes
apiRouter.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
    if (capturedJsonResponse) {
      logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
    }
    if (logLine.length > 80) {
      logLine = logLine.slice(0, 79) + "…";
    }
    log(logLine);
  });

  next();
});

// Start the application
(async () => {
  try {
    // First register API routes which will set up auth and sessions
    // This must happen before mounting the API router
    const server = await registerRoutes(app, apiRouter);

    // Mount API router at /api after auth and sessions are set up
    app.use('/api', apiRouter);
    
    // Direct routes for common problematic endpoints
    app.get('/users', (req, res) => {
      console.log('Redirecting direct /users access to /api/users');
      res.redirect(307, '/api/users');
    });

    // Add special debug handler for users endpoint
    app.get('/api/users', (req, res, next) => {
      console.log('DEBUG: Direct access to /api/users from app handler');
      console.log('User authenticated:', req.isAuthenticated ? req.isAuthenticated() : 'unknown');
      console.log('Headers:', JSON.stringify(req.headers));
      
      // Store original json method to intercept response
      const originalJson = res.json;
      res.json = function(body) {
        console.log('USERS API RESPONSE:', JSON.stringify(body).substring(0, 200) + '...');
        console.log('Total users in response:', Array.isArray(body) ? body.length : 'Not an array');
        return originalJson.call(this, body);
      };
      
      next(); // Continue to apiRouter handler
    });

    app.get('/tasks', (req, res) => {
      console.log('Redirecting direct /tasks access to /api/tasks');
      res.redirect(307, '/api/tasks');
    });

    // API error handler
    apiRouter.use((err: any, req: Request, res: Response, next: NextFunction) => {
      console.error('API Error:', err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ 
        error: true,
        message,
        data: null 
      });
    });

    // Handle API 404s
    apiRouter.use('*', (req, res) => {
      res.status(404).json({ 
        error: true,
        message: `API endpoint not found: ${req.baseUrl}${req.path}`,
        data: null
      });
    });

    // Add a middleware to handle 404 errors for all API routes with JSON response
    app.all('/api/*', (req, res) => {
      res.contentType('application/json');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'no-transform, no-store, no-cache');
      
      console.log(`API 404 handler - Route not found: ${req.originalUrl}`);
      
      // Return a JSON response for unhandled API routes
      res.status(404).json({ 
        error: true, 
        message: `API endpoint not found: ${req.originalUrl}`,
        data: null
      });
    });

    // Setup Vite or static serving after API routes setup
    if (app.get("env") === "development") {
      // Application middleware
      const viteHandler = await setupVite(app, server);
      app.use(viteHandler);
    } else {
      // Special handling for module scripts before static file serving
      app.get(/\/assets\/.*\.(js|mjs)$/, (req, res, next) => {
        // Force the correct MIME type for all JavaScript files in the assets directory
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        
        // Check if the file exists
        const staticPath = path.resolve(process.cwd(), 'dist/public');
        const filePath = path.join(staticPath, req.path);
        
        if (fs.existsSync(filePath)) {
          console.log(`Serving JS module with forced MIME type: ${req.path}`);
          return res.sendFile(filePath);
        }
        
        next();
      });
      
      // Specific handler for index-*.js files mentioned in the error
      app.get(/\/index-[A-Za-z0-9]+\.js$/, (req, res, next) => {
        console.log(`Handling specific index-*.js request: ${req.path}`);
        
        // Force the correct MIME type
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        
        // Check if the file exists in assets directory
        const staticPath = path.resolve(process.cwd(), 'dist/public');
        let filePath = path.join(staticPath, req.path);
        
        // If not in root, try assets directory
        if (!fs.existsSync(filePath)) {
          filePath = path.join(staticPath, 'assets', req.path);
        }
        
        if (fs.existsSync(filePath)) {
          console.log(`Found and serving index-*.js file: ${filePath}`);
          return res.sendFile(filePath);
        }
        
        // If no direct match, try finding any matching JS file pattern
        const files = fs.readdirSync(path.join(staticPath, 'assets'));
        const pattern = req.path.replace(/^\//, '');
        const matchingFile = files.find(file => 
          file.startsWith('index-') && file.endsWith('.js')
        );
        
        if (matchingFile) {
          filePath = path.join(staticPath, 'assets', matchingFile);
          console.log(`Found similar index-*.js file: ${filePath}`);
          return res.sendFile(filePath);
        }
        
        next();
      });
      
      serveStatic(app);
    }

    // SPA fallback - will not affect API routes
    app.use((req, res, next) => {
      // Skip if API route
      if (req.path.startsWith('/api')) {
        return next();
      }
      
      // Skip if requesting an existing static asset with proper extension
      const extname = path.extname(req.path);
      if (extname && extname !== '.html') {
        // If it's a specific file extension (e.g., .js, .css, .png), let the static handler try first
        return next();
      }

      // For development, delegate to Vite middleware
      if (app.get("env") === "development") {
        return next();
      }

      // Determine module path - handle both development and production
      // For dev: server/index.ts -> ../dist/public/index.html
      // For prod: dist/index.js -> ./public/index.html
      let indexPath;
      if (__dirname.includes('dist')) {
        // Production build
        indexPath = path.resolve(__dirname, './public/index.html');
      } else {
        // Development
        indexPath = path.resolve(__dirname, '../dist/public/index.html');
      }
      
      console.log('Serving SPA fallback from:', indexPath, 'for path:', req.path);
      
      // Add security headers for HTML content
      res.set({
        'Content-Type': 'text/html; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      res.sendFile(indexPath);
    });

    // Start the server
    const port = process.env.PORT || 5000;
    server.listen({ host: "0.0.0.0", port }, () => {
      log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
