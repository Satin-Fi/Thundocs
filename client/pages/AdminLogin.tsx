import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { grantAdmin, isAdmin } from "@/components/AdminGate";
import { Eye, EyeOff, Lock } from "lucide-react";

// Change this to whatever password you want
const ADMIN_PASSWORD = "thundocs@admin2026";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (isAdmin()) navigate("/admin/dashboard", { replace: true });
  }, [navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      grantAdmin();
      navigate("/admin/dashboard", { replace: true });
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 600);
      setPassword("");
    }
  };

  return (
    <div className="hero-group relative min-h-screen bg-[#020408] text-white font-sans">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage: "radial-gradient(rgba(0,240,255,0.03) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div
          className="absolute -top-40 -left-16 w-[640px] h-[640px] rounded-full opacity-30 blur-[120px]"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, #00f0ff 0%, #0055ff 40%, transparent 70%)",
          }}
        />
        <div className="absolute top-1/2 left-1/2 w-[900px] h-[900px] -translate-x-1/2 -translate-y-1/2 -rotate-[5deg]">
          <svg
            viewBox="0 0 512 512"
            className="thunder-bolt-svg hero-bolt w-full h-full"
          >
            <path d="M284 32L120 260h84l-40 220 180-248h-92l56-200z" fill="white" />
          </svg>
        </div>
      </div>

      <div className="relative min-h-screen flex items-center justify-center px-4">
        <form
          onSubmit={handleSubmit}
          className={`w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl space-y-5`}
          style={shake ? { animation: "shake 0.4s ease" } : {}}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
              <Lock className="w-7 h-7 text-white/50" />
            </div>
            <p className="text-white font-semibold text-lg">Admin Access</p>
            <p className="text-white/40 text-xs text-center">This area is restricted.</p>
          </div>

        {/* Password field */}
        <div className="relative">
          <input
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false); }}
            placeholder="Enter admin password"
            autoFocus
            className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none pr-10 transition-colors ${
              error ? "border-red-500/60 focus:border-red-500" : "border-white/10 focus:border-white/30"
            }`}
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

          {error && (
            <p className="text-red-400 text-xs text-center -mt-2">Incorrect password. Try again.</p>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-white text-zinc-900 font-semibold text-sm hover:bg-white/90 transition-colors"
          >
            Unlock
          </button>
        </form>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}
