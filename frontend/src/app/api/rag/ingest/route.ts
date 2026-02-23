import { NextRequest, NextResponse } from "next/server";

const RAG_API_BASE_URL = process.env.RAG_API_BASE_URL;

if (!RAG_API_BASE_URL) {
  console.warn("RAG_API_BASE_URL is not set — /api/rag/ingest won't work.");
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ error: "Expected multipart/form-data." }, { status: 400 });
    }

    const files = formData.getAll("files");
    if (!files.length) {
      return NextResponse.json({ error: "No files provided." }, { status: 400 });
    }

    if (!RAG_API_BASE_URL) {
      return NextResponse.json({ error: "RAG backend URL not configured on the server." }, { status: 500 });
    }

    const ragForm = new FormData();
    for (const file of files) {
      if (file instanceof File) ragForm.append("files", file, file.name);
    }

    const res = await fetch(`${RAG_API_BASE_URL}/ingest`, { method: "POST", body: ragForm });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.detail ?? "Backend error during ingestion.", status: res.status },
        { status: res.status },
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("/api/rag/ingest error", error);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
