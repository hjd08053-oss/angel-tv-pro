import { useState, useEffect, useRef } from "react";
import Hls from "hls.js";

const API_BASE = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/api`;

type Tab = "live" | "movies" | "series";
interface Category { category_id: string; category_name: string; }
interface Item {
  stream_id?: number;
  series_id?: number;
  name: string;
  stream_icon?: string;
  cover?: string;
  rating?: string | number;
  container_extension?: string;
}

function getStreamUrl(item: Item, tab: Tab): string {
  const id = item.stream_id ?? item.series_id;
  if (tab === "live") return `${API_BASE}/proxy/live/${id}?format=m3u8`;
  if (tab === "movies") return `${API_BASE}/proxy/movie/${id}?ext=${item.container_extension || "mp4"}`;
  return `${API_BASE}/proxy/series/${id}?ext=${item.container_extension || "mkv"}`;
}

function useApiFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!url) { setLoading(false); return; }
    setLoading(true);
    fetch(url)
      .then(r => r.json())
      .then(r => { setData(r.data ?? r); setLoading(false); })
      .catch(() => setLoading(false));
  }, [url]);
  return { data, loading };
}

function Spinner() {
  return (
    <div className="flex items-center justify-center w-full" style={{ minHeight: 120 }}>
      <div style={{ width: 36, height: 36, border: "4px solid #7c3aed", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function VideoPlayer({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [status, setStatus] = useState<"loading" | "playing" | "error">("loading");
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setStatus("loading"); setErrMsg("");
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    const isHls = url.includes("format=m3u8") || url.endsWith(".m3u8");

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        lowLatencyMode: true,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        maxBufferSize: 60 * 1024 * 1024,
        startLevel: -1,
        abrEwmaDefaultEstimate: 5000000,
        enableWorker: true,
        fragLoadingTimeOut: 20000,
        manifestLoadingTimeOut: 20000,
        levelLoadingTimeOut: 20000,
      });
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { setStatus("playing"); video.play().catch(() => {}); });
      hls.on(Hls.Events.ERROR, (_, d) => {
        if (d.fatal) {
          if (d.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else {
            setStatus("error");
            setErrMsg("تعذر تحميل البث. قد يكون البث غير متاح الآن.");
          }
        }
      });
    } else {
      video.src = url;
      video.preload = "auto";
      const play = () => { setStatus("playing"); video.play().catch(() => {}); };
      const err = () => { setStatus("error"); setErrMsg("تعذر تشغيل هذا الملف في المتصفح."); };
      video.addEventListener("canplay", play);
      video.addEventListener("error", err);
      return () => { video.removeEventListener("canplay", play); video.removeEventListener("error", err); };
    }
    return () => { if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; } };
  }, [url]);

  return (
    <div style={{ background: "#000", borderBottom: "1px solid #3730a3", padding: "12px 16px" }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          {status === "playing" && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", display: "inline-block", animation: "pulse 1s infinite" }} />}
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 14, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
          {status === "loading" && <span style={{ color: "#fbbf24", fontSize: 12 }}>⏳ جاري التحميل...</span>}
          {status === "playing" && <span style={{ color: "#4ade80", fontSize: 12 }}>بث مباشر</span>}
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#9ca3af", cursor: "pointer", borderRadius: 6, padding: "4px 10px", fontSize: 16 }}>✕</button>
        </div>
        <div style={{ position: "relative", background: "#000", borderRadius: 12, overflow: "hidden" }}>
          <video ref={videoRef} controls autoPlay playsInline style={{ width: "100%", aspectRatio: "16/9", maxHeight: 380, background: "#000", display: "block" }} />
          {status === "error" && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.95)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span style={{ fontSize: 40 }}>⚠️</span>
              <p style={{ color: "#fff", fontWeight: 700, margin: 0 }}>تعذر التشغيل</p>
              <p style={{ color: "#9ca3af", fontSize: 13, margin: 0, textAlign: "center", padding: "0 16px" }}>{errMsg}</p>
              <p style={{ color: "#6b7280", fontSize: 11, margin: 0, maxWidth: 400, wordBreak: "break-all", textAlign: "center" }}>{url}</p>
            </div>
          )}
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
      </div>
    </div>
  );
}

function CategoryList({ categories, selected, onSelect }: {
  categories: Category[]; selected: string; onSelect: (id: string) => void;
}) {
  return (
    <div style={{ width: 200, minWidth: 180, background: "rgba(0,0,0,0.5)", borderLeft: "1px solid rgba(255,255,255,0.08)", overflowY: "auto", flexShrink: 0, direction: "rtl" }}>
      <div onClick={() => onSelect("")} style={{ padding: "10px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600, background: !selected ? "#7c3aed" : "transparent", color: !selected ? "#fff" : "#d1d5db" }}>
        📋 الكل
      </div>
      {categories.map(c => (
        <div key={c.category_id} onClick={() => onSelect(c.category_id)}
          style={{ padding: "8px 14px", cursor: "pointer", fontSize: 12, borderBottom: "1px solid rgba(255,255,255,0.04)", background: selected === c.category_id ? "#7c3aed" : "transparent", color: selected === c.category_id ? "#fff" : "#d1d5db", lineHeight: 1.3 }}>
          {c.category_name}
        </div>
      ))}
    </div>
  );
}

function ItemGrid({ items, tab, onSelect, selectedId }: { items: Item[]; tab: Tab; onSelect: (i: Item) => void; selectedId?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 }}>
      {items.map((s, i) => {
        const id = s.stream_id ?? s.series_id ?? i;
        const img = s.stream_icon || s.cover;
        const isSel = id === selectedId;
        return (
          <div key={id} onClick={() => onSelect(s)} style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${isSel ? "#7c3aed" : "rgba(255,255,255,0.08)"}`, borderRadius: 10, overflow: "hidden", cursor: "pointer", transition: "transform 0.15s", boxShadow: isSel ? "0 0 0 2px #7c3aed80" : "none" }}
            onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.04)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}>
            {tab === "live" ? (
              <div style={{ padding: 10, textAlign: "center" }}>
                {img ? <img src={img} alt={s.name} style={{ width: 64, height: 40, objectFit: "contain" }} onError={e => (e.currentTarget.style.display = "none")} />
                  : <div style={{ width: 64, height: 40, margin: "0 auto", background: "rgba(124,58,237,0.3)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>📺</div>}
                <p style={{ color: "#fff", fontSize: 11, margin: "6px 0 0", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{s.name}</p>
              </div>
            ) : (
              <>
                {img ? <img src={img} alt={s.name} style={{ width: "100%", height: 130, objectFit: "cover", display: "block" }} onError={e => (e.currentTarget.style.display = "none")} />
                  : <div style={{ width: "100%", height: 130, background: "linear-gradient(135deg, rgba(124,58,237,0.4), rgba(79,70,229,0.4))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>{tab === "movies" ? "🎬" : "🎭"}</div>}
                <div style={{ padding: "8px 8px 10px" }}>
                  <p style={{ color: "#fff", fontSize: 11, fontWeight: 500, margin: 0, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{s.name}</p>
                  {s.rating && Number(s.rating) > 0 && <p style={{ color: "#fbbf24", fontSize: 11, margin: "4px 0 0" }}>⭐ {s.rating}</p>}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Pages({ page, total, perPage, onChange }: { page: number; total: number; perPage: number; onChange: (p: number) => void }) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20, paddingBottom: 8 }}>
      <button onClick={() => onChange(page - 1)} disabled={page === 0} style={{ padding: "6px 14px", background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8, color: "#fff", cursor: page === 0 ? "not-allowed" : "pointer", opacity: page === 0 ? 0.4 : 1 }}>◀</button>
      <span style={{ padding: "6px 14px", color: "#9ca3af", fontSize: 13 }}>{page + 1} / {totalPages}</span>
      <button onClick={() => onChange(page + 1)} disabled={page >= totalPages - 1} style={{ padding: "6px 14px", background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8, color: "#fff", cursor: page >= totalPages - 1 ? "not-allowed" : "pointer", opacity: page >= totalPages - 1 ? 0.4 : 1 }}>▶</button>
    </div>
  );
}

function LiveTab({ onPlay }: { onPlay: (item: Item, tab: Tab) => void }) {
  const { data: cats } = useApiFetch<Category[]>(`${API_BASE}/live/categories`);
  const [cat, setCat] = useState(""); const [search, setSearch] = useState(""); const [page, setPage] = useState(0);
  const PER = 50;
  const { data: streams, loading } = useApiFetch<Item[]>(`${API_BASE}/live/streams${cat ? `?category_id=${cat}` : ""}`);
  const filtered = (streams || []).filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()));
  const paged = filtered.slice(page * PER, (page + 1) * PER);
  useEffect(() => setPage(0), [cat, search]);

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      <CategoryList categories={cats || []} selected={cat} onSelect={c => { setCat(c); setPage(0); }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 10, alignItems: "center" }}>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="🔍 ابحث عن قناة..." dir="rtl"
            style={{ flex: 1, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "8px 14px", color: "#fff", fontSize: 14, outline: "none" }} />
          <span style={{ color: "#6b7280", fontSize: 12, whiteSpace: "nowrap" }}>{filtered.length} قناة</span>
        </div>
        {loading ? <Spinner /> : (
          <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
            <ItemGrid items={paged} tab="live" onSelect={i => onPlay(i, "live")} />
            <Pages page={page} total={filtered.length} perPage={PER} onChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}

function MoviesTab({ onPlay }: { onPlay: (item: Item, tab: Tab) => void }) {
  const { data: cats } = useApiFetch<Category[]>(`${API_BASE}/vod/categories`);
  const [cat, setCat] = useState(""); const [search, setSearch] = useState(""); const [page, setPage] = useState(0);
  const PER = 40;
  const { data: resp, loading } = useApiFetch<any>(`${API_BASE}/vod/streams?limit=500${cat ? `&category_id=${cat}` : ""}`);
  const all: Item[] = resp?.data || resp || [];
  const filtered = all.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()));
  const paged = filtered.slice(page * PER, (page + 1) * PER);
  useEffect(() => setPage(0), [cat, search]);

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      <CategoryList categories={cats || []} selected={cat} onSelect={c => { setCat(c); setPage(0); }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 10, alignItems: "center" }}>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="🔍 ابحث عن فيلم..." dir="rtl"
            style={{ flex: 1, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "8px 14px", color: "#fff", fontSize: 14, outline: "none" }} />
          <span style={{ color: "#6b7280", fontSize: 12, whiteSpace: "nowrap" }}>{filtered.length} فيلم</span>
        </div>
        {loading ? <Spinner /> : (
          <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
            <ItemGrid items={paged} tab="movies" onSelect={i => onPlay(i, "movies")} />
            <Pages page={page} total={filtered.length} perPage={PER} onChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}

function SeriesTab({ onPlay }: { onPlay: (item: Item, tab: Tab) => void }) {
  const { data: cats } = useApiFetch<Category[]>(`${API_BASE}/series/categories`);
  const [cat, setCat] = useState(""); const [search, setSearch] = useState(""); const [page, setPage] = useState(0);
  const [sel, setSel] = useState<Item | null>(null);
  const PER = 40;
  const { data: resp, loading } = useApiFetch<any>(`${API_BASE}/series/list?limit=500${cat ? `&category_id=${cat}` : ""}`);
  const all: Item[] = resp?.data || resp || [];
  const filtered = all.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()));
  const paged = filtered.slice(page * PER, (page + 1) * PER);
  useEffect(() => setPage(0), [cat, search]);

  const selId = sel?.stream_id ?? sel?.series_id;
  const { data: info, loading: infoLoading } = useApiFetch<any>(selId ? `${API_BASE}/series/info/${selId}` : "");

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      <CategoryList categories={cats || []} selected={cat} onSelect={c => { setCat(c); setPage(0); }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {sel && (
          <div style={{ background: "rgba(0,0,0,0.8)", borderBottom: "1px solid rgba(124,58,237,0.4)", padding: "12px 16px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ color: "#a78bfa", fontWeight: 700, fontSize: 14 }}>{sel.name}</span>
              <button onClick={() => setSel(null)} style={{ marginRight: "auto", background: "rgba(255,255,255,0.1)", border: "none", color: "#9ca3af", cursor: "pointer", borderRadius: 6, padding: "2px 10px", fontSize: 16 }}>✕</button>
            </div>
            {infoLoading ? <p style={{ color: "#6b7280", fontSize: 12, margin: 0 }}>جاري تحميل الحلقات...</p> : info?.episodes && (
              <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 4 }}>
                {Object.entries(info.episodes as Record<string, any[]>).map(([season, eps]) => (
                  <div key={season} style={{ flexShrink: 0 }}>
                    <p style={{ color: "#a78bfa", fontSize: 11, fontWeight: 700, margin: "0 0 6px" }}>موسم {season}</p>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", maxWidth: 400 }}>
                      {(eps as any[]).map((ep: any) => (
                        <button key={ep.id} onClick={() => onPlay({ stream_id: ep.id, name: `${sel.name} - م${season} ح${ep.episode_num}`, container_extension: ep.container_extension || "mkv" }, "series")}
                          style={{ background: "rgba(124,58,237,0.3)", border: "1px solid rgba(124,58,237,0.4)", color: "#fff", fontSize: 11, padding: "4px 10px", borderRadius: 6, cursor: "pointer" }}>
                          {ep.episode_num}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 10, alignItems: "center" }}>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="🔍 ابحث عن مسلسل..." dir="rtl"
            style={{ flex: 1, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "8px 14px", color: "#fff", fontSize: 14, outline: "none" }} />
          <span style={{ color: "#6b7280", fontSize: 12, whiteSpace: "nowrap" }}>{filtered.length} مسلسل</span>
        </div>
        {loading ? <Spinner /> : (
          <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
            <ItemGrid items={paged} tab="series" onSelect={setSel} selectedId={selId} />
            <Pages page={page} total={filtered.length} perPage={PER} onChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>("live");
  const [playing, setPlaying] = useState<{ item: Item; tab: Tab } | null>(null);
  const { data: account } = useApiFetch<any>(`${API_BASE}/account`);

  const tabs = [
    { id: "live" as Tab, label: "📺 بث مباشر" },
    { id: "movies" as Tab, label: "🎬 أفلام" },
    { id: "series" as Tab, label: "🎭 مسلسلات" },
  ];

  return (
    <div dir="rtl" style={{ height: "100dvh", background: "linear-gradient(135deg, #0a0a0f 0%, #0f0a1e 50%, #0a0f1e 100%)", display: "flex", flexDirection: "column", color: "#fff", fontFamily: "system-ui, -apple-system, sans-serif", overflow: "hidden" }}>
      <header style={{ background: "rgba(0,0,0,0.7)", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "10px 20px", display: "flex", alignItems: "center", gap: 12, backdropFilter: "blur(10px)", flexShrink: 0 }}>
        <span style={{ fontSize: 24 }}>📡</span>
        <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.5px" }}>IPTV <span style={{ color: "#a78bfa" }}>Pro</span></span>
        {account && (
          <div style={{ marginRight: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 20, padding: "3px 12px" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
              <span style={{ color: "#4ade80", fontSize: 12, fontWeight: 600 }}>{account.status}</span>
            </div>
            <span style={{ color: "#4b5563", fontSize: 12 }}>ينتهي: {new Date(account.expiry).toLocaleDateString("ar-SA")}</span>
          </div>
        )}
      </header>

      {playing && (
        <VideoPlayer url={getStreamUrl(playing.item, playing.tab)} title={playing.item.name} onClose={() => setPlaying(null)} />
      )}

      <nav style={{ background: "rgba(0,0,0,0.4)", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", padding: "0 16px", flexShrink: 0 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "12px 20px", background: tab === t.id ? "rgba(124,58,237,0.1)" : "none", border: "none", borderBottom: `2px solid ${tab === t.id ? "#7c3aed" : "transparent"}`, color: tab === t.id ? "#a78bfa" : "#6b7280", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
            {t.label}
          </button>
        ))}
      </nav>

      <div style={{ flex: 1, overflow: "hidden" }}>
        {tab === "live" && <LiveTab onPlay={(item, t) => setPlaying({ item, tab: t })} />}
        {tab === "movies" && <MoviesTab onPlay={(item, t) => setPlaying({ item, tab: t })} />}
        {tab === "series" && <SeriesTab onPlay={(item, t) => setPlaying({ item, tab: t })} />}
      </div>
    </div>
  );
}
