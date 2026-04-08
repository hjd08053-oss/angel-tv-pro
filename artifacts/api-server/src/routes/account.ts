import { Router } from "express";
import { getAccountInfo, clearCache, XTREAM } from "../lib/xtream";

const router = Router();

router.get("/account", async (req, res) => {
  try {
    const data = await getAccountInfo() as any;
    const expDate = new Date(parseInt(data.user_info.exp_date) * 1000);
    res.json({
      success: true,
      data: {
        username: data.user_info.username,
        status: data.user_info.status,
        expiry: expDate.toISOString(),
        maxConnections: data.user_info.max_connections,
        activeConnections: data.user_info.active_cons,
        isTrial: data.user_info.is_trial === "1",
        outputFormats: data.user_info.allowed_output_formats,
        server: {
          url: data.server_info.url,
          port: data.server_info.port,
          timezone: data.server_info.timezone,
          currentTime: data.server_info.time_now,
        },
      },
    });
  } catch (e: unknown) {
    res.status(500).json({ success: false, error: String(e) });
  }
});

router.post("/cache/clear", (req, res) => {
  clearCache();
  res.json({ success: true, message: "Cache cleared" });
});

export default router;
