import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

// Get dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const viteLogger = createLogger();

export function log(message: string) {
  console.log(`[server] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const vite = await createViteServer({
    server: { 
      middlewareMode: true,
      hmr: { server }
    },
    appType: 'spa'
  });

  return vite.middlewares;
}

export function serveStatic(app: Express) {
  // Common MIME types helper
  const mimeTypes: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'font/otf',
    '.webp': 'image/webp'
  };

  // Helper to set the correct content type
  const setContentTypeHeader = (res: express.Response, filePath: string) => {
    const ext = path.extname(filePath).toLowerCase();
    if (mimeTypes[ext]) {
      res.setHeader('Content-Type', mimeTypes[ext]);
      
      // For JavaScript files that are modules, add the module MIME type
      if ((ext === '.js' || ext === '.mjs') && filePath.includes('assets/')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      }
    }
  };

  // Force the correct MIME type for specific asset patterns
  app.use((req, res, next) => {
    // Handle JavaScript modules specifically
    if (req.url.match(/\/assets\/.*\.(js|mjs)$/i)) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
    next();
  });

  app.use((req, res, next) => {
    if (req.url.startsWith('/api/')) {
      return next();
    }
    
    // Handle both development and production paths
    // Always use the same path for static files in production
    const staticPath = path.resolve(process.cwd(), 'dist/public');
    
    // Debug only problematic module requests
    if (req.url.includes('assets/') && (req.url.endsWith('.js') || req.headers.accept?.includes('javascript'))) {
      console.log(`Module request: ${req.url}, Accept: ${req.headers.accept}`);
    }
    
    // Add .js extension for module scripts that might be missing it
    if (req.url.includes('/assets/') && req.url.includes('.') && !path.extname(req.url) && req.headers.accept?.includes('javascript')) {
      const jsPath = `${req.url}.js`;
      if (fs.existsSync(path.join(staticPath, jsPath))) {
        console.log(`Adding .js extension to module request: ${req.url} -> ${jsPath}`);
        req.url = jsPath;
      }
    }
    
    // Handle direct requests to assets folder
    if (req.url.includes('/assets/') && !fs.existsSync(path.join(staticPath, req.url))) {
      // Try to resolve without the /assets prefix
      const assetPath = req.url.replace(/^\/assets\//, '/');
      if (fs.existsSync(path.join(staticPath, 'assets', assetPath))) {
        const fullPath = path.join(staticPath, 'assets', assetPath);
        console.log(`Redirecting asset path: ${req.url} -> ${fullPath}`);
        setContentTypeHeader(res, fullPath);
        return res.sendFile(fullPath);
      }
    }
    
    // Special handler for module scripts to make sure they have the right MIME type
    if (req.url.match(/\/assets\/.*\.js(\?|$)/i)) {
      const filePath = path.join(staticPath, req.url.split('?')[0]);
      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        console.log(`Serving JS module with correct MIME type: ${req.url}`);
        return res.sendFile(filePath);
      }
    }
    
    // Use express.static with custom headers
    express.static(staticPath, {
      setHeaders: (res, filePath) => {
        setContentTypeHeader(res, filePath);
        
        // Add cache control for static assets (except HTML)
        if (!filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
        } else {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      }
    })(req, res, next);
  });
}
