import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
})

// Initialize Supabase client lazily to avoid build-time errors
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get("stripe-signature")!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error("Webhook signature verification failed:", err)
      return NextResponse.json(
        { error: "Webhook signature verification failed" },
        { status: 400 }
      )
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        
        if (session.mode === "subscription") {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          )
          
          await updateSubscriptionStatus(
            session.metadata?.clerk_user_id!,
            subscription.id,
            "active"
          )
        }
        break
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        
        let status: string
        switch (subscription.status) {
          case "active":
            status = "active"
            break
          case "canceled":
          case "incomplete_expired":
            status = "cancelled"
            break
          case "past_due":
            status = "past_due"
            break
          default:
            status = "inactive"
        }

        // Find user by customer ID
        const customer = await stripe.customers.retrieve(subscription.customer as string)
        if (customer && !customer.deleted && customer.metadata?.clerk_user_id) {
          await updateSubscriptionStatus(
            customer.metadata.clerk_user_id,
            subscription.id,
            status
          )
        }
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        
        if ((invoice as any).subscription) {
          const customer = await stripe.customers.retrieve(invoice.customer as string)
          if (customer && !customer.deleted && customer.metadata?.clerk_user_id) {
            await updateSubscriptionStatus(
              customer.metadata.clerk_user_id,
              (invoice as any).subscription as string,
              "past_due"
            )
          }
        }
        break
      }

      default:
        console.log(`Unhandled event type ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    )
  }
}

async function updateSubscriptionStatus(
  clerkUserId: string,
  subscriptionId: string,
  status: string
) {
  try {
    const plan = status === "active" ? "demo" : "free"
    const supabase = getSupabaseClient()
    
    const { error } = await supabase
      .from("profiles")
      .update({
        subscription_status: status,
        subscription_plan: plan,
        stripe_subscription_id: subscriptionId,
      })
      .eq("clerk_user_id", clerkUserId)

    if (error) {
      console.error("Error updating subscription status:", error)
    } else {
      console.log(`Updated subscription status for user ${clerkUserId}: ${status}`)
    }
  } catch (error) {
    console.error("Error updating subscription status:", error)
  }
} 