import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.resolve(__dirname, "../../data/subscriptions.json");
const NOTIF_PATH = path.resolve(__dirname, "../../data/notifications.json");
const ADMIN_KEY = process.env.ADMIN_KEY || "angeltvpro2026";

interface SubscriptionCode {
  code: string;
  username?: string;
  password?: string;
  duration_days: number;
  label: string;
  created_at: string;
  expires_at: string;
  used: boolean;
  activated_at?: string;
  devices: string[];
  device_info: Record<string, string>;
  max_devices: number;
  notes?: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
}

function loadData(): { codes: SubscriptionCode[] } {
  try {
    if (!fs.existsSync(DATA_PATH)) {
      const dir = path.dirname(DATA_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(DATA_PATH, JSON.stringify({ codes: [] }, null, 2));
    }
    const raw = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
    raw.codes = (raw.codes || []).map((c: any) => ({
      devices: [], device_info: {}, max_devices: 3, ...c,
    }));
    return raw;
  } catch {
    return { codes: [] };
  }
}

function saveData(data: { codes: SubscriptionCode[] }) {
  const dir = path.dirname(DATA_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

function loadNotifications(): { notifications: Notification[] } {
  try {
    if (!fs.existsSync(NOTIF_PATH)) {
      fs.writeFileSync(NOTIF_PATH, JSON.stringify({ notifications: [] }, null, 2));
    }
    return JSON.parse(fs.readFileSync(NOTIF_PATH, "utf-8"));
  } catch {
    return { notifications: [] };
  }
}

function saveNotifications(data: { notifications: Notification[] }) {
  const dir = path.dirname(NOTIF_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(NOTIF_PATH, JSON.stringify(data, null, 2));
}

function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const part = (n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `ANGEL-${part(4)}-${part(4)}`;
}

function isExpiredCode(sub: SubscriptionCode): boolean {
  return !!sub.expires_at && new Date(sub.expires_at) < new Date();
}

function subResponse(sub: SubscriptionCode) {
  return {
    valid: true,
    code: sub.code,
    expires_at: sub.expires_at || null,
    label: sub.label,
    is_lifetime: sub.duration_days === 0,
    activated_at: sub.activated_at,
    username: sub.username,
    days_left: sub.expires_at && sub.duration_days !== 0
      ? Math.max(0, Math.ceil((new Date(sub.expires_at).getTime() - Date.now()) / 86400000))
      : null,
  };
}

const router = Router();

/* ── Verify subscription code (first activation) ──────────────── */
router.post("/subscriptions/verify", (req, res) => {
  const { code, device_id, device_name } = req.body;
  if (!code) return res.status(400).json({ valid: false, error: "الكود مطلوب" });

  const data = loadData();
  const sub = data.codes.find(c => c.code === (code as string).trim().toUpperCase());

  if (!sub) return res.json({ valid: false, error: "الكود غير صحيح" });
  if (isExpiredCode(sub)) return res.json({ valid: false, expired: true, error: "انتهت صلاحية الاشتراك" });

  const now = new Date();
  if (!sub.used) {
    sub.used = true;
    sub.activated_at = now.toISOString();
    if (sub.duration_days > 0) {
      const exp = new Date(now);
      exp.setDate(exp.getDate() + sub.duration_days);
      sub.expires_at = exp.toISOString();
    }
  }

  if (device_id && !sub.devices.includes(device_id)) {
    if (sub.devices.length >= sub.max_devices) {
      return res.json({ valid: false, error: `تجاوزت الحد الأقصى (${sub.max_devices} أجهزة)` });
    }
    sub.devices.push(device_id);
    if (device_name) sub.device_info[device_id] = device_name;
  }

  saveData(data);
  return res.json(subResponse(sub));
});

/* ── Login with username/password ─────────────────────────────── */
router.post("/subscriptions/login", (req, res) => {
  const { username, password, device_id, device_name } = req.body;
  if (!username || !password) return res.status(400).json({ valid: false, error: "اسم المستخدم وكلمة المرور مطلوبان" });

  const data = loadData();
  const sub = data.codes.find(c =>
    c.username?.toLowerCase() === (username as string).toLowerCase().trim() &&
    c.password === (password as string).trim()
  );

  if (!sub) return res.json({ valid: false, error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
  if (isExpiredCode(sub)) return res.json({ valid: false, expired: true, error: "انتهت صلاحية الاشتراك" });

  if (!sub.used) {
    sub.used = true;
    sub.activated_at = new Date().toISOString();
    if (sub.duration_days > 0) {
      const exp = new Date();
      exp.setDate(exp.getDate() + sub.duration_days);
      sub.expires_at = exp.toISOString();
    }
  }

  if (device_id && !sub.devices.includes(device_id)) {
    if (sub.devices.length >= sub.max_devices) {
      return res.json({ valid: false, error: `تجاوزت الحد الأقصى (${sub.max_devices} أجهزة)` });
    }
    sub.devices.push(device_id);
    if (device_name) sub.device_info[device_id] = device_name;
  }

  saveData(data);
  return res.json(subResponse(sub));
});

/* ── Check validity of existing subscription ──────────────────── */
router.post("/subscriptions/check", (req, res) => {
  const { code, device_id } = req.body;
  if (!code) return res.json({ valid: false, error: "الكود مطلوب" });

  const data = loadData();
  const sub = data.codes.find(c => c.code === (code as string).trim().toUpperCase());

  if (!sub) return res.json({ valid: false, error: "الكود غير موجود" });
  if (isExpiredCode(sub)) return res.json({ valid: false, expired: true, error: "انتهت صلاحية الاشتراك", expires_at: sub.expires_at });

  if (device_id && !sub.devices.includes(device_id)) {
    if (sub.devices.length < sub.max_devices) {
      sub.devices.push(device_id);
      saveData(data);
    }
  }

  return res.json(subResponse(sub));
});

/* ── Get notifications ────────────────────────────────────────── */
router.get("/notifications", (_req, res) => {
  const data = loadNotifications();
  res.json({ success: true, data: data.notifications.slice(-20).reverse() });
});

/* ── Admin: stats ─────────────────────────────────────────────── */
router.get("/admin/stats", (req, res) => {
  if (req.headers["x-admin-key"] !== ADMIN_KEY) return res.status(401).json({ error: "غير مصرح" });
  const data = loadData();
  const now = new Date();
  const total = data.codes.length;
  const active = data.codes.filter(c => c.used && (c.duration_days === 0 || new Date(c.expires_at) > now)).length;
  const expired = data.codes.filter(c => c.used && c.duration_days !== 0 && new Date(c.expires_at) <= now).length;
  const unused = data.codes.filter(c => !c.used).length;
  const devices = data.codes.reduce((acc, c) => acc + (c.devices?.length || 0), 0);
  const expiringSoon = data.codes.filter(c => {
    if (!c.used || c.duration_days === 0 || !c.expires_at) return false;
    const daysLeft = Math.ceil((new Date(c.expires_at).getTime() - Date.now()) / 86400000);
    return daysLeft >= 0 && daysLeft <= 7;
  }).length;
  res.json({ success: true, data: { total, active, expired, unused, devices, expiringSoon } });
});

/* ── Admin: list codes ────────────────────────────────────────── */
router.get("/admin/subscriptions", (req, res) => {
  if (req.headers["x-admin-key"] !== ADMIN_KEY) return res.status(401).json({ error: "غير مصرح" });
  const data = loadData();
  res.json({ success: true, data: data.codes });
});

/* ── Admin: create code ───────────────────────────────────────── */
router.post("/admin/subscriptions", (req, res) => {
  if (req.headers["x-admin-key"] !== ADMIN_KEY) return res.status(401).json({ error: "غير مصرح" });

  const { duration_days, label, username, password, max_devices, notes } = req.body;
  const data = loadData();

  const code = generateCode();
  const newCode: SubscriptionCode = {
    code,
    duration_days: duration_days ?? 30,
    label: label || (duration_days === 0 ? "مدى الحياة" : `${duration_days} يوم`),
    created_at: new Date().toISOString(),
    expires_at: "",
    used: false,
    devices: [],
    device_info: {},
    max_devices: max_devices ?? 3,
    ...(username ? { username } : {}),
    ...(password ? { password } : {}),
    ...(notes ? { notes } : {}),
  };

  data.codes.push(newCode);
  saveData(data);
  res.json({ success: true, data: newCode });
});

/* ── Admin: extend subscription ───────────────────────────────── */
router.put("/admin/subscriptions/:code/extend", (req, res) => {
  if (req.headers["x-admin-key"] !== ADMIN_KEY) return res.status(401).json({ error: "غير مصرح" });

  const { days } = req.body;
  if (!days || days <= 0) return res.status(400).json({ error: "أيام التمديد مطلوبة" });

  const data = loadData();
  const sub = data.codes.find(c => c.code === req.params.code);
  if (!sub) return res.status(404).json({ error: "الكود غير موجود" });
  if (sub.duration_days === 0) return res.status(400).json({ error: "اشتراك مدى الحياة لا يحتاج تمديد" });

  const base = sub.expires_at && new Date(sub.expires_at) > new Date()
    ? new Date(sub.expires_at)
    : new Date();
  base.setDate(base.getDate() + Number(days));
  sub.expires_at = base.toISOString();

  saveData(data);
  res.json({ success: true, data: sub });
});

/* ── Admin: delete code ───────────────────────────────────────── */
router.delete("/admin/subscriptions/:code", (req, res) => {
  if (req.headers["x-admin-key"] !== ADMIN_KEY) return res.status(401).json({ error: "غير مصرح" });

  const data = loadData();
  const idx = data.codes.findIndex(c => c.code === req.params.code);
  if (idx === -1) return res.status(404).json({ error: "الكود غير موجود" });

  data.codes.splice(idx, 1);
  saveData(data);
  res.json({ success: true });
});

/* ── Admin: export CSV ────────────────────────────────────────── */
router.get("/admin/export", (req, res) => {
  if (req.headers["x-admin-key"] !== ADMIN_KEY) return res.status(401).json({ error: "غير مصرح" });

  const data = loadData();
  const now = new Date();
  const header = "الكود,اسم المستخدم,المدة,الحالة,تاريخ الإنشاء,تاريخ الانتهاء,الأجهزة,الحد الأقصى\n";
  const rows = data.codes.map(c => {
    const expired = c.expires_at && new Date(c.expires_at) < now;
    const status = !c.used ? "غير مفعّل" : expired ? "منتهي" : "فعّال";
    const created = c.created_at ? new Date(c.created_at).toLocaleDateString("ar") : "";
    const expires = c.duration_days === 0 ? "مدى الحياة" : (c.expires_at ? new Date(c.expires_at).toLocaleDateString("ar") : "");
    return `${c.code},${c.username || ""},${c.label},${status},${created},${expires},${c.devices?.length || 0},${c.max_devices}`;
  });

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="angel-tv-subscriptions-${Date.now()}.csv"`);
  res.send("\uFEFF" + header + rows.join("\n"));
});

/* ── Admin: create notification ───────────────────────────────── */
router.post("/admin/notifications", (req, res) => {
  if (req.headers["x-admin-key"] !== ADMIN_KEY) return res.status(401).json({ error: "غير مصرح" });

  const { title, message } = req.body;
  if (!message) return res.status(400).json({ error: "الرسالة مطلوبة" });

  const data = loadNotifications();
  const notif: Notification = {
    id: `n${Date.now()}`,
    title: title || "إشعار من ANGEL TV pro",
    message,
    created_at: new Date().toISOString(),
  };
  data.notifications.push(notif);
  saveNotifications(data);
  res.json({ success: true, data: notif });
});

/* ── Admin: list notifications ────────────────────────────────── */
router.get("/admin/notifications", (req, res) => {
  if (req.headers["x-admin-key"] !== ADMIN_KEY) return res.status(401).json({ error: "غير مصرح" });
  const data = loadNotifications();
  res.json({ success: true, data: data.notifications.reverse() });
});

/* ── Admin: delete notification ───────────────────────────────── */
router.delete("/admin/notifications/:id", (req, res) => {
  if (req.headers["x-admin-key"] !== ADMIN_KEY) return res.status(401).json({ error: "غير مصرح" });
  const data = loadNotifications();
  data.notifications = data.notifications.filter(n => n.id !== req.params.id);
  saveNotifications(data);
  res.json({ success: true });
});

export default router;
