import { NextResponse } from "next/server";

const RAG_API_BASE_URL = process.env.RAG_API_BASE_URL;

export async function GET() {
    try {
        if (!RAG_API_BASE_URL) {
            return NextResponse.json({ error: "Backend URL not configured." }, { status: 500 });
        }
        const res = await fetch(`${RAG_API_BASE_URL}/healthz`);
        const data = await res.json().catch(() => null);
        return NextResponse.json(data, { status: res.status });
    } catch {
        return NextResponse.json({ error: "Backend not reachable." }, { status: 503 });
    }
}
