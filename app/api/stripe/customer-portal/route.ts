import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
})

export async function POST(req: NextRequest) {
  try {
    const { customerId } = await req.json()

    if (!customerId) {
      return NextResponse.json(
        { error: "Missing customer ID" },
        { status: 400 }
      )
    }

    // Create customer portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("Error creating customer portal session:", error)
    return NextResponse.json(
      { error: "Failed to create customer portal session" },
      { status: 500 }
    )
  }
} 