import { NextRequest, NextResponse } from "next/server";

const RAG_API_BASE_URL = process.env.RAG_API_BASE_URL;

// POST /api/rag/models/[id]/load — load a model
// POST /api/rag/models/[id]/default — set default
// DELETE /api/rag/models/[id] — unregister

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        if (!RAG_API_BASE_URL) {
            return NextResponse.json({ error: "RAG backend URL not configured." }, { status: 500 });
        }

        const { id } = await params;
        const url = req.nextUrl.pathname;

        // Determine which backend endpoint to call
        let backendUrl: string;
        if (url.endsWith("/load")) {
            backendUrl = `${RAG_API_BASE_URL}/models/${id}/load`;
        } else if (url.endsWith("/default")) {
            backendUrl = `${RAG_API_BASE_URL}/models/${id}/default`;
        } else {
            backendUrl = `${RAG_API_BASE_URL}/models/${id}`;
        }

        const res = await fetch(backendUrl, { method: "POST" });
        const data = await res.json().catch(() => null);
        return NextResponse.json(data, { status: res.status });
    } catch (error) {
        console.error("/api/rag/models/[id] POST error", error);
        return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
    }
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        if (!RAG_API_BASE_URL) {
            return NextResponse.json({ error: "RAG backend URL not configured." }, { status: 500 });
        }
        const { id } = await params;
        const res = await fetch(`${RAG_API_BASE_URL}/models/${id}`, { method: "DELETE" });
        const data = await res.json().catch(() => null);
        return NextResponse.json(data, { status: res.status });
    } catch (error) {
        console.error("/api/rag/models/[id] DELETE error", error);
        return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
    }
}
