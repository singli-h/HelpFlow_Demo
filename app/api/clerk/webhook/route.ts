import { NextRequest, NextResponse } from "next/server"
import { Webhook } from "svix"
import { createClient } from "@supabase/supabase-js"

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET!

// Initialize Supabase client with service role key for admin operations
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.text()
    const headers = Object.fromEntries(req.headers.entries())
    
    let evt

    try {
      evt = new Webhook(webhookSecret).verify(payload, headers)
    } catch (err) {
      console.error("Webhook signature verification failed:", err)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    const supabase = getSupabaseClient()
    const { type, data } = evt as { type: string; data: any }

    console.log(`Processing Clerk webhook: ${type}`)

    try {
      if (type === "user.created") {
        const { 
          id: clerkId, 
          email_addresses, 
          first_name, 
          last_name, 
          username 
        } = data

        const primaryEmail = email_addresses.find(
          (e: any) => e.id === data.primary_email_address_id
        )?.email_address

        if (!primaryEmail) {
          console.error("No primary email found for user:", clerkId)
          return NextResponse.json({ error: "No primary email found" }, { status: 400 })
        }

        // Insert new user profile
        const { data: insertedProfile, error: profileInsertError } = await supabase
          .from("profiles")
          .insert([
            {
              clerk_user_id: clerkId,
              email: primaryEmail,
              subscription_status: "inactive",
              subscription_plan: "free",
              created_at: new Date().toISOString(),
            }
          ])
          .select()
          .single()

        if (profileInsertError) {
          console.error("Error inserting profile:", profileInsertError)
          return NextResponse.json(
            { error: "Failed to create user profile" },
            { status: 500 }
          )
        }

        console.log(`Successfully created profile for user: ${clerkId}`)
        return NextResponse.json({ 
          success: true, 
          message: "User profile created successfully",
          profileId: insertedProfile.id
        })

      } else if (type === "user.updated") {
        const { 
          id: clerkId, 
          email_addresses, 
          first_name, 
          last_name 
        } = data

        const primaryEmail = email_addresses.find(
          (e: any) => e.id === data.primary_email_address_id
        )?.email_address

        // Update user profile
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            email: primaryEmail,
            updated_at: new Date().toISOString(),
          })
          .eq("clerk_user_id", clerkId)

        if (updateError) {
          console.error("Error updating profile:", updateError)
          return NextResponse.json(
            { error: "Failed to update user profile" },
            { status: 500 }
          )
        }

        console.log(`Successfully updated profile for user: ${clerkId}`)
        return NextResponse.json({ 
          success: true, 
          message: "User profile updated successfully" 
        })

      } else if (type === "user.deleted") {
        const { id: clerkId } = data

        // Delete user profile and associated data
        const { error: deleteError } = await supabase
          .from("profiles")
          .delete()
          .eq("clerk_user_id", clerkId)

        if (deleteError) {
          console.error("Error deleting profile:", deleteError)
          return NextResponse.json(
            { error: "Failed to delete user profile" },
            { status: 500 }
          )
        }

        console.log(`Successfully deleted profile for user: ${clerkId}`)
        return NextResponse.json({ 
          success: true, 
          message: "User profile deleted successfully" 
        })

      } else {
        console.log(`Unhandled webhook type: ${type}`)
        return NextResponse.json({ 
          success: true, 
          message: `Webhook ${type} received but not processed` 
        })
      }

    } catch (dbError) {
      console.error("Database operation failed:", dbError)
      return NextResponse.json(
        { error: "Database operation failed" },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error("Webhook processing failed:", error)
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    )
  }
} 