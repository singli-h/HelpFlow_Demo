"use client";
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { 
  Zap, 
  Shield, 
  Bot, 
  Users,
  CreditCard,
  ArrowRight 
} from "lucide-react";

export default function Home() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (isLoaded && user) {
      router.push("/dashboard");
    }
  }, [user, isLoaded, router]);

  // Don't render anything while checking auth status
  if (!isLoaded) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // Only show landing page to unauthenticated users
  if (user) {
    return null; // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-4xl mx-auto"
        >
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Welcome to{" "}
            <span className="text-blue-600">HelpFlow</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            The ultimate MVP scaffold integrating Clerk authentication, Supabase database, 
            Stripe payments, and AI-powered workflows for your next big idea.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" className="text-lg px-8 py-3">
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-3">
              View Demo
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Everything You Need to Launch Fast
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Built with industry-leading tools and best practices, 
            ready to deploy in under 4 hours.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Authentication Feature */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>Secure Authentication</CardTitle>
                <CardDescription>
                  Complete user management with Clerk&apos;s prebuilt components
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Social logins (Google, GitHub, etc.)</li>
                  <li>• Multi-factor authentication</li>
                  <li>• Session management</li>
                  <li>• User profiles & organizations</li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          {/* Database Feature */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>Supabase Database</CardTitle>
                <CardDescription>
                  Postgres database with real-time features and RLS
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Real-time subscriptions</li>
                  <li>• Row Level Security (RLS)</li>
                  <li>• Auto-generated APIs</li>
                  <li>• Built-in storage</li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          {/* Payments Feature */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <CreditCard className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle>Stripe Integration</CardTitle>
                <CardDescription>
                  Complete subscription and payment processing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Subscription management</li>
                  <li>• Webhook handling</li>
                  <li>• Customer portal</li>
                  <li>• Multiple payment methods</li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          {/* AI Workflows */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <Bot className="h-6 w-6 text-orange-600" />
                </div>
                <CardTitle>AI Workflows</CardTitle>
                <CardDescription>
                  n8n integration with OpenAI for task automation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Visual workflow builder</li>
                  <li>• OpenAI integration</li>
                  <li>• Webhook triggers</li>
                  <li>• Custom automations</li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          {/* User Management */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-red-600" />
                </div>
                <CardTitle>Multi-User Support</CardTitle>
                <CardDescription>
                  Role-based access for admins, VAs, and viewers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Client admin dashboard</li>
                  <li>• Virtual assistant portal</li>
                  <li>• Demo viewer access</li>
                  <li>• Permission management</li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          {/* Deployment */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-indigo-600" />
                </div>
                <CardTitle>Ready to Deploy</CardTitle>
                <CardDescription>
                  Optimized for Vercel with environment management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Auto-deployments</li>
                  <li>• Environment variables</li>
                  <li>• Edge functions</li>
                  <li>• Global CDN</li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9 }}
          >
            <h2 className="text-3xl font-bold mb-4">
              Ready to Build Your Next MVP?
            </h2>
            <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
              Join thousands of developers who use HelpFlow to ship faster and focus on what matters most.
            </p>
            <Button size="lg" variant="secondary" className="text-lg px-8 py-3">
              Start Building Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
