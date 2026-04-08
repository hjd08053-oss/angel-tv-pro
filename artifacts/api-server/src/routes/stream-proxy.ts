import { Router } from "express";
import http from "http";
import https from "https";
import { URL } from "url";
import { XTREAM } from "../lib/xtream";

const STREAM_BASE = "https://barqtv.art";

const router = Router();

function parseUrl(rawUrl: string) {
  const u = new URL(rawUrl);
  return {
    protocol: u.protocol,
    hostname: u.hostname,
    port: u.port ? parseInt(u.port) : (u.protocol === "https:" ? 443 : 80),
    path: u.pathname + u.search,
    origin: u.origin,
  };
}

/** Follow GET redirects, collect final URL + body (for small m3u8 files) */
function fetchWithRedirects(
  targetUrl: string,
  redirectCount = 0
): Promise<{ url: string; status: number; headers: http.IncomingHttpHeaders; body: Buffer }> {
  return new Promise((resolve, reject) => {
    if (redirectCount > 8) return reject(new Error("Too many redirects"));
    const { protocol, hostname, port, path } = parseUrl(targetUrl);
    const lib = protocol === "https:" ? https : http;
    const req = lib.request(
      {
        hostname, port, path, method: "GET",
        headers: {
          "User-Agent": "VLC/3.0 LibVLC/3.0",
          "Connection": "keep-alive",
        },
      },
      (res) => {
        const loc = res.headers.location;
        if ([301, 302, 307, 308].includes(res.statusCode || 0) && loc) {
          res.resume();
          const next = loc.startsWith("http") ? loc : `${protocol}//${hostname}:${port}${loc}`;
          fetchWithRedirects(next, redirectCount + 1).then(resolve).catch(reject);
        } else {
          const chunks: Buffer[] = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () =>
            resolve({ url: targetUrl, status: res.statusCode || 200, headers: res.headers, body: Buffer.concat(chunks) })
          );
        }
      }
    );
    req.on("error", reject);
    req.end();
  });
}

/** Pipe a stream (following redirects) from targetUrl to the HTTP response */
function pipeStream(req: any, res: any, targetUrl: string, redirectCount = 0) {
  if (redirectCount > 8) return res.status(502).json({ error: "Too many redirects" });
  const { protocol, hostname, port, path } = parseUrl(targetUrl);
  const lib = protocol === "https:" ? https : http;
  const options = {
    hostname, port, path, method: "GET",
    headers: {
      "User-Agent": "VLC/3.0 LibVLC/3.0",
      "Connection": "keep-alive",
      ...(req.headers.range ? { "Range": req.headers.range } : {}),
    },
  };
  const proxyReq = lib.request(options, (proxyRes) => {
    const status = proxyRes.statusCode || 200;
    if ([301, 302, 307, 308].includes(status) && proxyRes.headers.location) {
      proxyRes.resume();
      const loc = proxyRes.headers.location;
      const next = loc.startsWith("http") ? loc : `${protocol}//${hostname}:${port}${loc}`;
      return pipeStream(req, res, next, redirectCount + 1);
    }
    res.status(status);
    res.setHeader("Content-Type", proxyRes.headers["content-type"] || "application/octet-stream");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Accept-Ranges", proxyRes.headers["accept-ranges"] || "bytes");
    if (proxyRes.headers["content-length"]) res.setHeader("Content-Length", proxyRes.headers["content-length"]);
    if (proxyRes.headers["content-range"]) res.setHeader("Content-Range", proxyRes.headers["content-range"]);
    proxyRes.pipe(res);
    req.on("close", () => { proxyReq.destroy(); proxyRes.destroy(); });
  });
  proxyReq.on("error", (e) => { if (!res.headersSent) res.status(502).json({ error: String(e) }); });
  proxyReq.end();
}

/** Rewrite m3u8: resolve relative segment URLs and route through /proxy/segment */
function rewriteM3u8(content: string, cdnBaseUrl: string, serverBase: string): string {
  const cdnOrigin = new URL(cdnBaseUrl).origin;
  return content.split("\n").map(line => {
    const t = line.trim();
    if (!t || t.startsWith("#")) return line;
    let absoluteUrl: string;
    if (t.startsWith("http")) {
      absoluteUrl = t;
    } else if (t.startsWith("/")) {
      absoluteUrl = `${cdnOrigin}${t}`;
    } else {
      const base = cdnBaseUrl.substring(0, cdnBaseUrl.lastIndexOf("/") + 1);
      absoluteUrl = base + t;
    }
    return `${serverBase}/api/proxy/segment?url=${encodeURIComponent(absoluteUrl)}`;
  }).join("\n");
}

/* ─── Live HLS ───────────────────────────────────────────────────────
 *  Flow: barqtv.art (HTTPS) → CDN (HTTP) → m3u8 with relative segments
 *  We follow all redirects, get the m3u8, rewrite segments to go through
 *  our /proxy/segment so the client never touches HTTP directly.
 * ─────────────────────────────────────────────────────────────────── */
router.get("/proxy/live/:streamId", async (req: any, res: any) => {
  const { streamId } = req.params;
  const format = (req.query.format as string) || "m3u8";
  const startUrl = `${STREAM_BASE}/live/${XTREAM.USERNAME}/${XTREAM.PASSWORD}/${streamId}.${format}`;
  try {
    const { url: finalUrl, status, headers, body } = await fetchWithRedirects(startUrl);
    const ct = headers["content-type"] || "";
    const isM3u8 = ct.includes("mpegurl") || format === "m3u8";
    if (status === 404) return res.status(404).json({ error: "Stream not found or offline" });
    if (isM3u8 && body.length > 0) {
      const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
      const host = req.get("host") || "";
      const serverBase = `${proto}://${host}`;
      const rewritten = rewriteM3u8(body.toString("utf8"), finalUrl, serverBase);
      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "no-cache");
      return res.send(rewritten);
    }
    // ts format or fallback — pipe directly
    res.status(status);
    res.setHeader("Content-Type", ct || "video/MP2T");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-cache");
    res.send(body);
  } catch (e: any) {
    if (!res.headersSent) res.status(502).json({ error: String(e) });
  }
});

/* ─── HLS segments ──────────────────────────────────────────────── */
router.get("/proxy/segment", (req, res) => {
  const url = decodeURIComponent((req.query.url as string) || "");
  if (!url) return res.status(400).json({ error: "missing url" });
  pipeStream(req, res, url);
});

/* ─── Movies ────────────────────────────────────────────────────── */
router.get("/proxy/movie/:streamId", (req, res) => {
  const { streamId } = req.params;
  const ext = (req.query.ext as string) || "mp4";
  const startUrl = `${STREAM_BASE}/movie/${XTREAM.USERNAME}/${XTREAM.PASSWORD}/${streamId}.${ext}`;
  pipeStream(req, res, startUrl);
});

/* ─── Series episodes ───────────────────────────────────────────── */
router.get("/proxy/series/:streamId", (req, res) => {
  const { streamId } = req.params;
  const ext = (req.query.ext as string) || "mkv";
  const startUrl = `${STREAM_BASE}/series/${XTREAM.USERNAME}/${XTREAM.PASSWORD}/${streamId}.${ext}`;
  pipeStream(req, res, startUrl);
});

export default router;
