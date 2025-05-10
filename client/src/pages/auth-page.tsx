import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { CheckSquareIcon, LogInIcon, UserPlusIcon, LockIcon, AtSignIcon, UserIcon } from "lucide-react";
import { apiRequest, queryClient, normalizeApiUrl, clearSessionCookie } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { User } from "@shared/schema";

// Define schemas
const loginSchema = z.object({
  username: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginData = z.infer<typeof loginSchema>;

const registerSchema = z.object({
  name: z.string().min(1, "Full name is required"),
  username: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Clear any existing session cookies when auth page loads
  useEffect(() => {
    clearSessionCookie();
    console.log('Session cookies cleared on auth page load');
  }, []);
  
  // Login form
  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      const res = await apiRequest("POST", "/api/login", data);
      return await res.json();
    },
    onSuccess: (userData: User) => {
      queryClient.setQueryData(["/api/user"], userData);
      toast({
        title: "Login successful",
        description: `Welcome back, ${userData.name}!`,
      });
      navigate("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      const { confirmPassword, ...registrationData } = data;
      const res = await apiRequest("POST", "/api/register", registrationData);
      return await res.json();
    },
    onSuccess: (userData: User) => {
      queryClient.setQueryData(["/api/user"], userData);
      toast({
        title: "Registration successful",
        description: `Welcome to TaskFlow, ${userData.name}!`,
      });
      navigate("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Check for existing login with a simple API call
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(normalizeApiUrl('/api/user'));
        if (response.ok) {
          const userData = await response.json();
          queryClient.setQueryData(["/api/user"], userData);
          navigate("/dashboard");
        }
      } catch (error) {
        // Ignore errors, let the user login
        console.log('Not logged in, showing auth form');
      }
    };
    
    checkAuth();
  }, [navigate]);

  // Handle form submissions
  const onLoginSubmit = (data: LoginData) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: RegisterData) => {
    registerMutation.mutate(data);
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    }
  };

  const buttonVariants = {
    idle: { scale: 1 },
    hover: { scale: 1.05 },
    tap: { scale: 0.95 }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-fuchsia-800">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div 
          className="absolute -top-10 -left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-50"
          animate={{
            x: [0, 30, 0],
            y: [0, 40, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute top-1/2 -right-10 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-40"
          animate={{
            x: [0, -30, 0],
            y: [0, -40, 0],
          }}
          transition={{
            duration: 13,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute -bottom-10 left-1/4 w-60 h-60 bg-fuchsia-500 rounded-full mix-blend-multiply filter blur-xl opacity-40"
          animate={{
            x: [0, 50, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 11,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>
      
      {/* Grid content container */}
      <motion.div 
        className="max-w-screen-lg w-full grid grid-cols-1 md:grid-cols-2 gap-8 z-10 p-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Auth Form */}
        <motion.div variants={itemVariants}>
          <Card className="w-full backdrop-blur-lg bg-white/10 border-white/20 shadow-2xl">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
                {isRegistering ? (
                  <><UserPlusIcon className="w-6 h-6 text-fuchsia-400" /> Create an account</>
                ) : (
                  <><LogInIcon className="w-6 h-6 text-blue-400" /> Welcome back</>
                )}
              </CardTitle>
              <CardDescription className="text-gray-200">
                {isRegistering
                  ? "Enter your information to create an account"
                  : "Enter your credentials to sign in to your account"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isRegistering ? (
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <motion.div className="space-y-2" variants={itemVariants}>
                      <Label htmlFor="name" className="text-gray-200">Full Name</Label>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-300 h-4 w-4" />
                        <Input
                          id="name"
                          placeholder="John Doe"
                          className="pl-10 bg-white/5 border-white/10 text-white focus:ring-2 focus:ring-fuchsia-500 transition-all"
                          {...registerForm.register("name")}
                        />
                      </div>
                      {registerForm.formState.errors.name && (
                        <motion.p 
                          className="text-sm text-red-300"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          {registerForm.formState.errors.name.message}
                        </motion.p>
                      )}
                    </motion.div>
                    
                    <motion.div className="space-y-2" variants={itemVariants}>
                      <Label htmlFor="registerEmail" className="text-gray-200">Email</Label>
                      <div className="relative">
                        <AtSignIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-300 h-4 w-4" />
                        <Input
                          id="registerEmail"
                          type="email"
                          placeholder="john@example.com"
                          className="pl-10 bg-white/5 border-white/10 text-white focus:ring-2 focus:ring-fuchsia-500 transition-all"
                          {...registerForm.register("username")}
                        />
                      </div>
                      {registerForm.formState.errors.username && (
                        <motion.p 
                          className="text-sm text-red-300"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          {registerForm.formState.errors.username.message}
                        </motion.p>
                      )}
                    </motion.div>
                    
                    <motion.div className="space-y-2" variants={itemVariants}>
                      <Label htmlFor="registerPassword" className="text-gray-200">Password</Label>
                      <div className="relative">
                        <LockIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-300 h-4 w-4" />
                        <Input
                          id="registerPassword"
                          type="password"
                          placeholder="••••••••"
                          className="pl-10 bg-white/5 border-white/10 text-white focus:ring-2 focus:ring-fuchsia-500 transition-all"
                          {...registerForm.register("password")}
                        />
                      </div>
                      {registerForm.formState.errors.password && (
                        <motion.p 
                          className="text-sm text-red-300"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          {registerForm.formState.errors.password.message}
                        </motion.p>
                      )}
                    </motion.div>
                    
                    <motion.div className="space-y-2" variants={itemVariants}>
                      <Label htmlFor="confirmPassword" className="text-gray-200">Confirm Password</Label>
                      <div className="relative">
                        <LockIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-300 h-4 w-4" />
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="••••••••"
                          className="pl-10 bg-white/5 border-white/10 text-white focus:ring-2 focus:ring-fuchsia-500 transition-all"
                          {...registerForm.register("confirmPassword")}
                        />
                      </div>
                      {registerForm.formState.errors.confirmPassword && (
                        <motion.p 
                          className="text-sm text-red-300"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          {registerForm.formState.errors.confirmPassword.message}
                        </motion.p>
                      )}
                    </motion.div>
                    
                    <motion.div variants={itemVariants}>
                      <motion.button
                        type="submit"
                        className="w-full bg-gradient-to-r from-fuchsia-600 to-blue-600 text-white py-2 px-4 rounded-md font-medium shadow-lg hover:shadow-fuchsia-500/30 transition-all"
                        disabled={registerMutation.isPending}
                        variants={buttonVariants}
                        initial="idle"
                        whileHover="hover"
                        whileTap="tap"
                      >
                        {registerMutation.isPending ? 
                          <span className="flex items-center justify-center gap-2">
                            <motion.span 
                              className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            /> 
                            Creating Account...
                          </span> : 
                          "Create Account"
                        }
                      </motion.button>
                    </motion.div>
                  </form>
                </Form>
              ) : (
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <motion.div className="space-y-2" variants={itemVariants}>
                      <Label htmlFor="loginEmail" className="text-gray-200">Email</Label>
                      <div className="relative">
                        <AtSignIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-300 h-4 w-4" />
                        <Input
                          id="loginEmail"
                          type="email"
                          placeholder="john@example.com"
                          className="pl-10 bg-white/5 border-white/10 text-white focus:ring-2 focus:ring-blue-500 transition-all"
                          {...loginForm.register("username")}
                        />
                      </div>
                      {loginForm.formState.errors.username && (
                        <motion.p 
                          className="text-sm text-red-300"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          {loginForm.formState.errors.username.message}
                        </motion.p>
                      )}
                    </motion.div>
                    
                    <motion.div className="space-y-2" variants={itemVariants}>
                      <Label htmlFor="loginPassword" className="text-gray-200">Password</Label>
                      <div className="relative">
                        <LockIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-300 h-4 w-4" />
                        <Input
                          id="loginPassword"
                          type="password"
                          placeholder="••••••••"
                          className="pl-10 bg-white/5 border-white/10 text-white focus:ring-2 focus:ring-blue-500 transition-all"
                          {...loginForm.register("password")}
                        />
                      </div>
                      {loginForm.formState.errors.password && (
                        <motion.p 
                          className="text-sm text-red-300"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          {loginForm.formState.errors.password.message}
                        </motion.p>
                      )}
                    </motion.div>
                    
                    <motion.div className="flex items-center justify-between" variants={itemVariants}>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="remember" className="border-white/30 data-[state=checked]:bg-blue-500" />
                        <Label htmlFor="remember" className="text-gray-200">Remember me</Label>
                      </div>
                      <Button variant="link" className="text-blue-300 hover:text-blue-200 px-0">
                        Forgot password?
                      </Button>
                    </motion.div>
                    
                    <motion.div variants={itemVariants}>
                      <motion.button
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-600 to-fuchsia-600 text-white py-2 px-4 rounded-md font-medium shadow-lg hover:shadow-blue-500/30 transition-all"
                        disabled={loginMutation.isPending}
                        variants={buttonVariants}
                        initial="idle"
                        whileHover="hover"
                        whileTap="tap"
                      >
                        {loginMutation.isPending ? 
                          <span className="flex items-center justify-center gap-2">
                            <motion.span 
                              className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            /> 
                            Signing In...
                          </span> : 
                          "Sign In"
                        }
                      </motion.button>
                    </motion.div>
                  </form>
                </Form>
              )}
            </CardContent>
            <CardFooter>
              <motion.button
                variants={buttonVariants}
                initial="idle"
                whileHover="hover"
                whileTap="tap"
                className="w-full backdrop-blur-sm bg-white/5 border border-white/10 text-white py-2 px-4 rounded-md font-medium transition-all hover:bg-white/10"
                onClick={() => setIsRegistering(!isRegistering)}
              >
                {isRegistering
                  ? "Already have an account? Sign In"
                  : "Don't have an account? Sign Up"}
              </motion.button>
            </CardFooter>
          </Card>
        </motion.div>
        
        {/* Info Section */}
        <motion.div 
          variants={itemVariants}
          className="hidden md:flex flex-col justify-center"
        >
          <div className="space-y-6 text-white">
            <motion.h2 
              className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-fuchsia-300"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              Manage Your Tasks Effectively
            </motion.h2>
            <motion.p 
              className="text-gray-300"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              TaskFlow helps you organize, track, and complete your tasks efficiently.
            </motion.p>
            
            <div className="space-y-4">
              <motion.div 
                className="flex items-start space-x-4 bg-white/5 backdrop-blur-sm p-4 rounded-lg border border-white/10 hover:bg-white/10 transition-all"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9 }}
                whileHover={{ scale: 1.02 }}
              >
                <CheckSquareIcon className="h-6 w-6 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-white">Task Assignment</h3>
                  <p className="text-sm text-gray-300">
                    Assign tasks to team members and track progress
                  </p>
                </div>
              </motion.div>
              
              <motion.div 
                className="flex items-start space-x-4 bg-white/5 backdrop-blur-sm p-4 rounded-lg border border-white/10 hover:bg-white/10 transition-all"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.1 }}
                whileHover={{ scale: 1.02 }}
              >
                <CheckSquareIcon className="h-6 w-6 text-fuchsia-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-white">Due Date Tracking</h3>
                  <p className="text-sm text-gray-300">
                    Set due dates and get reminders for important tasks
                  </p>
                </div>
              </motion.div>
              
              <motion.div 
                className="flex items-start space-x-4 bg-white/5 backdrop-blur-sm p-4 rounded-lg border border-white/10 hover:bg-white/10 transition-all"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.3 }}
                whileHover={{ scale: 1.02 }}
              >
                <CheckSquareIcon className="h-6 w-6 text-purple-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-white">Progress Monitoring</h3>
                  <p className="text-sm text-gray-300">
                    Track task completion and team performance
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
