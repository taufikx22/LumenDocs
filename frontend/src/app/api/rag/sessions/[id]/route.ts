import { NextRequest, NextResponse } from "next/server";

const RAG_API_BASE_URL = process.env.RAG_API_BASE_URL;

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        if (!RAG_API_BASE_URL) {
            return NextResponse.json({ error: "RAG backend URL not configured." }, { status: 500 });
        }
        const { id } = await params;
        const res = await fetch(`${RAG_API_BASE_URL}/sessions/${id}`);
        const data = await res.json().catch(() => []);
        return NextResponse.json(data, { status: res.status });
    } catch (error) {
        console.error("/api/rag/sessions/[id] error", error);
        return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
    }
}
