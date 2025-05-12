import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { storage } from './storage';
import { User } from '@shared/schema';

// AWS S3 Configuration
const AWS_ACCESS_KEY_ID = "AKIAZ3MGM2F433VXTV7T";
const AWS_SECRET_ACCESS_KEY = "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";
const AWS_REGION = "us-east-1";
const AWS_S3_BUCKET_NAME = "ultimate-connector-bucket";
const AWS_S3_BASE_URL = "https://ultimate-connector-bucket.s3.amazonaws.com/";

// Create S3 client
const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

// Configure multer storage for temporary file storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB file size limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, and GIF images are allowed'));
    }
    cb(null, true);
  },
});

/**
 * Routes for user profile management
 */
export const registerProfileRoutes = (router: any) => {
  // Get current user profile
  router.get("/user/profile", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const currentUser = req.user as any;
      console.log('Current user from session:', currentUser);
      
      const user = await storage.getUserById(currentUser.id);
      console.log('User data from storage:', user);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user as any;
      
      // Ensure email is explicitly included in the response
      const responseData = {
        ...userWithoutPassword,
        email: user.email || ''
      };
      
      console.log('Sending user profile data:', responseData);
      res.json(responseData);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ message: "Error fetching user profile" });
    }
  });

  // Update user profile
  router.put("/user/profile", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const currentUser = req.user as any;
      const userId = currentUser.id;
      const userToUpdate = await storage.getUserById(userId);
      
      if (!userToUpdate) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get updated fields from request body
      const { name, email, avatar } = req.body;
      
      // Validate email if provided
      if (email && email !== userToUpdate.email) {
        try {
          // Check if email is a valid format
          if (!/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({ message: "Invalid email format" });
          }
          
          // Get all users to check for email uniqueness manually
          // Note: In a production environment, you would want a more efficient solution
          const allUsers = await storage.getAllUsers();
          const emailExists = allUsers.some((user: User) => 
            user.email === email && user.id !== userId
          );
          
          if (emailExists) {
            return res.status(400).json({ message: "Email already in use" });
          }
        } catch (error) {
          console.error('Error validating email:', error);
          return res.status(500).json({ message: "Error validating email" });
        }
      }
      
      // Update user in database
      const updatedUser = {
        ...userToUpdate,
        name: name || userToUpdate.name,
        email: email || userToUpdate.email,
        avatar: avatar !== undefined ? avatar : userToUpdate.avatar
      };
      
      await storage.updateUser(userId, updatedUser);
      
      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser as any;
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ message: "Error updating user profile" });
    }
  });

  // Upload profile picture to S3
  router.post("/user/profile-picture", upload.single('file'), async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const currentUser = req.user as any;
      const userId = currentUser.id;
      
      // Generate unique file name
      const fileExtension = path.extname(file.originalname);
      const fileName = `profile-pictures/${userId}/${uuidv4()}${fileExtension}`;
      
      // Upload to S3
      const command = new PutObjectCommand({
        Bucket: AWS_S3_BUCKET_NAME,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read'
      });
      
      await s3Client.send(command);
      
      // Generate full URL
      const imageUrl = `${AWS_S3_BASE_URL}${fileName}`;
      
      res.json({ 
        message: "Profile picture uploaded successfully",
        imageUrl 
      });
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      res.status(500).json({ message: "Error uploading profile picture" });
    }
  });
};
