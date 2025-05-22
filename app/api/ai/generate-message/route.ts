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
      // Generate AI message using OpenAI with structured JSON output
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a professional email copywriter that creates beautiful, engaging HTML emails. 

IMPORTANT GUIDELINES:
- Generate COMPLETE, REAL emails - no placeholders like [Your Name], [Company], etc.
- Use realistic sender names and company details
- Create professional but warm and engaging content
- Include proper HTML structure with inline CSS for email compatibility
- Use modern, clean design with good typography
- Make it mobile-responsive
- Include a clear call-to-action when appropriate
- Write as if it's a real business email from a real person`,
          },
          {
            role: "user",
            content: `Generate a complete, professional HTML email about: "${messageTopic}". 

Recipient: ${recipientEmail}

Create a realistic email that:
1. Has a compelling subject line
2. Uses beautiful HTML with inline CSS
3. Includes a realistic sender name and company
4. Contains engaging, helpful content
5. Looks professional and modern
6. Is complete without any placeholders

Make it feel like a real email someone would actually send in a business context.`,
          },
        ],
        max_tokens: 1500,
        temperature: 0.7,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "email_response",
            strict: true,
            schema: {
              type: "object",
              properties: {
                subject: {
                  type: "string",
                  description: "A compelling email subject line"
                },
                sender_name: {
                  type: "string", 
                  description: "Realistic sender name (e.g., 'Sarah Johnson')"
                },
                sender_company: {
                  type: "string",
                  description: "Realistic company name (e.g., 'HelpFlow Solutions')"
                },
                html_content: {
                  type: "string",
                  description: "Complete HTML email content with inline CSS, professional design, and no placeholders"
                },
                plain_text: {
                  type: "string", 
                  description: "Plain text version of the email content"
                }
              },
              required: ["subject", "sender_name", "sender_company", "html_content", "plain_text"],
              additionalProperties: false
            }
          }
        }
      })

      const messageContent = completion.choices[0]?.message?.content
      if (!messageContent) {
        throw new Error("No message generated")
      }

      const emailData = JSON.parse(messageContent)
      
      // Validate the response structure
      if (!emailData.subject || !emailData.html_content || !emailData.sender_name) {
        throw new Error("Invalid email structure generated")
      }

      // Update message record with generated content
      await supabase
        .from("demo_messages")
        .update({
          generated_message: emailData.html_content,
          email_subject: emailData.subject,
          sender_name: emailData.sender_name,
          sender_company: emailData.sender_company,
          plain_text_content: emailData.plain_text,
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
              subject: emailData.subject,
              sender_name: emailData.sender_name,
              sender_company: emailData.sender_company,
              html_content: emailData.html_content,
              plain_text: emailData.plain_text,
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
            emailData,
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
        emailData,
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