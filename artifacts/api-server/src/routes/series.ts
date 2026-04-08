import { Router } from "express";
import {
  getSeriesCategories,
  getSeries,
  getSeriesInfo,
  getSeriesStreamUrl,
} from "../lib/xtream";

const router = Router();

router.get("/series/categories", async (req, res) => {
  try {
    const data = await getSeriesCategories();
    res.json({ success: true, data });
  } catch (e: unknown) {
    res.status(500).json({ success: false, error: String(e) });
  }
});

router.get("/series/list", async (req, res) => {
  try {
    const { category_id, search, limit, offset } = req.query;
    let data = (await getSeries(category_id as string | undefined)) as any[];

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

router.get("/series/info/:seriesId", async (req, res) => {
  try {
    const data = await getSeriesInfo(req.params.seriesId) as any;
    res.json({ success: true, data });
  } catch (e: unknown) {
    res.status(500).json({ success: false, error: String(e) });
  }
});

router.get("/series/episodes/:seriesId", async (req, res) => {
  try {
    const data = await getSeriesInfo(req.params.seriesId) as any;
    const episodes: any[] = [];
    const seasons = data?.episodes || {};
    for (const season of Object.keys(seasons)) {
      for (const ep of seasons[season]) {
        episodes.push({ ...ep, season_number: season });
      }
    }
    res.json({ success: true, total: episodes.length, data: episodes });
  } catch (e: unknown) {
    res.status(500).json({ success: false, error: String(e) });
  }
});

router.get("/series/url/:streamId", (req, res) => {
  const { streamId } = req.params;
  const ext = (req.query.ext as string) || "mkv";
  const url = getSeriesStreamUrl(streamId, ext);
  res.json({ success: true, url });
});

router.get("/series/play/:streamId", (req, res) => {
  const { streamId } = req.params;
  const ext = (req.query.ext as string) || "mkv";
  const url = getSeriesStreamUrl(streamId, ext);
  res.redirect(url);
});

export default router;
