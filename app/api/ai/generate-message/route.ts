import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { createClient } from "@supabase/supabase-js"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

// Initialize Supabase client lazily to avoid build-time errors
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  try {
    const { recipientEmail, messageTopic, userId } = await req.json()

    if (!recipientEmail || !messageTopic || !userId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()

    // First, insert the message record with pending status
    const { data: messageRecord, error: insertError } = await supabase
      .from("demo_messages")
      .insert({
        user_id: userId,
        recipient_email: recipientEmail,
        message_topic: messageTopic,
        status: "pending",
      })
      .select()
      .single()

    if (insertError) {
      console.error("Error inserting message record:", insertError)
      return NextResponse.json(
        { error: "Failed to create message record" },
        { status: 500 }
      )
    }

    try {
      // Generate AI message using OpenAI
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful AI assistant that generates professional, friendly email messages based on topics provided by users. Keep messages concise but warm and engaging.",
          },
          {
            role: "user",
            content: `Please generate a professional email message about: ${messageTopic}. The message should be friendly, helpful, and appropriate for business communication.`,
          },
        ],
        max_tokens: 300,
        temperature: 0.7,
      })

      const generatedMessage = completion.choices[0]?.message?.content?.trim()

      if (!generatedMessage) {
        throw new Error("No message generated")
      }

      // Update message record with generated content
      await supabase
        .from("demo_messages")
        .update({
          generated_message: generatedMessage,
          status: "generated",
        })
        .eq("id", messageRecord.id)

      // Send to n8n webhook if configured
      if (process.env.N8N_WEBHOOK_URL) {
        try {
          const webhookResponse = await fetch(process.env.N8N_WEBHOOK_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              recipient_email: recipientEmail,
              message_topic: messageTopic,
              generated_message: generatedMessage,
              message_id: messageRecord.id,
            }),
          })

          if (webhookResponse.ok) {
            // Update status to sent
            await supabase
              .from("demo_messages")
              .update({
                status: "sent",
                sent_at: new Date().toISOString(),
              })
              .eq("id", messageRecord.id)
          } else {
            throw new Error(`Webhook failed: ${webhookResponse.statusText}`)
          }
        } catch (webhookError) {
          console.error("n8n webhook error:", webhookError)
          // Update status to failed
          await supabase
            .from("demo_messages")
            .update({
              status: "failed",
            })
            .eq("id", messageRecord.id)

          return NextResponse.json({
            success: true,
            message: "Message generated but email sending failed",
            generatedMessage,
          })
        }
      } else {
        // No webhook configured, just mark as sent for demo purposes
        await supabase
          .from("demo_messages")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
          })
          .eq("id", messageRecord.id)
      }

      return NextResponse.json({
        success: true,
        message: "Message generated and sent successfully",
        generatedMessage,
      })
    } catch (aiError) {
      console.error("AI generation error:", aiError)
      
      // Update status to failed
      await supabase
        .from("demo_messages")
        .update({
          status: "failed",
        })
        .eq("id", messageRecord.id)

      return NextResponse.json(
        { error: "Failed to generate message" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 