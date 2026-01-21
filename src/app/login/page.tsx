"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isZodiacSign } from "@/lib/zodiac";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const signParam = searchParams.get("sign");
  const sign = isZodiacSign(signParam) ? signParam : undefined;
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [redirectTo, setRedirectTo] = useState<string | undefined>();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const baseUrl = window.location.origin;
    const destination = sign ? `/?sign=${sign}` : "/";
    setRedirectTo(`${baseUrl}${destination}`);
  }, [sign]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-indigo-500/10">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Free unlock
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-white">
            Unlock your full horoscope
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Use a magic link to log in. We will send a secure link to your email.
          </p>

          <div className="mt-6">
            <Auth
              supabaseClient={supabase}
              view="magic_link"
              providers={[]}
              showLinks={false}
              redirectTo={redirectTo}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: "#6366f1",
                      brandAccent: "#4f46e5",
                    },
                  },
                },
              }}
            />
          </div>

          <Link
            href={sign ? `/?sign=${sign}` : "/"}
            className="mt-6 block text-center text-sm text-slate-400 transition hover:text-slate-200"
          >
            Back to horoscope
          </Link>
        </div>
      </div>
    </div>
  );
}
