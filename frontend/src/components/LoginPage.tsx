import { useState } from "react";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { Loader2, Scissors, UserCircle } from "lucide-react";
import { profileApi, apiError } from "../api";
import type { UserProfile } from "../types";

interface Props {
  profileId: string;
  googleClientId: string | undefined;
  onComplete: (profile: UserProfile) => void;
  onSkip: () => void;
}

export default function LoginPage({ profileId, googleClientId, onComplete, onSkip }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleGoogleSuccess(credentialResponse: { credential?: string }) {
    if (!credentialResponse.credential) return;
    setBusy(true);
    setError("");
    try {
      const profile = await profileApi.googleLogin(credentialResponse.credential, profileId);
      onComplete(profile);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink text-white">
            <Scissors className="h-7 w-7" />
          </div>
          <h1 className="font-display text-3xl font-bold text-ink">Tailor</h1>
          <p className="mt-1 text-sm text-muted">AI-powered resume tailoring</p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-8 shadow-lift space-y-6">
          <div className="text-center">
            <h2 className="font-display text-lg font-semibold text-ink">Welcome</h2>
            <p className="mt-1 text-sm text-muted">
              Sign in to save your profile and access it across sessions.
            </p>
          </div>

          {/* Google Sign-In */}
          <div className="flex flex-col items-center gap-3">
            {googleClientId ? (
              <GoogleOAuthProvider clientId={googleClientId}>
                {busy ? (
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
                  </div>
                ) : (
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError("Google sign-in failed. Please try again.")}
                    useOneTap={false}
                    shape="rectangular"
                    size="large"
                    width="280"
                  />
                )}
              </GoogleOAuthProvider>
            ) : (
              <div className="flex w-full items-center gap-3 rounded-lg border border-line bg-canvas px-4 py-3 text-sm text-muted">
                <UserCircle className="h-5 w-5 shrink-0" />
                <span>Google Sign-In not configured — set <code className="font-mono text-xs">VITE_GOOGLE_CLIENT_ID</code></span>
              </div>
            )}

            {error && (
              <p className="text-center text-sm text-bad">{error}</p>
            )}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-line" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-surface px-3 text-xs text-muted">or</span>
            </div>
          </div>

          <button
            className="btn-ghost w-full justify-center py-2.5"
            onClick={onSkip}
          >
            Continue without account
          </button>

          <p className="text-center text-xs text-muted">
            Your data is stored locally. Sign in only to sync across devices.
          </p>
        </div>
      </div>
    </div>
  );
}
