import { NextResponse } from "next/server";

const RAG_API_BASE_URL = process.env.RAG_API_BASE_URL;

export async function GET() {
    try {
        if (!RAG_API_BASE_URL) {
            return NextResponse.json({ error: "RAG backend URL not configured." }, { status: 500 });
        }
        const res = await fetch(`${RAG_API_BASE_URL}/sessions`);
        const data = await res.json().catch(() => []);
        return NextResponse.json(data, { status: res.status });
    } catch (error) {
        console.error("/api/rag/sessions error", error);
        return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
    }
}
