"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ZODIAC_SIGNS, isZodiacSign, type ZodiacSign } from "@/lib/zodiac";

type HoroscopeResponse = {
  sign: ZodiacSign;
  date: string;
  short_text: string;
  long_text?: string;
};

type Section = {
  title: string;
  content: string;
};

function parseSections(markdown: string): Section[] {
  const normalized = markdown.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const chunks = normalized.split("\n## ");
  return chunks
    .map((chunk, index) => {
      const cleaned = index === 0 && chunk.startsWith("## ")
        ? chunk.slice(3)
        : chunk;
      const [titleLine, ...rest] = cleaned.split("\n");
      return {
        title: titleLine.trim(),
        content: rest.join("\n").trim(),
      };
    })
    .filter((section) => section.title);
}

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [selectedSign, setSelectedSign] = useState<ZodiacSign | null>(null);
  const [horoscope, setHoroscope] = useState<HoroscopeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const signParam = searchParams.get("sign");
    if (isZodiacSign(signParam)) {
      setSelectedSign(signParam);
    } else if (!signParam) {
      setSelectedSign(null);
    }
  }, [searchParams]);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setUserEmail(data.session?.user.email ?? null);
        setAuthReady(true);
      })
      .catch(() => {
        setAuthReady(true);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!selectedSign) {
      setHoroscope(null);
      return;
    }

    let isCurrent = true;
    setIsLoading(true);
    setError(null);

    fetch(`/api/horoscope?sign=${selectedSign}`)
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error ?? "Failed to load horoscope.");
        }
        return response.json();
      })
      .then((data: HoroscopeResponse) => {
        if (isCurrent) {
          setHoroscope(data);
        }
      })
      .catch((fetchError) => {
        if (isCurrent) {
          setError(fetchError.message ?? "Something went wrong.");
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [selectedSign, userEmail]);

  const sections = useMemo(() => {
    if (!horoscope?.long_text) return [];
    return parseSections(horoscope.long_text);
  }, [horoscope?.long_text]);

  const isAuthed = Boolean(userEmail);
  const loginHref = selectedSign ? `/login?sign=${selectedSign}` : "/login";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-5 py-10 sm:px-8">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Daily Horoscope
            </p>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">
              Read your stars today
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-300 sm:text-base">
              Pick your zodiac sign to reveal a short daily message. Create a
              free account to unlock the full horoscope with detailed sections.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {authReady ? (
              isAuthed ? (
                <button
                  className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-400"
                  onClick={() => supabase.auth.signOut()}
                >
                  Sign out
                </button>
              ) : (
                <Link
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
                  href={loginHref}
                >
                  Log in
                </Link>
              )
            ) : (
              <span className="text-xs text-slate-400">Checking session...</span>
            )}
          </div>
        </header>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-white">Choose your sign</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {ZODIAC_SIGNS.map((sign) => {
              const active = sign.value === selectedSign;
              return (
                <button
                  key={sign.value}
                  onClick={() => {
                    setSelectedSign(sign.value);
                    setHoroscope(null);
                    setError(null);
                    const params = new URLSearchParams(searchParams.toString());
                    params.set("sign", sign.value);
                    router.replace(`/?${params.toString()}`, { scroll: false });
                  }}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    active
                      ? "border-indigo-400 bg-indigo-500/20 text-white"
                      : "border-slate-700 bg-slate-900/70 text-slate-200 hover:border-slate-500"
                  }`}
                >
                  <p className="text-sm font-semibold">{sign.label}</p>
                  <p className="text-xs text-slate-400">Tap to reveal</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-lg font-semibold text-white">Short Horoscope</h2>
            <p className="mt-2 text-xs uppercase tracking-[0.3em] text-slate-500">
              Always free
            </p>
            {selectedSign ? (
              <div className="mt-5">
                {isLoading ? (
                  <p className="text-sm text-slate-400">Summoning your stars...</p>
                ) : error ? (
                  <p className="text-sm text-rose-300">{error}</p>
                ) : (
                  <p className="whitespace-pre-line text-sm text-slate-100">
                    {horoscope?.short_text ?? "No horoscope yet."}
                  </p>
                )}
                {horoscope?.date && (
                  <p className="mt-4 text-xs text-slate-500">
                    Updated for {horoscope.date}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-400">
                Select a zodiac sign to see your short horoscope.
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Full Horoscope
                </h2>
                <p className="mt-2 text-xs uppercase tracking-[0.3em] text-slate-500">
                  Detailed sections
                </p>
              </div>
              {!isAuthed && (
                <Link
                  href={loginHref}
                  className="rounded-full bg-indigo-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-400"
                >
                  Unlock Full Horoscope (Free)
                </Link>
              )}
            </div>

            <div className="relative mt-6">
              <div className={`${!isAuthed ? "blur-sm select-none" : ""}`}>
                {selectedSign ? (
                  isLoading ? (
                    <p className="text-sm text-slate-400">
                      Reading the cosmic archive...
                    </p>
                  ) : error ? (
                    <p className="text-sm text-rose-300">{error}</p>
                  ) : isAuthed && sections.length > 0 ? (
                    <div className="space-y-4">
                      {sections.map((section) => (
                        <div key={section.title}>
                          <h3 className="text-base font-semibold text-white">
                            {section.title}
                          </h3>
                          <p className="mt-2 whitespace-pre-line text-sm text-slate-200">
                            {section.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="whitespace-pre-line text-sm text-slate-200">
                      The full reading is ready. Log in to reveal the detailed
                      guidance for your day.
                    </p>
                  )
                ) : (
                  <p className="text-sm text-slate-400">
                    Select a zodiac sign to unlock your full horoscope.
                  </p>
                )}
              </div>

              {!isAuthed && selectedSign && (
                <div className="pointer-events-none absolute inset-0 rounded-2xl bg-slate-950/60" />
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
