import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, CheckCircle, Zap, Shield, Users } from "lucide-react";
import { ReactNode } from "react";

// The custom Navbar for the landing page
function LandingNavbar() {
  const [, navigate] = useLocation();
  // Safely access auth context - don't throw an error if it fails
  let authUser = null;
  try {
    const { user } = useAuth();
    authUser = user;
  } catch (error) {
    console.error("Auth context error in navbar:", error);
  }

  return (
    <motion.header 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/40"
    >
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <div className="flex items-center space-x-2">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            <Zap className="h-8 w-8 text-primary" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl font-bold"
          >
            TaskFlow
          </motion.h1>
        </div>

        <div className="flex items-center space-x-6">
          <nav className="hidden md:flex space-x-8">
            <motion.a 
              whileHover={{ scale: 1.05 }}
              className="text-foreground/70 hover:text-foreground transition-colors"
              href="#features"
            >
              Features
            </motion.a>
            <motion.a 
              whileHover={{ scale: 1.05 }}
              className="text-foreground/70 hover:text-foreground transition-colors"
              href="#how-it-works"
            >
              How it works
            </motion.a>
            <motion.a 
              whileHover={{ scale: 1.05 }}
              className="text-foreground/70 hover:text-foreground transition-colors"
              href="#testimonials"
            >
              Testimonials
            </motion.a>
          </nav>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex space-x-3"
          >
            {/* Show Dashboard button for logged-in users */}
            {authUser ? (
              <motion.div whileHover={{ scale: 1.03 }}>
                <Button 
                  onClick={() => navigate("/dashboard")} 
                  className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white shadow-lg font-medium rounded-full px-6"
                >
                  Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            ) : (
              <motion.div whileHover={{ scale: 1.03 }}>
                <Button 
                  onClick={() => navigate("/auth")} 
                  className="bg-gradient-to-r from-purple-600 via-violet-500 to-indigo-600 hover:from-purple-700 hover:via-violet-600 hover:to-indigo-700 text-white shadow-lg font-medium rounded-full px-6"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </motion.header>
  );
}

export default function HomePage() {
  const [, navigate] = useLocation();
  
  // Safely access auth context - don't throw an error if it fails
  let authUser = null;
  try {
    const { user } = useAuth();
    authUser = user;
  } catch (error) {
    console.error("Auth context error in HomePage:", error);
  }

  // We don't automatically redirect anymore - always show the landing page
  // Add a Dashboard link for logged-in users instead

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/90 flex flex-col">
      <LandingNavbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 relative">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 blur-[100px]"></div>
        
        <div className="container mx-auto max-w-7xl">
          <motion.div 
            className="text-center max-w-4xl mx-auto"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            <motion.h1 
              variants={itemVariants}
              className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 mb-6"
            >
              Streamline Team Collaboration With TaskFlow
            </motion.h1>
            <motion.p 
              variants={itemVariants}
              className="text-lg sm:text-xl text-foreground/80 mb-10 max-w-2xl mx-auto">
              The modern platform for teams to manage projects, tasks, and deadlines efficiently. Boost productivity and never miss a deadline again.
            </motion.p>
            
            <motion.div 
              variants={itemVariants}
              className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 justify-center">
              {authUser ? (
                <>
                  <Button 
                    onClick={() => navigate("/dashboard")} 
                    size="lg"
                    className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white shadow-lg font-medium rounded-full px-8"
                  >
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button 
                    onClick={() => navigate("/tasks")} 
                    variant="outline" 
                    size="lg"
                    className="rounded-full border-foreground/20 hover:bg-foreground/5"
                  >
                    View My Tasks
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    onClick={() => navigate("/auth")} 
                    size="lg"
                    className="bg-gradient-to-r from-purple-600 via-violet-500 to-indigo-600 hover:from-purple-700 hover:via-violet-600 hover:to-indigo-700 text-white shadow-lg font-medium rounded-full px-8"
                  >
                    Get Started
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg"
                    className="rounded-full border-foreground/20 hover:bg-foreground/5"
                  >
                    View Demo
                  </Button>
                </>
              )}
            </motion.div>
          </motion.div>
          
          {/* Dashboard Preview Image */}
          <motion.div 
            className="mt-16 relative"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent z-10 h-20 bottom-0 left-0 right-0"></div>
            <div className="bg-gradient-to-r from-violet-600/20 to-indigo-600/20 rounded-xl p-1 shadow-2xl">
              <div className="bg-background/80 backdrop-blur rounded-lg p-2 overflow-hidden">
                <div className="w-full aspect-[16/9] bg-gradient-to-br from-gray-900 to-gray-800 rounded-md overflow-hidden relative">
                  <div className="absolute top-0 left-0 right-0 h-8 bg-gray-800 flex items-center px-4">
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                  </div>
                  <div className="pt-10 px-4 grid grid-cols-12 gap-4 h-full">
                    <div className="col-span-3 h-full">
                      <div className="bg-gray-700/50 rounded-md h-full p-3">
                        <div className="bg-indigo-500/20 h-8 w-full rounded-md mb-4"></div>
                        <div className="space-y-3">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="bg-gray-600/30 h-6 w-full rounded-md"></div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="col-span-9 h-full">
                      <div className="bg-gray-700/30 rounded-md h-20 mb-4 p-3">
                        <div className="flex justify-between">
                          <div className="bg-gray-600/30 h-6 w-1/3 rounded-md"></div>
                          <div className="bg-purple-500/30 h-8 w-28 rounded-md"></div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                          <div key={i} className="bg-gray-700/30 h-32 rounded-md p-3">
                            <div className="bg-gray-600/30 h-4 w-2/3 rounded-md mb-2"></div>
                            <div className="bg-gray-600/30 h-4 w-1/2 rounded-md mb-4"></div>
                            <div className="mt-auto pt-10">
                              <div className="bg-indigo-500/20 h-6 w-full rounded-md"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
      
      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6">
        <div className="container mx-auto max-w-7xl">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold mb-4">Powerful Features</h2>
            <p className="text-foreground/70 max-w-2xl mx-auto">TaskFlow provides everything you need to manage your team's tasks efficiently</p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<CheckCircle className="h-10 w-10 text-green-500" />}
              title="Task Management"
              description="Create, assign, and track tasks with ease. Set priorities, deadlines, and categories."
              delay={0.1}
            />
            <FeatureCard 
              icon={<Users className="h-10 w-10 text-blue-500" />}
              title="Team Collaboration"
              description="Share tasks, leave comments, and collaborate in real-time with your team members."
              delay={0.2}
            />
            <FeatureCard 
              icon={<Shield className="h-10 w-10 text-purple-500" />}
              title="Secure & Reliable"
              description="Your data is encrypted and securely stored. We prioritize your privacy and security."
              delay={0.3}
            />
          </div>
        </div>
      </section>
      
      {/* Call to Action */}
      <section className="py-20 px-4 sm:px-6 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            {authUser ? (
              <>
                <h2 className="text-3xl font-bold mb-6">Ready to get back to your tasks?</h2>
                <p className="text-foreground/70 mb-8 max-w-2xl mx-auto">Continue working on your projects and collaborate with your team.</p>
                <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 justify-center">
                  <Button 
                    onClick={() => navigate("/dashboard")} 
                    size="lg"
                    className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white shadow-lg font-medium rounded-full px-8"
                  >
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button 
                    onClick={() => navigate("/tasks")} 
                    variant="outline" 
                    size="lg"
                    className="rounded-full border-foreground/20 hover:bg-foreground/5"
                  >
                    View My Tasks
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-bold mb-6">Ready to boost your team's productivity?</h2>
                <p className="text-foreground/70 mb-8 max-w-2xl mx-auto">Join thousands of teams who use TaskFlow to manage their projects efficiently.</p>
                <Button 
                  onClick={() => navigate("/auth")} 
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 via-violet-500 to-indigo-600 hover:from-purple-700 hover:via-violet-600 hover:to-indigo-700 text-white shadow-lg font-medium rounded-full px-8"
                >
                  Get Started Today
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </>
            )}
          </motion.div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 border-t border-border/40">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Zap className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold">TaskFlow</span>
            </div>
            <div className="text-sm text-foreground/60">
              © {new Date().getFullYear()} TaskFlow. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  delay?: number;
}

function FeatureCard({ icon, title, description, delay = 0 }: FeatureCardProps) {
  return (
    <motion.div 
      className="bg-background/50 backdrop-blur-sm border border-border/40 rounded-xl p-6 hover:shadow-lg transition-shadow"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
    >
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-foreground/70">{description}</p>
    </motion.div>
  );
}
