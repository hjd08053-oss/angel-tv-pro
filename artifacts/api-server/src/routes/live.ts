import { Router } from "express";
import {
  getLiveCategories,
  getLiveStreams,
  getLiveStreamUrl,
} from "../lib/xtream";

const router = Router();

router.get("/live/categories", async (req, res) => {
  try {
    const data = await getLiveCategories();
    res.json({ success: true, data });
  } catch (e: unknown) {
    res.status(500).json({ success: false, error: String(e) });
  }
});

router.get("/live/streams", async (req, res) => {
  try {
    const { category_id, search, limit, offset } = req.query;
    let data = (await getLiveStreams(category_id as string | undefined)) as any[];

    if (search) {
      const q = (search as string).toLowerCase();
      data = data.filter((s: any) => s.name?.toLowerCase().includes(q));
    }

    const total = data.length;
    const off = parseInt(offset as string) || 0;
    const lim = limit ? parseInt(limit as string) : total;
    const paginated = data.slice(off, off + lim);

    res.json({ success: true, total, offset: off, limit: lim, data: paginated });
  } catch (e: unknown) {
    res.status(500).json({ success: false, error: String(e) });
  }
});

router.get("/live/url/:streamId", (req, res) => {
  const { streamId } = req.params;
  const format = (req.query.format as "m3u8" | "ts") || "m3u8";
  const url = getLiveStreamUrl(streamId, format);
  res.json({ success: true, url });
});

router.get("/live/play/:streamId", (req, res) => {
  const { streamId } = req.params;
  const format = (req.query.format as "m3u8" | "ts") || "m3u8";
  const url = getLiveStreamUrl(streamId, format);
  res.redirect(url);
});

export default router;
