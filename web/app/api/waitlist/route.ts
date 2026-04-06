import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { email, intent, sentencia_id } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Se requiere un email válido" },
        { status: 400 }
      );
    }

    const db = supabaseAdmin();
    await db.from("waitlist_signups").insert({
      email: email.trim().toLowerCase(),
      intent: intent || "wait",
      sentencia_id: sentencia_id || null,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Waitlist error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
