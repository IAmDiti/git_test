import { NextResponse } from "next/server";
import { z } from "zod";
import OpenAI from "openai";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ZODIAC_SIGN_VALUES, type ZodiacSign } from "@/lib/zodiac";

export const runtime = "nodejs";

const QuerySchema = z.object({
  sign: z.enum(ZODIAC_SIGN_VALUES),
});

const OpenAIResponseSchema = z.object({
  short: z.string().min(1),
  long: z.object({
    general: z.string().min(1),
    love: z.string().min(1),
    career_money: z.string().min(1),
    advice: z.string().min(1),
  }),
});

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function buildLongText(longText: z.infer<typeof OpenAIResponseSchema>["long"]) {
  return [
    "## General",
    longText.general.trim(),
    "",
    "## Love",
    longText.love.trim(),
    "",
    "## Career/Money",
    longText.career_money.trim(),
    "",
    "## Advice",
    longText.advice.trim(),
  ].join("\n");
}

async function generateHoroscope(sign: ZodiacSign, date: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  const openai = new OpenAI({ apiKey });

  const prompt = [
    `Generate a daily horoscope for the zodiac sign "${sign}" on date ${date}.`,
    "Style: mysterious, emotional, specific, uplifting.",
    "Avoid harmful content. No medical or legal advice. No explicit sexual content.",
    "Short: 2-3 lines.",
    "Long: 8-12 lines total across these sections.",
    "Return strict JSON with this shape:",
    '{ "short": "2-3 lines", "long": { "general": "...", "love": "...", "career_money": "...", "advice": "..." } }',
  ].join(" ");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a precise JSON generator for daily horoscopes. Output only JSON.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.8,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI response was empty.");
  }

  let parsed: z.infer<typeof OpenAIResponseSchema>;
  try {
    parsed = OpenAIResponseSchema.parse(JSON.parse(content));
  } catch (error) {
    throw new Error("OpenAI response JSON was invalid.");
  }

  return parsed;
}

async function fetchOrCreateHoroscope(sign: ZodiacSign, date: string) {
  const supabaseAdmin = createSupabaseAdminClient();

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("horoscopes")
    .select("sign, date, short_text, long_text")
    .eq("sign", sign)
    .eq("date", date)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    return existing;
  }

  const generated = await generateHoroscope(sign, date);
  const longText = buildLongText(generated.long);

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("horoscopes")
    .insert({
      sign,
      date,
      short_text: generated.short.trim(),
      long_text: longText,
    })
    .select("sign, date, short_text, long_text")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: retry, error: retryError } = await supabaseAdmin
        .from("horoscopes")
        .select("sign, date, short_text, long_text")
        .eq("sign", sign)
        .eq("date", date)
        .maybeSingle();

      if (retryError || !retry) {
        throw new Error(retryError?.message ?? "Failed to fetch horoscope.");
      }

      return retry;
    }

    throw new Error(insertError.message);
  }

  return inserted;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const signParam = url.searchParams.get("sign");

  const parsed = QuerySchema.safeParse({ sign: signParam });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid sign. Choose one of the 12 zodiac signs." },
      { status: 400 }
    );
  }

  try {
    const date = getTodayDate();
    const horoscope = await fetchOrCreateHoroscope(parsed.data.sign, date);

    const supabaseServer = createSupabaseServerClient();
    const { data } = await supabaseServer.auth.getUser();
    const isAuthed = Boolean(data.user);

    return NextResponse.json({
      sign: horoscope.sign,
      date: horoscope.date,
      short_text: horoscope.short_text,
      ...(isAuthed ? { long_text: horoscope.long_text } : {}),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error occurred.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
