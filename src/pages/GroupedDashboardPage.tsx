import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

interface Props {
  children: React.ReactNode;
}

export default function UrlParamSync({ children }: Props) {
  const location = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);

    const t = searchParams.get("t");
    const u = searchParams.get("u");
    const s = searchParams.get("s");

    console.log("SSO Sync Running");

    // Save token
    if (t) {
      localStorage.setItem("token", t);
      console.log("Token saved:", t);
    }

    // Save user
    if (u) {
      try {
        const decoded = decodeURIComponent(u);
        const userObject = JSON.parse(decoded);

        localStorage.setItem(
          "user_details",
          JSON.stringify(userObject)
        );

        console.log("User saved:", userObject);

      } catch (error) {
        console.error("User parse error:", error);
      }
    }

    // Save site
    if (s) {
      localStorage.setItem("active_site", s);
      console.log("Site saved:", s);
    }

    // Clean URL
    if (t || u || s) {
      searchParams.delete("t");
      searchParams.delete("u");
      searchParams.delete("s");

      const cleanUrl =
        location.pathname +
        (searchParams.toString()
          ? `?${searchParams.toString()}`
          : "") +
        location.hash;

      window.history.replaceState({}, document.title, cleanUrl);
    }

    setReady(true);

  }, []);

  // Wait until localStorage is set
  if (!ready) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: 'var(--bg-primary, #0B0F19)' }}>
        <div className="wave-dots-container">
          <span className="wave-dot" style={{ width: '14px', height: '14px' }} />
          <span className="wave-dot" style={{ width: '14px', height: '14px' }} />
          <span className="wave-dot" style={{ width: '14px', height: '14px' }} />
        </div>
        <div className="text-white/80 text-sm font-medium tracking-wide">
          Syncing command center session...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}