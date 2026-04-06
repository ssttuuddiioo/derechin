import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SUMMARY_PROMPT = `Eres un experto en derecho constitucional colombiano. Analiza el siguiente texto de una sentencia de la Corte Constitucional de Colombia y genera una FICHA JURISPRUDENCIAL completa en formato JSON.

El JSON debe tener exactamente estos campos:
{
  "relevancia": "Por qué esta sentencia es relevante para el derecho constitucional colombiano. Explica su importancia, el precedente que sienta, y por qué un abogado o estudiante debería conocerla. (2-4 oraciones sustantivas)",
  "hechos": "Síntesis narrativa de los hechos relevantes y las actuaciones judiciales previas. Incluye quién demanda, qué norma o acto se cuestiona, y el contexto fáctico. (3-5 oraciones)",
  "norma_demandada": "La norma, decreto, acto o disposición que se demanda o revisa. Si es tutela, indicar el acto o conducta cuestionada.",
  "problema_juridico": "El problema jurídico central formulado como pregunta. Debe capturar la tensión constitucional en juego. (1-2 oraciones en forma interrogativa)",
  "ratio_decidendi": "El razonamiento jurídico central de la Corte — los argumentos que fundamentan la decisión. Incluye los juicios aplicados (proporcionalidad, suficiencia, etc.) y cómo la Corte resuelve la tensión constitucional. (3-5 oraciones)",
  "regla_decision": "La regla o subregla jurídica que la sentencia establece como precedente. Debe ser formulada de manera general y aplicable a casos futuros. (1-2 oraciones)",
  "decision": "Lo que decidió la Corte: exequible, inexequible, conceder tutela, etc. Incluye si la decisión fue condicionada o modulada y cualquier exhorto. (2-3 oraciones)",
  "obiter_dicta": "Otros aportes relevantes de la sentencia que no son estrictamente la ratio pero enriquecen la jurisprudencia: principios reiterados, reflexiones sobre temas conexos, directrices para el futuro. (2-4 oraciones)",
  "salvamentos_resumen": "Resumen de salvamentos de voto (SV) y aclaraciones de voto (AV), indicando el magistrado y su argumento central. Si no hay, dejar vacío.",
  "temas": ["array de 3-6 temas jurídicos específicos en español"],
  "derechos": ["array de derechos fundamentales involucrados"],
  "precedente_citado": ["array de IDs de sentencias citadas, formato exacto: T-123/24, C-239/97, SU-081/24"],
  "preguntas_orientadoras": ["3 preguntas de análisis que surgen de la sentencia, útiles para estudio o debate académico"],
  "cambio_precedente": false,
  "nota_cambio": "Si cambio_precedente es true, explicar qué precedente se modifica y cómo"
}

INSTRUCCIONES:
- Responde SOLO con el JSON, sin texto adicional ni markdown
- Todo el contenido debe estar en español
- Sé riguroso y preciso con los conceptos jurídicos
- Los temas deben ser específicos (no genéricos como "derechos fundamentales")
- Identifica sentencias citadas con el formato exacto (T-XXX/YY, C-XXX/YY, SU-XXX/YY)
- Las preguntas orientadoras deben provocar análisis crítico, no ser meramente descriptivas
- cambio_precedente solo es true si la sentencia explícitamente modifica, revoca o cambia línea jurisprudencial`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, sentencia_id } = body;

    if (!url && !sentencia_id) {
      return NextResponse.json(
        { error: "Se requiere url o sentencia_id" },
        { status: 400 }
      );
    }

    let fullText = "";
    let resolvedId = sentencia_id || "";

    if (url) {
      // Fetch HTML from relatoría URL
      const res = await fetch(url, {
        headers: { "User-Agent": "CorteConstitucionalExplorer/1.0" },
      });
      if (!res.ok) {
        return NextResponse.json(
          { error: `No se pudo acceder a la URL: ${res.status}` },
          { status: 400 }
        );
      }
      const html = await res.text();
      // Extract text content — strip HTML tags
      fullText = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      // Try to extract sentencia ID from URL
      const urlMatch = url.match(
        /\/(t|c|su|a)-?(\d+)-(\d{2})\.htm/i
      );
      if (urlMatch) {
        const [, tipo, num, yr] = urlMatch;
        resolvedId = `${tipo.toUpperCase()}-${parseInt(num)}/${yr}`;
      }
    } else {
      // Look up full text from Supabase
      const db = supabaseAdmin();
      const { data } = await db
        .from("sentencia_textos")
        .select("texto_completo")
        .eq("sentencia_id", sentencia_id)
        .maybeSingle();

      if (!data?.texto_completo) {
        return NextResponse.json(
          { error: "No se encontró el texto de esta sentencia" },
          { status: 404 }
        );
      }
      fullText = data.texto_completo;
    }

    // Truncate to ~150k chars
    if (fullText.length > 150000) {
      fullText = fullText.slice(0, 150000);
    }

    if (fullText.length < 100) {
      return NextResponse.json(
        { error: "El texto extraído es demasiado corto" },
        { status: 400 }
      );
    }

    // Call Claude API
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `${SUMMARY_PROMPT}\n\n--- TEXTO DE LA SENTENCIA ---\n\n${fullText}`,
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "No se pudo parsear la respuesta de la IA" },
        { status: 500 }
      );
    }

    const summary = JSON.parse(jsonMatch[0]);

    // Store in Supabase if we have a sentencia_id
    if (resolvedId) {
      const db = supabaseAdmin();
      await db.from("sentencia_resumenes").upsert(
        {
          sentencia_id: resolvedId,
          ...summary,
          generated_at: new Date().toISOString(),
          model_version: "claude-sonnet-4-20250514",
        },
        { onConflict: "sentencia_id" }
      );
    }

    return NextResponse.json({
      sentencia_id: resolvedId,
      summary,
    });
  } catch (err) {
    console.error("Summarize error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
