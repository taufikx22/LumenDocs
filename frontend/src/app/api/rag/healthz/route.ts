import { NextResponse } from "next/server";

const RAG_API_BASE_URL = process.env.RAG_API_BASE_URL;

export async function GET() {
    console.log("--- HEALTHZ PROXY ROUTE HANDLER CALLED ---");
    console.log("RAG_API_BASE_URL:", RAG_API_BASE_URL);
    try {
        if (!RAG_API_BASE_URL) {
            console.log("RAG_API_BASE_URL is not configured!");
            return NextResponse.json({ error: "Backend URL not configured." }, { status: 500 });
        }
        const targetUrl = `${RAG_API_BASE_URL}/healthz`;
        console.log("Fetching targetUrl:", targetUrl);
        const res = await fetch(targetUrl);
        console.log("Fetch response status:", res.status);
        const data = await res.json().catch(() => null);
        console.log("Fetch response data:", data);
        return NextResponse.json(data, { status: res.status });
    } catch (error) {
        console.error("Fetch error in healthz proxy:", error);
        return NextResponse.json({ error: "Backend not reachable." }, { status: 503 });
    }
}

