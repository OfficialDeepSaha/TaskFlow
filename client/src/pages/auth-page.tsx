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
import { CheckSquareIcon, LogInIcon, UserPlusIcon, LockIcon, AtSignIcon, UserIcon, SparklesIcon } from "lucide-react";
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

  // Particle properties for the background
  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    size: Math.random() * 4 + 1,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 20 + 10,
    delay: Math.random() * 5,
  }));

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#080111]">
      {/* Futuristic background with animated particles */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/30 via-purple-900/20 to-black z-0"></div>
      
      {/* Animated glowing particles */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-blue-500/40 z-0"
          style={{
            width: particle.size,
            height: particle.size,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            boxShadow: `0 0 ${particle.size * 2}px ${particle.size / 2}px rgba(79, 70, 229, 0.4)`,
          }}
          animate={{
            x: ["0%", `${Math.random() * 20 - 10}%`, "0%"],
            y: ["0%", `${Math.random() * 20 - 10}%`, "0%"],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut",
          }}
        />
      ))}
      
      {/* Animated glowing orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div 
          className="absolute -top-20 -left-20 w-96 h-96 bg-purple-600/20 rounded-full mix-blend-screen filter blur-[80px] opacity-70"
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute top-1/3 right-1/4 w-[30rem] h-[30rem] bg-indigo-600/20 rounded-full mix-blend-screen filter blur-[80px] opacity-70"
          animate={{
            x: [0, -70, 0],
            y: [0, -40, 0],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute -bottom-40 left-1/3 w-[40rem] h-[40rem] bg-blue-600/20 rounded-full mix-blend-screen filter blur-[80px] opacity-70"
          animate={{
            x: [0, 60, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>
      
      {/* Subtle grid overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIwLjIiPjxwYXRoIGQ9Ik0wIDYwTDYwIDAiLz48cGF0aCBkPSJNMCA0MEw0MCAwIi8+PHBhdGggZD0iTTAgMjBMMjAgMCIvPjxwYXRoIGQ9Ik0yMCA2MEw2MCAyMCIvPjxwYXRoIGQ9Ik00MCA2MEw2MCA0MCIvPjwvZz48L2c+PC9zdmc+')] opacity-10 z-0"></div>
      
      {/* Grid content container */}
      <motion.div 
        className="max-w-screen-lg w-full grid grid-cols-1 md:grid-cols-2 gap-8 z-10 p-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Info Section - Now on the left */}
        <motion.div 
          variants={itemVariants}
          className="hidden md:flex flex-col justify-center"
        >
          <div className="space-y-8 text-white">
            <motion.div 
              className="relative"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              <div className="absolute -top-20 -left-20 w-40 h-40 bg-blue-500/20 rounded-full filter blur-[50px]"></div>
              <h2 className="text-5xl font-bold leading-tight">
                <div className="bg-clip-text text-transparent bg-gradient-to-r from-blue-300 via-purple-300 to-fuchsia-300">
                  TaskFlow
                </div>
                <div className="mt-2">The Future of <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-fuchsia-500">Task Management</span></div>
              </h2>
            </motion.div>
            
            <motion.p 
              className="text-gray-300 text-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              Experience the most advanced and intuitive platform for organizing your workflow.
            </motion.p>
            
            <div className="space-y-6">
              <motion.div 
                className="flex items-start space-x-4 bg-black/40 backdrop-blur-md p-5 rounded-lg border border-white/5 hover:border-white/20 transition-all duration-300 overflow-hidden relative"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9 }}
                whileHover={{ 
                  scale: 1.02,
                  boxShadow: "0 0 20px 5px rgba(79, 70, 229, 0.2)"
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent"></div>
                <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20 backdrop-blur-md relative z-10">
                  <CheckSquareIcon className="h-5 w-5 text-blue-400" />
                </div>
                <div className="relative z-10">
                  <h3 className="font-semibold text-white">Task Assignment</h3>
                  <p className="text-sm text-gray-300 mt-1">
                    Intelligent task assignment based on team member skills and workload
                  </p>
                </div>
              </motion.div>
              
              <motion.div 
                className="flex items-start space-x-4 bg-black/40 backdrop-blur-md p-5 rounded-lg border border-white/5 hover:border-white/20 transition-all duration-300 overflow-hidden relative"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.1 }}
                whileHover={{ 
                  scale: 1.02,
                  boxShadow: "0 0 20px 5px rgba(192, 132, 252, 0.2)"
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-transparent"></div>
                <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20 backdrop-blur-md relative z-10">
                  <CheckSquareIcon className="h-5 w-5 text-purple-400" />
                </div>
                <div className="relative z-10">
                  <h3 className="font-semibold text-white">Real-Time Collaboration</h3>
                  <p className="text-sm text-gray-300 mt-1">
                    Live updates and collaborative editing for seamless teamwork
                  </p>
                </div>
              </motion.div>
              
              <motion.div 
                className="flex items-start space-x-4 bg-black/40 backdrop-blur-md p-5 rounded-lg border border-white/5 hover:border-white/20 transition-all duration-300 overflow-hidden relative"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.3 }}
                whileHover={{ 
                  scale: 1.02,
                  boxShadow: "0 0 20px 5px rgba(217, 70, 239, 0.2)"
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-600/10 to-transparent"></div>
                <div className="p-2 bg-fuchsia-500/10 rounded-lg border border-fuchsia-500/20 backdrop-blur-md relative z-10">
                  <CheckSquareIcon className="h-5 w-5 text-fuchsia-400" />
                </div>
                <div className="relative z-10">
                  <h3 className="font-semibold text-white">Advanced Analytics</h3>
                  <p className="text-sm text-gray-300 mt-1">
                    Comprehensive dashboards to track performance and productivity
                  </p>
                </div>
              </motion.div>
            </div>
            
            {/* Animated badge */}
            <motion.div
              className="relative overflow-hidden w-fit mt-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-fuchsia-600 animate-pulse rounded-md opacity-50 blur-sm"></div>
              <div className="relative flex items-center gap-2 bg-black/50 backdrop-blur-md border border-white/10 py-2 px-4 rounded-md text-sm">
                <SparklesIcon className="h-4 w-4 text-yellow-300" />
                <span className="text-white font-medium">New AI features coming soon</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
        
        {/* Auth Form - Now on the right */}
        <motion.div variants={itemVariants} className="flex justify-center items-center">
          <Card className="w-full backdrop-blur-2xl bg-black/30 border border-white/10 shadow-[0_0_40px_10px_rgba(120,80,220,0.15)] rounded-xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 z-0"></div>
            
            {/* Glowing border effect */}
            <div className="absolute inset-0 p-[1px] rounded-xl bg-gradient-to-r from-indigo-500/50 via-purple-500/50 to-fuchsia-500/50 mask-border"></div>
            
            <CardHeader className="space-y-1 relative z-10">
              <motion.div
                className="absolute -top-10 -left-10 w-40 h-40 bg-blue-500/10 rounded-full filter blur-2xl"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.4, 0.3],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              
              <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
                {isRegistering ? (
                  <>
                    <div className="p-1.5 rounded-md bg-gradient-to-br from-fuchsia-400 to-indigo-600">
                      <UserPlusIcon className="w-5 h-5 text-white" />
                    </div>
                    <span>Create Account</span>
                  </>
                ) : (
                  <>
                    <div className="p-1.5 rounded-md bg-gradient-to-br from-blue-400 to-purple-600">
                      <LogInIcon className="w-5 h-5 text-white" />
                    </div>
                    <span>Welcome Back</span>
                  </>
                )}
                
                <motion.div
                  className="absolute right-0 top-0 text-fuchsia-300/30"
                  animate={{
                    rotate: [0, 360],
                  }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                >
                  <SparklesIcon className="w-5 h-5" />
                </motion.div>
              </CardTitle>
              
              <CardDescription className="text-gray-300">
                {isRegistering
                  ? "Enter your information to create a TaskFlow account"
                  : "Enter your credentials to access your TaskFlow account"}
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              {isRegistering ? (
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <motion.div className="space-y-2" variants={itemVariants}>
                      <Label htmlFor="name" className="text-gray-200 flex items-center gap-1.5 text-sm font-medium">
                        <UserIcon className="w-3.5 h-3.5 text-indigo-400" />
                        Full Name
                      </Label>
                      <div className="relative group">
                        <div className="absolute inset-0 rounded-md bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 opacity-50 blur-sm transition-all group-hover:opacity-75 group-focus-within:opacity-100"></div>
                        <div className="absolute inset-[1px] rounded-[5px] bg-black/80 backdrop-blur-xl"></div>
                        <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-indigo-400 h-4 w-4 z-10" />
                        <Input
                          id="name"
                          placeholder="John Doe"
                          className="pl-10 bg-transparent border-0 text-white relative z-10 focus:ring-0 placeholder:text-gray-500"
                          {...registerForm.register("name")}
                        />
                        
                        {/* Animated keyboard interaction cue */}
                        <motion.div 
                          className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 rounded-full z-10"
                          initial={{ width: "0%" }}
                          whileInView={{ width: "100%" }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                        />
                      </div>
                      {registerForm.formState.errors.name && (
                        <motion.p 
                          className="text-xs text-red-400 flex items-center gap-1.5 mt-1"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <span className="w-1 h-1 rounded-full bg-red-400"></span>
                          {registerForm.formState.errors.name.message}
                        </motion.p>
                      )}
                    </motion.div>
                    
                    <motion.div className="space-y-2" variants={itemVariants}>
                      <Label htmlFor="registerEmail" className="text-gray-200 flex items-center gap-1.5 text-sm font-medium">
                        <AtSignIcon className="w-3.5 h-3.5 text-indigo-400" />
                        Email
                      </Label>
                      <div className="relative group">
                        <div className="absolute inset-0 rounded-md bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 opacity-50 blur-sm transition-all group-hover:opacity-75 group-focus-within:opacity-100"></div>
                        <div className="absolute inset-[1px] rounded-[5px] bg-black/80 backdrop-blur-xl"></div>
                        <AtSignIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-indigo-400 h-4 w-4 z-10" />
                        <Input
                          id="registerEmail"
                          type="email"
                          placeholder="john@example.com"
                          className="pl-10 bg-transparent border-0 text-white relative z-10 focus:ring-0 placeholder:text-gray-500"
                          {...registerForm.register("username")}
                        />
                        
                        {/* Animated keyboard interaction cue */}
                        <motion.div 
                          className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 rounded-full z-10"
                          initial={{ width: "0%" }}
                          whileInView={{ width: "100%" }}
                          transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                        />
                      </div>
                      {registerForm.formState.errors.username && (
                        <motion.p 
                          className="text-xs text-red-400 flex items-center gap-1.5 mt-1"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <span className="w-1 h-1 rounded-full bg-red-400"></span>
                          {registerForm.formState.errors.username.message}
                        </motion.p>
                      )}
                    </motion.div>
                    
                    <motion.div className="space-y-2" variants={itemVariants}>
                      <Label htmlFor="registerPassword" className="text-gray-200 flex items-center gap-1.5 text-sm font-medium">
                        <LockIcon className="w-3.5 h-3.5 text-indigo-400" />
                        Password
                      </Label>
                      <div className="relative group">
                        <div className="absolute inset-0 rounded-md bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 opacity-50 blur-sm transition-all group-hover:opacity-75 group-focus-within:opacity-100"></div>
                        <div className="absolute inset-[1px] rounded-[5px] bg-black/80 backdrop-blur-xl"></div>
                        <LockIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-indigo-400 h-4 w-4 z-10" />
                        <Input
                          id="registerPassword"
                          type="password"
                          placeholder="••••••••"
                          className="pl-10 bg-transparent border-0 text-white relative z-10 focus:ring-0 placeholder:text-gray-500"
                          {...registerForm.register("password")}
                        />
                        
                        {/* Animated keyboard interaction cue */}
                        <motion.div 
                          className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 rounded-full z-10"
                          initial={{ width: "0%" }}
                          whileInView={{ width: "100%" }}
                          transition={{ duration: 1.5, ease: "easeOut", delay: 0.4 }}
                        />
                      </div>
                      {registerForm.formState.errors.password && (
                        <motion.p 
                          className="text-xs text-red-400 flex items-center gap-1.5 mt-1"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <span className="w-1 h-1 rounded-full bg-red-400"></span>
                          {registerForm.formState.errors.password.message}
                        </motion.p>
                      )}
                    </motion.div>
                    
                    <motion.div className="space-y-2" variants={itemVariants}>
                      <Label htmlFor="confirmPassword" className="text-gray-200 flex items-center gap-1.5 text-sm font-medium">
                        <LockIcon className="w-3.5 h-3.5 text-indigo-400" />
                        Confirm Password
                      </Label>
                      <div className="relative group">
                        <div className="absolute inset-0 rounded-md bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 opacity-50 blur-sm transition-all group-hover:opacity-75 group-focus-within:opacity-100"></div>
                        <div className="absolute inset-[1px] rounded-[5px] bg-black/80 backdrop-blur-xl"></div>
                        <LockIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-indigo-400 h-4 w-4 z-10" />
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="••••••••"
                          className="pl-10 bg-transparent border-0 text-white relative z-10 focus:ring-0 placeholder:text-gray-500"
                          {...registerForm.register("confirmPassword")}
                        />
                        
                        {/* Animated keyboard interaction cue */}
                        <motion.div 
                          className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 rounded-full z-10"
                          initial={{ width: "0%" }}
                          whileInView={{ width: "100%" }}
                          transition={{ duration: 1.5, ease: "easeOut", delay: 0.6 }}
                        />
                      </div>
                      {registerForm.formState.errors.confirmPassword && (
                        <motion.p 
                          className="text-xs text-red-400 flex items-center gap-1.5 mt-1"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <span className="w-1 h-1 rounded-full bg-red-400"></span>
                          {registerForm.formState.errors.confirmPassword.message}
                        </motion.p>
                      )}
                    </motion.div>
                    
                    <motion.div variants={itemVariants}>
                      <motion.button
                        type="submit"
                        className="w-full relative py-3 px-4 rounded-md font-medium transition-all overflow-hidden group"
                        disabled={registerMutation.isPending}
                        variants={buttonVariants}
                        initial="idle"
                        whileHover="hover"
                        whileTap="tap"
                      >
                        {/* Animated gradient background */}
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600 z-0"></div>
                        
                        {/* Shimmer effect */}
                        <motion.div 
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent z-10" 
                          style={{ marginLeft: "-100%" }}
                          animate={{ marginLeft: "100%" }}
                          transition={{ 
                            duration: 1.5, 
                            repeat: Infinity, 
                            repeatType: "mirror", 
                            ease: "easeInOut",
                            repeatDelay: 1
                          }}
                        />
                        
                        {/* Button content */}
                        <span className="relative z-20 flex items-center justify-center gap-2">
                          {registerMutation.isPending ? (
                            <>
                              <motion.span 
                                className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              /> 
                              <span className="text-white">Creating Account...</span>
                            </>
                          ) : (
                            <>
                              <UserPlusIcon className="w-4 h-4 text-white" />
                              <span className="text-white">Create Account</span>
                            </>
                          )}
                        </span>
                        
                        {/* Button glow effect */}
                        <div className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600 blur-md"></div>
                        </div>
                      </motion.button>
                    </motion.div>
                  </form>
                </Form>
              ) : (
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <motion.div className="space-y-2" variants={itemVariants}>
                      <Label htmlFor="loginEmail" className="text-gray-200 flex items-center gap-1.5 text-sm font-medium">
                        <AtSignIcon className="w-3.5 h-3.5 text-blue-400" />
                        Email
                      </Label>
                      <div className="relative group">
                        <div className="absolute inset-0 rounded-md bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-50 blur-sm transition-all group-hover:opacity-75 group-focus-within:opacity-100"></div>
                        <div className="absolute inset-[1px] rounded-[5px] bg-black/80 backdrop-blur-xl"></div>
                        <AtSignIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400 h-4 w-4 z-10" />
                        <Input
                          id="loginEmail"
                          type="email"
                          placeholder="john@example.com"
                          className="pl-10 bg-transparent border-0 text-white relative z-10 focus:ring-0 placeholder:text-gray-500"
                          {...loginForm.register("username")}
                        />
                        
                        {/* Animated keyboard interaction cue */}
                        <motion.div 
                          className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full z-10"
                          initial={{ width: "0%" }}
                          whileInView={{ width: "100%" }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                        />
                      </div>
                      {loginForm.formState.errors.username && (
                        <motion.p 
                          className="text-xs text-red-400 flex items-center gap-1.5 mt-1"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <span className="w-1 h-1 rounded-full bg-red-400"></span>
                          {loginForm.formState.errors.username.message}
                        </motion.p>
                      )}
                    </motion.div>
                    
                    <motion.div className="space-y-2" variants={itemVariants}>
                      <Label htmlFor="loginPassword" className="text-gray-200 flex items-center gap-1.5 text-sm font-medium">
                        <LockIcon className="w-3.5 h-3.5 text-blue-400" />
                        Password
                      </Label>
                      <div className="relative group">
                        <div className="absolute inset-0 rounded-md bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-50 blur-sm transition-all group-hover:opacity-75 group-focus-within:opacity-100"></div>
                        <div className="absolute inset-[1px] rounded-[5px] bg-black/80 backdrop-blur-xl"></div>
                        <LockIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400 h-4 w-4 z-10" />
                        <Input
                          id="loginPassword"
                          type="password"
                          placeholder="••••••••"
                          className="pl-10 bg-transparent border-0 text-white relative z-10 focus:ring-0 placeholder:text-gray-500"
                          {...loginForm.register("password")}
                        />
                        
                        {/* Animated keyboard interaction cue */}
                        <motion.div 
                          className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full z-10"
                          initial={{ width: "0%" }}
                          whileInView={{ width: "100%" }}
                          transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                        />
                      </div>
                      {loginForm.formState.errors.password && (
                        <motion.p 
                          className="text-xs text-red-400 flex items-center gap-1.5 mt-1"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <span className="w-1 h-1 rounded-full bg-red-400"></span>
                          {loginForm.formState.errors.password.message}
                        </motion.p>
                      )}
                    </motion.div>
                    
                    <motion.div className="flex items-center justify-between" variants={itemVariants}>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="remember" className="border-white/30 data-[state=checked]:bg-blue-500 rounded-[4px]" />
                        <Label htmlFor="remember" className="text-gray-300 text-sm">Remember me</Label>
                      </div>
                   
                    </motion.div>
                    
                    <motion.div variants={itemVariants}>
                      <motion.button
                        type="submit"
                        className="w-full relative py-3 px-4 rounded-md font-medium transition-all overflow-hidden group"
                        disabled={loginMutation.isPending}
                        variants={buttonVariants}
                        initial="idle"
                        whileHover="hover"
                        whileTap="tap"
                      >
                        {/* Animated gradient background */}
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 z-0"></div>
                        
                        {/* Shimmer effect */}
                        <motion.div 
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent z-10" 
                          style={{ marginLeft: "-100%" }}
                          animate={{ marginLeft: "100%" }}
                          transition={{ 
                            duration: 1.5, 
                            repeat: Infinity, 
                            repeatType: "mirror", 
                            ease: "easeInOut",
                            repeatDelay: 1
                          }}
                        />
                        
                        {/* Button content */}
                        <span className="relative z-20 flex items-center justify-center gap-2">
                          {loginMutation.isPending ? (
                            <>
                              <motion.span 
                                className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              /> 
                              <span className="text-white">Signing In...</span>
                            </>
                          ) : (
                            <>
                              <LogInIcon className="w-4 h-4 text-white" />
                              <span className="text-white">Sign In</span>
                            </>
                          )}
                        </span>
                        
                        {/* Button glow effect */}
                        <div className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 blur-md"></div>
                        </div>
                      </motion.button>
                    </motion.div>
                  </form>
                </Form>
              )}
            </CardContent>
            <CardFooter className="relative z-10">
              <motion.button
                variants={buttonVariants}
                initial="idle"
                whileHover="hover"
                whileTap="tap"
                className="w-full backdrop-blur-sm bg-white/5 border border-white/10 text-white py-3 px-4 rounded-md font-medium transition-all hover:bg-white/10 relative overflow-hidden group"
                onClick={() => setIsRegistering(!isRegistering)}
              >
                {/* Button shimmer effect */}
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent z-10" 
                  style={{ marginLeft: "-100%" }}
                  animate={{ marginLeft: "100%" }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity, 
                    repeatType: "loop", 
                    ease: "easeInOut",
                    repeatDelay: 1
                  }}
                />
                
                <span className="relative z-20 flex items-center justify-center">
                  {isRegistering
                    ? "Already have an account? Sign In"
                    : "Don't have an account? Sign Up"}
                </span>
              </motion.button>
            </CardFooter>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
