import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const formData = await req.formData();
    const content = formData.get("content") as string;
    const file = formData.get("file") as File | null;

    let fileInfo = null;
    if (file) {
      fileInfo = {
        name: file.name,
        size: file.size,
        type: file.type,
      };
    }

    const dummyResponse = {
      message: `Thanks for sharing! I received your message: "${content}"${
        fileInfo ? ` and your file "${fileInfo.name}" (${fileInfo.type}, ${(fileInfo.size / 1024).toFixed(2)} KB)` : ""
      }. 

This is a dummy response from the backend. In a real implementation, I would analyze your content and provide detailed feedback to help you improve it.

Key areas I would analyze:
• Clarity and conciseness
• Professional tone
• Structure and flow
• Impact and memorability
• Specific improvements with examples

Your content is on its way to standing out above average!`,
      timestamp: new Date().toISOString(),
      receivedContent: content,
      receivedFile: fileInfo,
    };

    return new Response(JSON.stringify(dummyResponse), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to process request", details: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
