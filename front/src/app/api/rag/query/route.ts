import { NextRequest, NextResponse } from "next/server";

const RAG_API_BASE_URL = process.env.RAG_API_BASE_URL;

if (!RAG_API_BASE_URL) {
  console.warn("RAG_API_BASE_URL is not set — /api/rag/query won't work.");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body.question !== "string") {
      return NextResponse.json({ error: "Missing `question` in request body." }, { status: 400 });
    }

    const { question, top_k, model } = body as {
      question: string;
      top_k?: number;
      model?: string | null;
    };

    if (!RAG_API_BASE_URL) {
      return NextResponse.json({ error: "RAG backend URL not configured on the server." }, { status: 500 });
    }

    const res = await fetch(`${RAG_API_BASE_URL}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        top_k: typeof top_k === "number" ? top_k : 5,
        model: model ?? undefined,
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.detail ?? "Backend returned an error.", status: res.status },
        { status: res.status },
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("/api/rag/query error", error);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
