import { useEffect, useState } from "react";

const BUILD_ID = "2e9d7319-6797-40cb-a4a8-eeb19b36faa9";
const API_URL = "https://33da9375-b7ec-4e9b-899a-68aaed860a62-00-2bew524gwjbdw.worf.replit.dev";

type BuildStatus = "NEW" | "IN_QUEUE" | "IN_PROGRESS" | "FINISHED" | "ERRORED" | "CANCELLED";

function useBuildStatus() {
  const [status, setStatus] = useState<BuildStatus>("NEW");
  const [apkUrl, setApkUrl] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const check = async () => {
    try {
      const res = await fetch(`${API_URL}/api/eas-build-status?buildId=${BUILD_ID}`);
      if (res.ok) {
        const j = await res.json();
        setStatus(j.status || "NEW");
        setApkUrl(j.apkUrl || null);
      }
    } catch {
      // ignore
    }
    setLastChecked(new Date());
  };

  useEffect(() => {
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  return { status, apkUrl, lastChecked, refresh: check };
}

const STEPS = [
  { num: "01", title: "تفعيل المصادر المجهولة", desc: "الإعدادات ← الأمان ← السماح بالتطبيقات من مصادر مجهولة" },
  { num: "02", title: "تنزيل ملف APK", desc: "اضغط على زر التنزيل أعلاه وانتظر اكتمال التحميل" },
  { num: "03", title: "تثبيت التطبيق", desc: "افتح ملف الـ APK المنزّل وابدأ التثبيت" },
  { num: "04", title: "استمتع بالمشاهدة", desc: "ابحث عن ANGEL TV pro على شاشتك وابدأ البث" },
];

const FEATURES = [
  { icon: "🎬", label: "32,000+ فيلم" },
  { icon: "📺", label: "13,000+ مسلسل" },
  { icon: "📡", label: "10,000+ قناة حية" },
  { icon: "🔄", label: "تحديثات تلقائية" },
  { icon: "📺", label: "مخصص للـ Android TV" },
  { icon: "🌙", label: "تصميم داكن فاخر" },
];

function StatusBadge({ status }: { status: BuildStatus }) {
  const map: Record<BuildStatus, { label: string; color: string; pulse: boolean }> = {
    NEW:         { label: "في الانتظار",    color: "#888",    pulse: false },
    IN_QUEUE:    { label: "في الطابور",     color: "#f59e0b", pulse: true },
    IN_PROGRESS: { label: "جاري البناء...", color: "#3b82f6", pulse: true },
    FINISHED:    { label: "جاهز للتنزيل",  color: "#22c55e", pulse: false },
    ERRORED:     { label: "فشل البناء",    color: "#ef4444", pulse: false },
    CANCELLED:   { label: "ملغي",          color: "#888",    pulse: false },
  };
  const { label, color, pulse } = map[status] || map.NEW;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: `${color}22`, border: `1px solid ${color}44`,
      borderRadius: 20, padding: "4px 12px", fontSize: 12, color,
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: "50%", background: color,
        animation: pulse ? "pulse 1.4s ease-in-out infinite" : "none",
      }} />
      {label}
    </span>
  );
}

