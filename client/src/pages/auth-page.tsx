import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CheckSquareIcon } from "lucide-react";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
  
  // Check if user is logged in
  const { data: user } = useQuery<User | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  
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

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  // Handle form submissions
  const onLoginSubmit = (data: LoginData) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: RegisterData) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-screen-lg w-full grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Auth Form */}
        <div>
          <Card className="w-full">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">
                {isRegistering ? "Create an account" : "Welcome back"}
              </CardTitle>
              <CardDescription>
                {isRegistering
                  ? "Enter your information to create an account"
                  : "Enter your credentials to sign in to your account"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isRegistering ? (
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        placeholder="John Doe"
                        {...registerForm.register("name")}
                      />
                      {registerForm.formState.errors.name && (
                        <p className="text-sm text-red-500">{registerForm.formState.errors.name.message}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="registerEmail">Email</Label>
                      <Input
                        id="registerEmail"
                        type="email"
                        placeholder="john@example.com"
                        {...registerForm.register("username")}
                      />
                      {registerForm.formState.errors.username && (
                        <p className="text-sm text-red-500">{registerForm.formState.errors.username.message}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="registerPassword">Password</Label>
                      <Input
                        id="registerPassword"
                        type="password"
                        placeholder="••••••••"
                        {...registerForm.register("password")}
                      />
                      {registerForm.formState.errors.password && (
                        <p className="text-sm text-red-500">{registerForm.formState.errors.password.message}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        {...registerForm.register("confirmPassword")}
                      />
                      {registerForm.formState.errors.confirmPassword && (
                        <p className="text-sm text-red-500">{registerForm.formState.errors.confirmPassword.message}</p>
                      )}
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? "Creating Account..." : "Create Account"}
                    </Button>
                  </form>
                </Form>
              ) : (
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="loginEmail">Email</Label>
                      <Input
                        id="loginEmail"
                        type="email"
                        placeholder="john@example.com"
                        {...loginForm.register("username")}
                      />
                      {loginForm.formState.errors.username && (
                        <p className="text-sm text-red-500">{loginForm.formState.errors.username.message}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="loginPassword">Password</Label>
                      <Input
                        id="loginPassword"
                        type="password"
                        placeholder="••••••••"
                        {...loginForm.register("password")}
                      />
                      {loginForm.formState.errors.password && (
                        <p className="text-sm text-red-500">{loginForm.formState.errors.password.message}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="remember" />
                        <Label htmlFor="remember">Remember me</Label>
                      </div>
                      <Button variant="link" className="px-0">
                        Forgot password?
                      </Button>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "Signing in..." : "Sign in"}
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
            <CardFooter>
              <Button
                variant="link"
                className="w-full"
                onClick={() => setIsRegistering(!isRegistering)}
              >
                {isRegistering
                  ? "Already have an account? Sign in"
                  : "Don't have an account? Sign up"}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Hero Section */}
        <div className="hidden md:flex flex-col justify-center">
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <CheckSquareIcon className="h-16 w-16 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-center">TaskFlow</h1>
            <p className="text-xl text-center text-gray-600 dark:text-gray-400">
              Simplify your workflow with our intuitive task management system
            </p>
            <ul className="space-y-2">
              <li className="flex items-center">
                <CheckSquareIcon className="h-5 w-5 text-primary mr-2" />
                <span>Create and assign tasks to team members</span>
              </li>
              <li className="flex items-center">
                <CheckSquareIcon className="h-5 w-5 text-primary mr-2" />
                <span>Track task status and set priorities</span>
              </li>
              <li className="flex items-center">
                <CheckSquareIcon className="h-5 w-5 text-primary mr-2" />
                <span>Get notified when tasks are assigned to you</span>
              </li>
              <li className="flex items-center">
                <CheckSquareIcon className="h-5 w-5 text-primary mr-2" />
                <span>Visualize your tasks with customizable views</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
