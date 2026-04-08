import { useState, useEffect } from "react";

const API_BASE = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/api`;
const ADMIN_KEY = "angeltvpro2026";

const DURATIONS = [
  { days: 30, label: "شهر واحد" },
  { days: 90, label: "3 أشهر" },
  { days: 180, label: "6 أشهر" },
  { days: 365, label: "سنة كاملة" },
  { days: 0, label: "مدى الحياة ♾" },
];

const EXTEND_OPTIONS = [7, 14, 30, 90, 180, 365];

interface Sub {
  code: string;
  label: string;
  duration_days: number;
  created_at: string;
  expires_at: string;
  used: boolean;
  activated_at?: string;
  username?: string;
  password?: string;
  devices?: string[];
  device_info?: Record<string, string>;
  max_devices?: number;
  notes?: string;
}

interface Stats {
  total: number;
  active: number;
  expired: number;
  unused: number;
  devices: number;
  expiringSoon: number;
}

interface Notif {
  id: string;
  title: string;
  message: string;
  created_at: string;
}

type ActiveTab = "subs" | "stats" | "notifs";

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("subs");

  if (!authed) {
    return (
      <div style={s.root}>
        <div style={s.loginCard}>
          <div style={s.logo}>ANGEL <span style={{ color: "#f0bf1a" }}>TV pro</span></div>
          <div style={s.loginTitle}>لوحة تحكم الاشتراكات</div>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && password === ADMIN_KEY && setAuthed(true)}
            placeholder="كلمة مرور الإدارة"
            style={s.input}
            dir="rtl"
          />
          <button
            onClick={() => password === ADMIN_KEY ? setAuthed(true) : alert("كلمة المرور غير صحيحة")}
            style={s.loginBtn}
          >
            دخول
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.root} dir="rtl">
      <div style={s.header}>
        <div style={s.logo}>ANGEL <span style={{ color: "#f0bf1a" }}>TV pro</span></div>
        <div style={s.navTabs}>
          {([["subs", "🔑 الاشتراكات"], ["stats", "📊 الإحصائيات"], ["notifs", "🔔 الإشعارات"]] as [ActiveTab, string][]).map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ ...s.navTab, ...(activeTab === tab ? s.navTabActive : {}) }}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={() => setAuthed(false)} style={s.logoutBtn}>خروج</button>
      </div>

      <div style={s.content}>
        {activeTab === "subs" && <SubsTab />}
        {activeTab === "stats" && <StatsTab />}
        {activeTab === "notifs" && <NotifsTab />}
      </div>
    </div>
  );
}

/* ── Subscriptions Tab ─────────────────────────────────────── */
function SubsTab() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [newSub, setNewSub] = useState<Sub | null>(null);
  const [copied, setCopied] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [maxDevices, setMaxDevices] = useState(3);
  const [notes, setNotes] = useState("");
  const [extendCode, setExtendCode] = useState<string | null>(null);
  const [extendDays, setExtendDays] = useState(30);
  const [search, setSearch] = useState("");

  useEffect(() => { loadSubs(); }, []);

  async function loadSubs() {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/admin/subscriptions`, { headers: { "x-admin-key": ADMIN_KEY } });
      const j = await r.json();
      setSubs(j.data || []);
    } catch { alert("تعذر تحميل الاشتراكات"); }
    setLoading(false);
  }

  async function create() {
    setCreating(true);
    setNewSub(null);
    try {
      const dur = DURATIONS.find(d => d.days === selectedDuration);
      const r = await fetch(`${API_BASE}/admin/subscriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY },
        body: JSON.stringify({
          duration_days: selectedDuration,
          label: dur?.label,
          username: username.trim() || undefined,
          password: password.trim() || undefined,
          max_devices: maxDevices,
          notes: notes.trim() || undefined,
        }),
      });
      const j = await r.json();
      if (j.success) { setNewSub(j.data); setUsername(""); setPassword(""); setNotes(""); loadSubs(); }
    } catch { alert("تعذر إنشاء الاشتراك"); }
    setCreating(false);
  }

  async function deleteSub(code: string) {
    if (!confirm(`حذف ${code}؟`)) return;
    await fetch(`${API_BASE}/admin/subscriptions/${code}`, { method: "DELETE", headers: { "x-admin-key": ADMIN_KEY } });
    loadSubs();
  }

  async function extend(code: string, days: number) {
    await fetch(`${API_BASE}/admin/subscriptions/${code}/extend`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY },
      body: JSON.stringify({ days }),
    });
    setExtendCode(null);
    loadSubs();
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(""), 2000);
  }

  function exportCsv() {
    window.open(`${API_BASE}/admin/export`, "_blank");
  }

  const filtered = search
    ? subs.filter(s => s.code.toLowerCase().includes(search.toLowerCase()) || (s.username || "").toLowerCase().includes(search.toLowerCase()))
    : subs;

  const now = new Date();

  return (
    <>
      <div style={s.card}>
        <h2 style={s.cardTitle}>🔑 إنشاء اشتراك جديد</h2>
        <div style={s.durationGrid}>
          {DURATIONS.map(d => (
            <button key={d.days} onClick={() => setSelectedDuration(d.days)}
              style={{ ...s.durBtn, ...(selectedDuration === d.days ? s.durBtnActive : {}) }}>
              {d.label}
            </button>
          ))}
        </div>

        <div style={s.formGrid}>
          <div style={s.formField}>
            <label style={s.formLabel}>اسم المستخدم (اختياري)</label>
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="user123" style={s.formInput} dir="ltr" />
          </div>
          <div style={s.formField}>
            <label style={s.formLabel}>كلمة المرور (اختياري)</label>
            <input value={password} onChange={e => setPassword(e.target.value)} placeholder="pass456" type="password" style={s.formInput} dir="ltr" />
          </div>
          <div style={s.formField}>
            <label style={s.formLabel}>الحد الأقصى للأجهزة</label>
            <select value={maxDevices} onChange={e => setMaxDevices(Number(e.target.value))} style={s.formInput}>
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} أجهزة</option>)}
            </select>
          </div>
          <div style={s.formField}>
            <label style={s.formLabel}>ملاحظات</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="اسم العميل..." style={s.formInput} dir="rtl" />
          </div>
        </div>

        <button onClick={create} disabled={creating} style={s.createBtn}>
          {creating ? "جاري الإنشاء..." : "إنشاء اشتراك"}
        </button>

        {newSub && (
          <div style={s.newCodeBox}>
            <div style={{ color: "#aaa", fontSize: 13 }}>الكود الجديد:</div>
            <div style={s.newCodeValue}>{newSub.code}</div>
            {newSub.username && <div style={{ color: "#888", fontSize: 13 }}>المستخدم: {newSub.username}</div>}
            <button onClick={() => copy(newSub.code)} style={s.copyBtn}>
              {copied === newSub.code ? "✓ تم النسخ" : "نسخ الكود"}
            </button>
          </div>
        )}
      </div>

      <div style={s.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ ...s.cardTitle, margin: 0 }}>📋 الاشتراكات ({subs.length})</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." style={{ ...s.formInput, width: 180 }} dir="rtl" />
            <button onClick={exportCsv} style={s.exportBtn}>⬇ تصدير CSV</button>
            <button onClick={loadSubs} style={s.refreshBtn}>🔄 تحديث</button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#888" }}>جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#555" }}>لا توجد اشتراكات</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={s.table}>
              <thead>
                <tr style={{ color: "#666", fontSize: 13, borderBottom: "1px solid #2a2a18" }}>
                  <th style={s.th}>الكود</th>
                  <th style={s.th}>المستخدم</th>
                  <th style={s.th}>المدة</th>
                  <th style={s.th}>الحالة</th>
                  <th style={s.th}>الانتهاء</th>
                  <th style={s.th}>الأجهزة</th>
                  <th style={s.th}>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(sub => {
                  const expired = sub.expires_at && new Date(sub.expires_at) < now;
                  const status = !sub.used ? "لم يُفعَّل" : expired ? "منتهي" : "فعّال";
                  const statusColor = !sub.used ? "#888" : expired ? "#ef4444" : "#22c55e";
                  const daysLeft = sub.expires_at && !expired ? Math.ceil((new Date(sub.expires_at).getTime() - Date.now()) / 86400000) : null;
                  return (
                    <tr key={sub.code} style={{ borderBottom: "1px solid #1e1e10" }}>
                      <td style={s.td}>
                        <span style={{ fontFamily: "monospace", color: "#f0bf1a", fontWeight: 700, cursor: "pointer" }}
                          onClick={() => copy(sub.code)} title="نسخ">
                          {sub.code} {copied === sub.code && <span style={{ color: "#22c55e" }}>✓</span>}
                        </span>
                        {sub.notes && <div style={{ color: "#666", fontSize: 11 }}>{sub.notes}</div>}
                      </td>
                      <td style={s.td}><span style={{ color: "#ccc", fontFamily: "monospace" }}>{sub.username || "—"}</span></td>
                      <td style={s.td}><span style={{ color: "#ccc" }}>{sub.label}</span></td>
                      <td style={s.td}>
                        <span style={{ color: statusColor, fontWeight: 700 }}>{status}</span>
                        {daysLeft !== null && daysLeft <= 7 && <span style={{ color: "#f59e0b", fontSize: 11, marginRight: 6 }}>⚠ {daysLeft}ي</span>}
                      </td>
                      <td style={s.td}>
                        <span style={{ color: "#888" }}>
                          {sub.duration_days === 0 ? "♾" : sub.expires_at ? fmt(sub.expires_at) : "—"}
                        </span>
                      </td>
                      <td style={s.td}>
                        <span style={{ color: sub.devices && sub.devices.length > 0 ? "#f0bf1a" : "#555" }}>
                          {sub.devices?.length || 0}/{sub.max_devices || 3}
                        </span>
                        {sub.device_info && Object.values(sub.device_info).length > 0 && (
                          <div style={{ color: "#555", fontSize: 10 }}>{Object.values(sub.device_info).join(", ")}</div>
                        )}
                      </td>
                      <td style={s.td}>
                        <div style={{ display: "flex", gap: 6 }}>
                          {sub.duration_days !== 0 && (
                            extendCode === sub.code ? (
                              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                <select value={extendDays} onChange={e => setExtendDays(Number(e.target.value))} style={{ ...s.formInput, width: 90, padding: "4px 6px" }}>
                                  {EXTEND_OPTIONS.map(d => <option key={d} value={d}>{d} يوم</option>)}
                                </select>
                                <button onClick={() => extend(sub.code, extendDays)} style={s.confirmBtn}>✓</button>
                                <button onClick={() => setExtendCode(null)} style={s.cancelBtn}>✕</button>
                              </div>
                            ) : (
                              <button onClick={() => setExtendCode(sub.code)} style={s.extendBtn}>تمديد</button>
                            )
                          )}
                          <button onClick={() => deleteSub(sub.code)} style={s.delBtn}>حذف</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

/* ── Stats Tab ─────────────────────────────────────────────── */
function StatsTab() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/admin/stats`, { headers: { "x-admin-key": ADMIN_KEY } })
      .then(r => r.json())
      .then(j => { setStats(j.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: "center", padding: 60, color: "#888" }}>جاري التحميل...</div>;
  if (!stats) return <div style={{ textAlign: "center", padding: 60, color: "#888" }}>تعذر تحميل الإحصائيات</div>;

  const cards = [
    { label: "إجمالي الاشتراكات", value: stats.total, color: "#f0bf1a", icon: "🔑" },
    { label: "فعّال الآن", value: stats.active, color: "#22c55e", icon: "✅" },
    { label: "منتهي", value: stats.expired, color: "#ef4444", icon: "❌" },
    { label: "لم يُفعَّل بعد", value: stats.unused, color: "#888", icon: "⏳" },
    { label: "الأجهزة المسجّلة", value: stats.devices, color: "#60a5fa", icon: "📱" },
    { label: "تنتهي قريباً", value: stats.expiringSoon, color: "#f59e0b", icon: "⚠" },
  ];

  return (
    <div style={s.card}>
      <h2 style={s.cardTitle}>📊 إحصائيات الاشتراكات</h2>
      <div style={s.statsGrid}>
        {cards.map(c => (
          <div key={c.label} style={s.statCard}>
            <div style={s.statIcon}>{c.icon}</div>
            <div style={{ ...s.statValue, color: c.color }}>{c.value}</div>
            <div style={s.statLabel}>{c.label}</div>
          </div>
        ))}
      </div>
      {stats.expiringSoon > 0 && (
        <div style={s.warningBox}>
          ⚠ يوجد {stats.expiringSoon} اشتراك{stats.expiringSoon > 1 ? "ات" : ""} تنتهي خلال 7 أيام
        </div>
      )}
    </div>
  );
}

/* ── Notifications Tab ─────────────────────────────────────── */
function NotifsTab() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => { loadNotifs(); }, []);

  async function loadNotifs() {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/admin/notifications`, { headers: { "x-admin-key": ADMIN_KEY } });
      const j = await r.json();
      setNotifs(j.data || []);
    } catch {}
    setLoading(false);
  }

  async function send() {
    if (!message.trim()) return alert("الرسالة مطلوبة");
    setSending(true);
    await fetch(`${API_BASE}/admin/notifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY },
      body: JSON.stringify({ title: title.trim() || "إشعار من ANGEL TV pro", message: message.trim() }),
    });
    setTitle(""); setMessage("");
    setSending(false);
    loadNotifs();
  }

  async function deleteNotif(id: string) {
    await fetch(`${API_BASE}/admin/notifications/${id}`, { method: "DELETE", headers: { "x-admin-key": ADMIN_KEY } });
    loadNotifs();
  }

  return (
    <>
      <div style={s.card}>
        <h2 style={s.cardTitle}>🔔 إرسال إشعار لجميع المستخدمين</h2>
        <div style={s.formGrid}>
          <div style={s.formField}>
            <label style={s.formLabel}>عنوان الإشعار (اختياري)</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="إشعار مهم..." style={s.formInput} dir="rtl" />
          </div>
          <div style={{ ...s.formField, gridColumn: "1 / -1" }}>
            <label style={s.formLabel}>نص الرسالة</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="اكتب رسالتك هنا..." style={{ ...s.formInput, height: 80, resize: "vertical" } as any} dir="rtl" />
          </div>
        </div>
        <button onClick={send} disabled={sending || !message.trim()} style={s.createBtn}>
          {sending ? "جاري الإرسال..." : "📤 إرسال للجميع"}
        </button>
      </div>

      <div style={s.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ ...s.cardTitle, margin: 0 }}>الإشعارات المرسلة ({notifs.length})</h2>
          <button onClick={loadNotifs} style={s.refreshBtn}>🔄 تحديث</button>
        </div>
        {loading ? (
          <div style={{ textAlign: "center", padding: 30, color: "#888" }}>جاري التحميل...</div>
        ) : notifs.length === 0 ? (
          <div style={{ textAlign: "center", padding: 30, color: "#555" }}>لا توجد إشعارات</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {notifs.map(n => (
              <div key={n.id} style={s.notifRow}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#f0bf1a", fontWeight: 700, marginBottom: 4 }}>{n.title}</div>
                  <div style={{ color: "#ccc", fontSize: 14 }}>{n.message}</div>
                  <div style={{ color: "#555", fontSize: 12, marginTop: 4 }}>{fmt(n.created_at)}</div>
                </div>
                <button onClick={() => deleteNotif(n.id)} style={s.delBtn}>حذف</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function fmt(dt: string) {
  if (!dt) return "—";
  const d = new Date(dt);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

const s: Record<string, React.CSSProperties> = {
  root: { minHeight: "100vh", backgroundColor: "#111108", color: "#fff", fontFamily: "system-ui, -apple-system, sans-serif" },
  loginCard: {
    position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
    backgroundColor: "#1a1a0d", borderRadius: 16, padding: 48,
    display: "flex", flexDirection: "column", gap: 18, alignItems: "center",
    border: "1px solid #2a2a18", minWidth: 340,
  },
  loginTitle: { color: "#aaa", fontSize: 16 },
  loginBtn: { backgroundColor: "#f0bf1a", color: "#111", border: "none", borderRadius: 10, padding: "14px 40px", fontSize: 16, fontWeight: 900, cursor: "pointer", width: "100%" },

  header: { display: "flex", alignItems: "center", gap: 20, padding: "14px 28px", backgroundColor: "#0d0d06", borderBottom: "1px solid #2a2a18" },
  logo: { fontSize: 20, fontWeight: 900, letterSpacing: 1, flexShrink: 0 },
  navTabs: { display: "flex", gap: 6, flex: 1, justifyContent: "center" },
  navTab: { background: "#1a1a0d", color: "#888", border: "2px solid #2a2a18", borderRadius: 8, padding: "8px 20px", cursor: "pointer", fontSize: 14, fontWeight: 600, transition: "all 0.2s" },
  navTabActive: { backgroundColor: "#f0bf1a", color: "#111", borderColor: "#f0bf1a" },
  logoutBtn: { backgroundColor: "#1a1a0d", color: "#aaa", border: "1px solid #2a2a18", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 14 },

  content: { maxWidth: 1100, margin: "0 auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 24 },
  card: { backgroundColor: "#1a1a0d", borderRadius: 14, padding: 28, border: "1px solid #2a2a18" },
  cardTitle: { margin: "0 0 20px 0", fontSize: 18, fontWeight: 800, color: "#fff" },

  durationGrid: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 },
  durBtn: { padding: "10px 20px", borderRadius: 8, border: "2px solid #2a2a18", backgroundColor: "#111108", color: "#aaa", cursor: "pointer", fontSize: 14, fontWeight: 600 },
  durBtnActive: { backgroundColor: "#f0bf1a", color: "#111", borderColor: "#f0bf1a" },

  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 },
  formField: { display: "flex", flexDirection: "column", gap: 6 },
  formLabel: { color: "#888", fontSize: 13, fontWeight: 600 },
  formInput: { backgroundColor: "#111108", color: "#fff", border: "1px solid #2a2a18", borderRadius: 8, padding: "10px 12px", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" as const },

  createBtn: { backgroundColor: "#f0bf1a", color: "#111", border: "none", borderRadius: 10, padding: "14px 36px", fontSize: 16, fontWeight: 900, cursor: "pointer", width: "100%" },
  newCodeBox: { marginTop: 20, backgroundColor: "#111108", borderRadius: 10, padding: 20, border: "2px solid #f0bf1a", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 },
  newCodeValue: { color: "#f0bf1a", fontSize: 26, fontWeight: 900, fontFamily: "monospace", letterSpacing: 3 },
  copyBtn: { backgroundColor: "#252515", color: "#f0bf1a", border: "1px solid #f0bf1a", borderRadius: 8, padding: "8px 20px", cursor: "pointer", fontWeight: 700, fontSize: 14 },

  exportBtn: { backgroundColor: "#1a2a1a", color: "#4ade80", border: "1px solid #2a5a2a", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13 },
  refreshBtn: { backgroundColor: "#252515", color: "#aaa", border: "1px solid #2a2a18", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13 },

  table: { width: "100%", borderCollapse: "collapse" as const },
  th: { padding: "8px 12px", textAlign: "right", fontWeight: 600, color: "#666", fontSize: 13, borderBottom: "1px solid #2a2a18", whiteSpace: "nowrap" as const },
  td: { padding: "12px 12px", textAlign: "right", verticalAlign: "middle", borderBottom: "1px solid #1a1a0d", fontSize: 14 },

  extendBtn: { backgroundColor: "rgba(96,165,250,0.12)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.3)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 },
  confirmBtn: { backgroundColor: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 12 },
  cancelBtn: { backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 12 },
  delBtn: { backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 },

  statsGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 },
  statCard: { backgroundColor: "#111108", borderRadius: 12, padding: 24, textAlign: "center", border: "1px solid #2a2a18" },
  statIcon: { fontSize: 32, marginBottom: 8 },
  statValue: { fontSize: 42, fontWeight: 900, lineHeight: 1 },
  statLabel: { color: "#888", fontSize: 14, marginTop: 8 },
  warningBox: { backgroundColor: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 8, padding: 14, color: "#fbbf24", textAlign: "center", fontSize: 14 },

  notifRow: { backgroundColor: "#111108", borderRadius: 10, padding: 16, display: "flex", gap: 14, alignItems: "center", border: "1px solid #2a2a18" },

  input: { width: "100%", backgroundColor: "#111108", color: "#fff", border: "2px solid #2a2a18", borderRadius: 10, padding: "14px 16px", fontSize: 16, textAlign: "center", outline: "none", boxSizing: "border-box" as const },
};
