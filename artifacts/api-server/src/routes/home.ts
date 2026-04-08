import { Router } from "express";
import { getVodCategories, getVodStreams, getSeriesCategories, getSeries, getLiveCategories } from "../lib/xtream";

const router = Router();

router.get("/home", async (_req, res) => {
  try {
    const [vodCats, seriesCats, liveCats, allMovies, allSeries] = await Promise.all([
      getVodCategories(),
      getSeriesCategories(),
      getLiveCategories(),
      getVodStreams(undefined) as Promise<any[]>,
      getSeries(undefined) as Promise<any[]>,
    ]);

    const movies = (allMovies || []).slice(0, 30).map((m: any) => ({
      stream_id: m.stream_id,
      name: m.name,
      stream_icon: m.stream_icon,
      cover: m.cover,
      rating: m.rating,
      container_extension: m.container_extension,
      category_id: m.category_id,
      added: m.added,
    }));

    const series = (allSeries || []).slice(0, 30).map((s: any) => ({
      series_id: s.series_id,
      name: s.name,
      stream_icon: s.cover || s.stream_icon,
      cover: s.cover || s.stream_icon,
      rating: s.rating,
      category_id: s.category_id,
    }));

    res.json({
      success: true,
      data: {
        recentMovies: movies,
        recentSeries: series,
        vodCategories: vodCats,
        seriesCategories: seriesCats,
        liveCategories: liveCats,
      },
    });
  } catch (e: unknown) {
    res.status(500).json({ success: false, error: String(e) });
  }
});

export default router;
