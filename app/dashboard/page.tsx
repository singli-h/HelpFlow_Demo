"use client"

import { useEffect, useState } from "react"
import { useUser, useSession } from "@clerk/nextjs"
import { createClient } from "@supabase/supabase-js"
import { motion } from "framer-motion"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { 
  User, 
  CreditCard, 
  Bot, 
  CheckCircle, 
  XCircle,
  Loader2 
} from "lucide-react"

interface UserProfile {
  id: string
  email: string
  subscription_status?: string
  subscription_plan?: string
  created_at: string
}

export default function Dashboard() {
  const { user } = useUser()
  const { session } = useSession()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [aiDemoLoading, setAiDemoLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState<string>("")

  // Create Supabase client with Clerk integration
  function createClerkSupabaseClient() {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${session?.getToken()}`,
          },
        },
      }
    )
  }

  const supabase = createClerkSupabaseClient()

  useEffect(() => {
    if (!user || !session) return

    async function loadProfile() {
      setLoading(true)
      
      // Check if user profile exists in Supabase
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("clerk_user_id", user!.id)
        .single()

      if (error && error.code !== "PGRST116") {
        console.error("Error loading profile:", error)
      } else if (!data) {
        // Create profile if it doesn't exist
        const { data: newProfile, error: createError } = await supabase
          .from("profiles")
          .insert({
            clerk_user_id: user!.id,
            email: user!.emailAddresses[0]?.emailAddress,
            subscription_status: "inactive",
            subscription_plan: "free"
          })
          .select()
          .single()

        if (createError) {
          console.error("Error creating profile:", createError)
        } else {
          setProfile(newProfile)
        }
      } else {
        setProfile(data)
      }
      
      setLoading(false)
    }

    loadProfile()
  }, [user, session])

  const handleSubscribe = async () => {
    // This will be implemented when we integrate Stripe
    console.log("Subscription flow will be implemented with Stripe")
    alert("Subscription feature coming soon!")
  }

  const triggerAiDemo = async () => {
    setAiDemoLoading(true)
    setAiResponse("")
    
    try {
      // This will call the n8n webhook when implemented
      // For now, simulate AI response
      await new Promise(resolve => setTimeout(resolve, 2000))
      setAiResponse("🤖 AI Demo: Task guidance system is working! This would normally connect to n8n → OpenAI for VA task automation.")
    } catch (error) {
      setAiResponse("❌ Error: Could not connect to AI service. Please check your n8n webhook configuration.")
    }
    
    setAiDemoLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold mb-8">HelpFlow Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* User Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile
              </CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><strong>Email:</strong> {user?.emailAddresses[0]?.emailAddress}</p>
                <p><strong>Name:</strong> {user?.fullName || "Not set"}</p>
                <p><strong>Status:</strong> 
                  <span className={`ml-2 px-2 py-1 rounded text-sm ${
                    profile?.subscription_status === "active" 
                      ? "bg-green-100 text-green-800" 
                      : "bg-gray-100 text-gray-800"
                  }`}>
                    {profile?.subscription_status || "inactive"}
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Subscription
              </CardTitle>
              <CardDescription>Manage your billing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p><strong>Plan:</strong> {profile?.subscription_plan || "Free"}</p>
                {profile?.subscription_status === "active" ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>Active subscription</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-gray-600">
                    <XCircle className="h-4 w-4" />
                    <span>No active subscription</span>
                  </div>
                )}
                <Button 
                  onClick={handleSubscribe}
                  className="w-full"
                  variant={profile?.subscription_status === "active" ? "outline" : "default"}
                >
                  {profile?.subscription_status === "active" ? "Manage Subscription" : "Subscribe Now"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* AI Demo Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                AI Task Demo
              </CardTitle>
              <CardDescription>Test the VA guidance system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button 
                  onClick={triggerAiDemo}
                  disabled={aiDemoLoading}
                  className="w-full"
                >
                  {aiDemoLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Trigger AI Demo"
                  )}
                </Button>
                
                {aiResponse && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-muted rounded-lg text-sm"
                  >
                    {aiResponse}
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8"
        >
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and features</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="h-auto py-4 flex flex-col gap-2">
                  <User className="h-6 w-6" />
                  <span>Manage VAs</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex flex-col gap-2">
                  <Bot className="h-6 w-6" />
                  <span>AI Workflows</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex flex-col gap-2">
                  <CreditCard className="h-6 w-6" />
                  <span>Billing</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
} 