export default function App() {
  const { status, apkUrl, lastChecked, refresh } = useBuildStatus();

  const downloadUrl = apkUrl || `${API_URL}/api/apk`;
  const isReady = status === "FINISHED" || !!apkUrl;
  const isBuilding = status === "IN_PROGRESS" || status === "IN_QUEUE" || status === "NEW";

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #0d0d06 0%, #111108 40%, #161310 100%)",
      color: "#e8e8e8",
      fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif",
      direction: "rtl",
    }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes glow { 0%,100%{box-shadow:0 0 20px #f0bf1a44} 50%{box-shadow:0 0 40px #f0bf1a88,0 0 80px #f0bf1a22} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        .dl-btn { animation: glow 2.5s ease-in-out infinite; transition: transform .15s; }
        .dl-btn:hover { transform: scale(1.04); }
        .dl-btn:active { transform: scale(.97); }
        .feat-card:hover { transform: translateY(-4px); border-color: #f0bf1a44 !important; }
        .step-card:hover { border-color: #f0bf1a44 !important; }
      `}</style>

      {/* Header */}
      <header style={{
        borderBottom: "1px solid #2a2a1a",
        background: "rgba(0,0,0,.4)",
        backdropFilter: "blur(12px)",
        padding: "16px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #f0bf1a, #c49a10)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 900, color: "#111",
          }}>A</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: 1 }}>
              ANGEL <span style={{ color: "#f0bf1a" }}>TV pro</span>
            </div>
            <div style={{ fontSize: 10, color: "#666" }}>تطبيق Android TV</div>
          </div>
        </div>
        <StatusBadge status={status} />
      </header>

      {/* Hero */}
      <section style={{
        textAlign: "center", padding: "60px 24px 40px",
        background: "radial-gradient(ellipse 80% 40% at 50% 0%, #f0bf1a08 0%, transparent 70%)",
      }}>
        <div style={{
          display: "inline-block", animation: "float 4s ease-in-out infinite",
          fontSize: 80, marginBottom: 16, filter: "drop-shadow(0 0 24px #f0bf1a44)",
        }}>📺</div>

        <h1 style={{
          fontSize: "clamp(28px, 5vw, 52px)", fontWeight: 900,
          margin: "0 0 10px", lineHeight: 1.2,
        }}>
          <span style={{ color: "#fff" }}>ANGEL </span>
          <span style={{ color: "#f0bf1a" }}>TV pro</span>
        </h1>

        <p style={{ fontSize: 16, color: "#aaa", margin: "0 auto 8px", maxWidth: 480 }}>
          أفضل تطبيق بث لأجهزة Android TV — 32K+ فيلم، 13K+ مسلسل، 10K+ قناة
        </p>

        <p style={{ fontSize: 13, color: "#666", margin: "0 0 32px" }}>
          الإصدار 1.0.0 · Android TV
        </p>

        {/* Download Button */}
        {isReady ? (
          <a
            href={downloadUrl}
            download="angel-tv-pro.apk"
            className="dl-btn"
            style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              background: "linear-gradient(135deg, #f0bf1a, #c49a10)",
              color: "#111", fontWeight: 900, fontSize: 18,
              padding: "16px 40px", borderRadius: 14, textDecoration: "none",
              border: "none", cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 22 }}>⬇</span>
            تنزيل التطبيق — APK
          </a>
        ) : (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 12,
            background: "#1a1a0d", border: "2px solid #2a2a1a",
            borderRadius: 14, padding: "16px 40px",
          }}>
            <div style={{
              width: 20, height: 20, border: "3px solid #f0bf1a",
              borderTopColor: "transparent", borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }} />
            <span style={{ color: "#888", fontSize: 16 }}>
              {isBuilding ? "جاري بناء التطبيق..." : "قريباً..."}
            </span>
          </div>
        )}

        {lastChecked && (
          <div style={{ marginTop: 12, fontSize: 11, color: "#444" }}>
            آخر فحص: {lastChecked.toLocaleTimeString("ar-SA")} ·{" "}
            <button onClick={refresh} style={{
              background: "none", border: "none", color: "#666",
              cursor: "pointer", fontSize: 11, padding: 0, textDecoration: "underline",
            }}>تحديث</button>
          </div>
        )}

        {isBuilding && (
          <div style={{
            margin: "20px auto 0", maxWidth: 400,
            background: "#1a1a0d", border: "1px solid #2a2a15",
            borderRadius: 12, padding: "14px 20px",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <span style={{ fontSize: 18 }}>⏳</span>
            <div style={{ textAlign: "right", flex: 1 }}>
              <div style={{ fontSize: 13, color: "#ccc", fontWeight: 600 }}>
                البناء جاري على EAS
              </div>
              <div style={{ fontSize: 11, color: "#666" }}>
                الصفحة تتحدث تلقائياً كل 30 ثانية
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Features */}
      <section style={{ padding: "20px 24px 40px", maxWidth: 900, margin: "0 auto" }}>
        <h2 style={{
          textAlign: "center", fontSize: 20, fontWeight: 700,
          margin: "0 0 24px", color: "#f0bf1a",
        }}>✨ مميزات التطبيق</h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
        }}>
          {FEATURES.map(f => (
            <div key={f.label} className="feat-card" style={{
              background: "#1a1a0d", border: "1px solid #2a2a15",
              borderRadius: 12, padding: "18px 14px",
              textAlign: "center", transition: ".2s",
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{f.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#ccc" }}>{f.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Install Steps */}
      <section style={{
        padding: "20px 24px 60px", maxWidth: 900, margin: "0 auto",
        borderTop: "1px solid #1a1a0d",
      }}>
        <h2 style={{
          textAlign: "center", fontSize: 20, fontWeight: 700,
          margin: "0 0 24px", color: "#fff",
        }}>🛠 طريقة التثبيت</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {STEPS.map(s => (
            <div key={s.num} className="step-card" style={{
              display: "flex", alignItems: "flex-start", gap: 16,
              background: "#131308", border: "1px solid #2a2a15",
              borderRadius: 12, padding: "16px 20px", transition: ".2s",
            }}>
              <div style={{
                minWidth: 36, height: 36, borderRadius: "50%",
                background: "linear-gradient(135deg, #f0bf1a22, #f0bf1a11)",
                border: "1px solid #f0bf1a44",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 900, color: "#f0bf1a",
              }}>{s.num}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: "#777", lineHeight: 1.5 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: "1px solid #1a1a0d",
        padding: "20px 24px",
        textAlign: "center",
        color: "#444",
        fontSize: 12,
      }}>
        <div style={{ marginBottom: 6 }}>
          ANGEL TV pro · جميع الحقوق محفوظة
        </div>
        <div>
          Build ID: <span style={{ color: "#666", fontFamily: "monospace" }}>{BUILD_ID.slice(0, 8)}...</span>
        </div>
      </footer>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
