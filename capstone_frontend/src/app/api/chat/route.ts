/**
 * Minimal GitHub Models chat proxy — matches team lead template (Wasim).
 * POST /api/chat  body: { message: string }
 * Server env: GITHUB_TOKEN (GitHub PAT with models access)
 */
import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import { NextResponse } from "next/server";

const endpoint = "https://models.github.ai/inference";
const model = "openai/gpt-4.1";

export async function POST(request: Request) {
  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "Missing GITHUB_TOKEN environment variable." },
        { status: 500 },
      );
    }

    const body = (await request.json()) as { message?: string };
    const message =
      typeof body?.message === "string" ? body.message.trim() : "";

    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const client = ModelClient(endpoint, new AzureKeyCredential(token));
    const response = await client.path("/chat/completions").post({
      body: {
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: message },
        ],
        temperature: 1.0,
        top_p: 1.0,
        model,
      },
    });

    if (isUnexpected(response)) {
      const errBody = response.body as { error?: { message?: string } };
      return NextResponse.json(
        { error: errBody?.error?.message || "Model request failed." },
        { status: 500 },
      );
    }

    const okBody = response.body as {
      choices?: { message?: { content?: string } }[];
    };
    const reply =
      okBody.choices?.[0]?.message?.content || "No response text returned.";
    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 },
    );
  }
}
