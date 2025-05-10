import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Router, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, insertUserSchema } from "../shared/schema";
import { ZodError } from "zod";

// Extend the express-session to include our custom properties
declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Custom middleware to check authentication
function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
  try {
    // Check for passport's isAuthenticated
    if (req.isAuthenticated && req.isAuthenticated()) {
      return next();
    }
    
    // If passport's method is missing or returns false, return 401
    return res.status(401).json({ message: "Unauthorized" });
  } catch (error) {
    console.error("Authentication check error:", error);
    return res.status(500).json({ message: "Authentication check failed" });
  }
}

export function setupAuth(app: Express, apiRouter?: Router) {
  console.log("Setting up authentication...");
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "taskflow-secret-key",
    resave: true,
    saveUninitialized: true,
    store: storage.sessionStore,
    name: 'connect.sid', // Explicitly name the cookie
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days for longer persistence
      httpOnly: true,
      secure: false, // Set to false for both dev and prod to ensure cookies work
      sameSite: 'lax',
      path: '/' // Ensure cookie is available on all paths
    }
  };

  console.log("Initializing session middleware...");
  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());
  console.log("Session and passport middleware initialized");

  passport.use(
    new LocalStrategy(
      {
        // Configure LocalStrategy to use username field instead of email
        usernameField: 'username',
        passwordField: 'password'
      },
      async (email, password, done) => {
        try {
          console.log(`Authentication attempt for email: ${email}`);
          // In our storage, username field contains email addresses
          const user = await storage.getUserByUsername(email);
          
          if (!user) {
            console.log(`User not found with email: ${email}`);
            return done(null, false, { message: 'Invalid email or password' });
          }
          
          const isPasswordValid = await comparePasswords(password, user.password);
          if (!isPasswordValid) {
            console.log(`Invalid password for user with email: ${email}`);
            return done(null, false, { message: 'Invalid email or password' });
          }
          
          console.log(`Authentication successful for user with email: ${email}`);
          return done(null, user);
        } catch (err) {
          console.error('Authentication error:', err);
          return done(err);
        }
      }
    ),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Use the apiRouter if provided, otherwise fallback to the main app
  const router = apiRouter || app;

  // If using main app, prefix with /api, otherwise the apiRouter is already mounted at /api
  const prefix = apiRouter ? "" : "/api";

  router.post(`${prefix}/register`, async (req, res, next) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await hashPassword(userData.password);
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      // Remove password from response
      const { password, ...userWithoutPassword } = user;

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: "Invalid registration data", 
          errors: error.errors 
        });
      }
      next(error);
    }
  });

  router.post(`${prefix}/login`, (req, res, next) => {
    console.log("Login attempt for email:", req.body.email);
    
    passport.authenticate("local", (err: Error | null, user: SelectUser | false, info: { message: string }) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }
      if (!user) {
        console.log("Login failed: Invalid credentials");
        console.log("Request body:", JSON.stringify(req.body));
        
        // Debug existing users
        storage.getAllUsers().then(users => {
          console.log(`All users in system: ${users.length}`);
          users.forEach(u => console.log(`- ${u.username} (${u.id})`));
        }).catch(err => console.error("Error fetching users:", err));
        
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      req.login(user, (err) => {
        if (err) {
          console.error("Session login error:", err);
          return next(err);
        }
        
        console.log(`Login successful for user ${user.username} (${user.id})`);
        
        // Get session ID to include in response
        const sessionId = req.sessionID;
        console.log(`Session ID for user ${user.id}: ${sessionId}`);
        
        // Store user ID in session explicitly
        req.session.userId = user.id;
        console.log("Stored user ID in session:", req.session.userId);
        
        // Set a longer expiration for the session cookie
        if (req.session.cookie) {
          req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
          console.log(`Set session cookie max age to ${req.session.cookie.maxAge}ms`);
        }
        
        // Force session save to ensure it's persisted
        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
          } else {
            console.log("Session saved successfully");
          }
          
          // Remove password from response
          const { password, ...userWithoutPassword } = user;
          
          // Include session ID in response for client-side handling
          res.status(200).json({
            ...userWithoutPassword,
            sessionId: sessionId // Include session ID for client-side storage
          });
        });
      });
    })(req, res, next);
  });

  router.post(`${prefix}/logout`, (req, res, next) => {
    if (req.isAuthenticated()) {
      console.log("Logging out user:", (req.user as any)?.id);
    }
    
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Add user endpoint to get current user
  router.get(`${prefix}/user`, ensureAuthenticated, (req, res) => {
    // Ensure content type is set
    res.contentType('application/json');
    
    // Remove password from response
    const user = req.user as any;
    const { password, ...userWithoutPassword } = user;
    
    res.json(userWithoutPassword);
  });
}
