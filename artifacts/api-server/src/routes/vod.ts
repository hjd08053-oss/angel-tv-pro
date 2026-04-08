import { Router } from "express";
import {
  getVodCategories,
  getVodStreams,
  getVodInfo,
  getVodStreamUrl,
} from "../lib/xtream";

const router = Router();

router.get("/vod/categories", async (req, res) => {
  try {
    const data = await getVodCategories();
    res.json({ success: true, data });
  } catch (e: unknown) {
    res.status(500).json({ success: false, error: String(e) });
  }
});

router.get("/vod/streams", async (req, res) => {
  try {
    const { category_id, search, limit, offset } = req.query;
    let data = (await getVodStreams(category_id as string | undefined)) as any[];

    if (search) {
      const q = (search as string).toLowerCase();
      data = data.filter((m: any) => m.name?.toLowerCase().includes(q));
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

router.get("/vod/info/:vodId", async (req, res) => {
  try {
    const data = await getVodInfo(req.params.vodId);
    res.json({ success: true, data });
  } catch (e: unknown) {
    res.status(500).json({ success: false, error: String(e) });
  }
});

router.get("/vod/url/:streamId", (req, res) => {
  const { streamId } = req.params;
  const ext = (req.query.ext as string) || "mp4";
  const url = getVodStreamUrl(streamId, ext);
  res.json({ success: true, url });
});

router.get("/vod/play/:streamId", (req, res) => {
  const { streamId } = req.params;
  const ext = (req.query.ext as string) || "mp4";
  const url = getVodStreamUrl(streamId, ext);
  res.redirect(url);
});

export default router;
