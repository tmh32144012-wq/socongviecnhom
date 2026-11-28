import { useEffect, useState } from "react";
import { Check, Copy, Info, X } from "lucide-react";
import { API_ENDPOINTS } from "../config/api";

function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.82-.07-1.64-.22-2.43H12v4.61h6.46a5.52 5.52 0 0 1-2.39 3.63v3h3.87c2.26-2.09 3.55-5.17 3.55-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.92l-3.87-3c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.27A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.37-2.27v-3.1H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.37l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.23 0 12 0A12 12 0 0 0 1.27 6.63l4 3.1C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#1877F2"
        d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07c0 6.02 4.39 11.01 10.13 11.93v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.24 2.69.24v2.97h-1.52c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.08 24 18.09 24 12.07Z"
      />
    </svg>
  );
}

function SocialAuthButtons({ mode = "login" }) {
  const [providers, setProviders] = useState({
    loaded: false,
    google: false,
    facebook: false,
    googleCallbackUrl: "http://localhost:5000/api/auth/google/callback",
    facebookCallbackUrl: "http://localhost:5000/api/auth/facebook/callback",
  });
  const [setupNotice, setSetupNotice] = useState(null);
  const [copiedUri, setCopiedUri] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(API_ENDPOINTS.oauthProviders)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active || !data) return;
        setProviders({
          loaded: true,
          google: Boolean(data.google),
          facebook: Boolean(data.facebook),
          googleCallbackUrl: data.googleCallbackUrl || "http://localhost:5000/api/auth/google/callback",
          facebookCallbackUrl: data.facebookCallbackUrl || "http://localhost:5000/api/auth/facebook/callback",
        });
      })
      .catch(() => {
        if (active) setProviders((p) => ({ ...p, loaded: true }));
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSocialClick = (provider) => {
    const enabled = provider === "google" ? providers.google : providers.facebook;
    if (!enabled) {
      setSetupNotice(provider);
      setCopiedUri(false);
      return;
    }
    sessionStorage.setItem("skippedIntro", "true");
    window.location.href =
      provider === "google" ? API_ENDPOINTS.oauthGoogle : API_ENDPOINTS.oauthFacebook;
  };

  const handleCopyUri = (uri) => {
    navigator.clipboard?.writeText(uri).then(() => {
      setCopiedUri(true);
      setTimeout(() => setCopiedUri(false), 2000);
    });
  };

  const verb = mode === "register" ? "Đăng ký nhanh với" : "Hoặc đăng nhập với";

  return (
    <div className="auth-social-wrap">
      <div className="auth-social-divider">
        <span>{verb}</span>
      </div>

      <div className="auth-social-grid">
        <button
          type="button"
          className="auth-social-btn is-google"
          onClick={() => handleSocialClick("google")}
          title={
            providers.google
              ? "Đăng nhập thật bằng tài khoản Google (OAuth 2.0)"
              : "Cần điền GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET trong server/.env"
          }
        >
          <GoogleIcon />
          <span>Google</span>
          {providers.loaded && providers.google && <span className="auth-social-live-dot" />}
        </button>

        <button
          type="button"
          className="auth-social-btn is-facebook"
          onClick={() => handleSocialClick("facebook")}
          title={
            providers.facebook
              ? "Đăng nhập thật bằng tài khoản Facebook (OAuth 2.0)"
              : "Cần điền FACEBOOK_APP_ID & FACEBOOK_APP_SECRET trong server/.env"
          }
        >
          <FacebookIcon />
          <span>Facebook</span>
          {providers.loaded && providers.facebook && <span className="auth-social-live-dot" />}
        </button>
      </div>

      {setupNotice && (
        <div className="auth-oauth-setup-box" role="status">
          <div className="auth-oauth-setup-head">
            <span>
              <Info size={14} strokeWidth={2} />
              <strong>
                Kích hoạt đăng nhập thật bằng {setupNotice === "google" ? "Google" : "Facebook"}
              </strong>
            </span>
            <button
              type="button"
              className="auth-oauth-setup-close"
              onClick={() => setSetupNotice(null)}
              aria-label="Đóng hướng dẫn"
            >
              <X size={14} />
            </button>
          </div>
          <p>
            Luồng OAuth 2.0 thật đã sẵn sàng. Chỉ cần thêm 2 biến vào <code>server/.env</code> và khởi động lại server:
          </p>
          <pre className="auth-oauth-env-snippet">
            {setupNotice === "google"
              ? `GOOGLE_CLIENT_ID=...\nGOOGLE_CLIENT_SECRET=...`
              : `FACEBOOK_APP_ID=...\nFACEBOOK_APP_SECRET=...`}
          </pre>
          <div className="auth-oauth-callback-row">
            <span>Callback URI:</span>
            <code>
              {setupNotice === "google" ? providers.googleCallbackUrl : providers.facebookCallbackUrl}
            </code>
            <button
              type="button"
              className="auth-oauth-copy-btn"
              onClick={() =>
                handleCopyUri(
                  setupNotice === "google" ? providers.googleCallbackUrl : providers.facebookCallbackUrl
                )
              }
            >
              {copiedUri ? <Check size={12} /> : <Copy size={12} />}
              <span>{copiedUri ? "Đã chép" : "Chép"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SocialAuthButtons;
