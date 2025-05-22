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
  Loader2,
  Send,
  Mail,
  MessageSquare,
  History
} from "lucide-react"

interface UserProfile {
  id: string
  clerk_user_id: string
  email: string
  subscription_status?: string
  subscription_plan?: string
  stripe_customer_id?: string
  stripe_subscription_id?: string
  created_at: string
}

interface DemoMessage {
  id: string
  recipient_email: string
  message_topic: string
  generated_message: string
  status: string
  sent_at: string | null
  created_at: string
}

export default function Dashboard() {
  const { user } = useUser()
  const { session } = useSession()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [aiDemoLoading, setAiDemoLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState<string>("")
  const [messages, setMessages] = useState<DemoMessage[]>([])
  const [recipientEmail, setRecipientEmail] = useState("")
  const [messageTopic, setMessageTopic] = useState("")

  // Create standard Supabase client - user sync handled by webhook
  function createSupabaseClient() {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  useEffect(() => {
    if (!user || !session) return

    const supabase = createSupabaseClient()

    async function loadProfileAndMessages() {
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
        console.log("User profile not found. It should be created by webhook.")
        // Profile should be created by Clerk webhook
        setProfile(null)
      } else {
        setProfile(data)
        
        // Load user's messages
        const { data: messagesData, error: messagesError } = await supabase
          .from("demo_messages")
          .select("*")
          .eq("user_id", data.id)
          .order("created_at", { ascending: false })

        if (messagesError) {
          console.error("Error loading messages:", messagesError)
        } else {
          setMessages(messagesData || [])
        }
      }
      
      setLoading(false)
    }

    loadProfileAndMessages()
  }, [user, session])

  const handleSubscribe = async () => {
    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user?.id,
          email: user?.emailAddresses[0]?.emailAddress,
        }),
      })

      const { url } = await response.json()
      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error("Error creating checkout session:", error)
      alert("Error creating subscription. Please try again.")
    }
  }

  const generateAndSendMessage = async () => {
    if (!recipientEmail || !messageTopic) {
      alert("Please fill in both recipient email and message topic")
      return
    }

    if (profile?.subscription_status !== "active") {
      alert("Please subscribe to use the AI message generation feature")
      return
    }

    setAiDemoLoading(true)
    setAiResponse("")
    
    try {
      const response = await fetch("/api/ai/generate-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipientEmail,
          messageTopic,
          userId: profile?.id,
        }),
      })

      const result = await response.json()
      
      if (result.success) {
        setAiResponse(`✅ Message generated and sent to ${recipientEmail}!`)
        setRecipientEmail("")
        setMessageTopic("")
        
        // Reload messages
        const supabaseClient = createSupabaseClient()
        const { data: messagesData } = await supabaseClient
          .from("demo_messages")
          .select("*")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false })
        
        setMessages(messagesData || [])
      } else {
        setAiResponse(`❌ Error: ${result.error}`)
      }
    } catch (error) {
      console.error("Error generating message:", error)
      setAiResponse("❌ Error: Could not generate message. Please try again.")
    }
    
    setAiDemoLoading(false)
  }

  const manageSubscription = async () => {
    try {
      const response = await fetch("/api/stripe/customer-portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: profile?.stripe_customer_id,
        }),
      })

      const { url } = await response.json()
      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error("Error accessing customer portal:", error)
      alert("Error accessing subscription management. Please try again.")
    }
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
                  onClick={profile?.subscription_status === "active" ? manageSubscription : handleSubscribe}
                  className="w-full"
                  variant={profile?.subscription_status === "active" ? "outline" : "default"}
                >
                  {profile?.subscription_status === "active" ? "Manage Subscription" : "Subscribe for $9.99/month"}
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
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Recipient Email</label>
                    <input
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="Enter recipient email"
                      className="w-full px-3 py-2 border border-input rounded-md text-sm"
                      disabled={profile?.subscription_status !== "active"}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Message Topic</label>
                    <input
                      type="text"
                      value={messageTopic}
                      onChange={(e) => setMessageTopic(e.target.value)}
                      placeholder="What should the message be about?"
                      className="w-full px-3 py-2 border border-input rounded-md text-sm"
                      disabled={profile?.subscription_status !== "active"}
                    />
                  </div>
                  
                  <Button 
                    onClick={generateAndSendMessage}
                    disabled={aiDemoLoading || profile?.subscription_status !== "active"}
                    className="w-full"
                  >
                    {aiDemoLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Generate & Send Message
                      </>
                    )}
                  </Button>
                  
                  {profile?.subscription_status !== "active" && (
                    <p className="text-sm text-muted-foreground text-center">
                      Subscribe to use AI message generation
                    </p>
                  )}
                </div>
                
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

        {/* Message History */}
        {messages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-8"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Message History
                </CardTitle>
                <CardDescription>Your recent AI-generated messages</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className="border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{message.recipient_email}</span>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          message.status === 'sent' ? 'bg-green-100 text-green-800' :
                          message.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {message.status}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm"><strong>Topic:</strong> {message.message_topic}</p>
                        {message.generated_message && (
                          <div className="bg-muted p-3 rounded text-sm">
                            {message.generated_message}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(message.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
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