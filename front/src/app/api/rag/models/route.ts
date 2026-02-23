import { NextRequest, NextResponse } from "next/server";

const RAG_API_BASE_URL = process.env.RAG_API_BASE_URL;

if (!RAG_API_BASE_URL) {
  console.warn("RAG_API_BASE_URL is not set — /api/rag/models won't work.");
}

export async function GET(_req: NextRequest) {
  try {
    if (!RAG_API_BASE_URL) {
      return NextResponse.json({ error: "RAG backend URL not configured on the server." }, { status: 500 });
    }

    const res = await fetch(`${RAG_API_BASE_URL}/models`);
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.detail ?? "Backend error listing models.", status: res.status },
        { status: res.status },
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("/api/rag/models error", error);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
