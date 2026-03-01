import { NextRequest, NextResponse } from "next/server";

const RAG_API_BASE_URL = process.env.RAG_API_BASE_URL;

export async function GET(req: NextRequest) {
    try {
        if (!RAG_API_BASE_URL) {
            return NextResponse.json({ error: "Backend URL not configured." }, { status: 500 });
        }
        const path = req.nextUrl.searchParams.get("path") || "";
        const url = path
            ? `${RAG_API_BASE_URL}/setup/browse?path=${encodeURIComponent(path)}`
            : `${RAG_API_BASE_URL}/setup/browse`;
        const res = await fetch(url);
        const data = await res.json().catch(() => null);
        return NextResponse.json(data, { status: res.status });
    } catch (error) {
        console.error("/api/rag/browse error", error);
        return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
    }
}
