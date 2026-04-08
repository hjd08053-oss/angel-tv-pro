import { Router, type IRouter } from "express";
import path from "path";
import fs from "fs";
import healthRouter from "./health";
import accountRouter from "./account";
import homeRouter from "./home";
import liveRouter from "./live";
import vodRouter from "./vod";
import seriesRouter from "./series";
import streamProxyRouter from "./stream-proxy";
import subscriptionRouter from "./subscription";

const router: IRouter = Router();

router.use(healthRouter);
router.use(accountRouter);
router.use(homeRouter);
router.use(liveRouter);
router.use(vodRouter);
router.use(seriesRouter);
router.use(streamProxyRouter);
router.use(subscriptionRouter);

router.get("/apk", (_req, res) => {
  const apkPath = path.resolve("../iptv-app/public/iptv-tv.apk");
  if (!fs.existsSync(apkPath)) {
    return res.status(404).json({ error: "APK not found" });
  }
  res.setHeader("Content-Type", "application/vnd.android.package-archive");
  res.setHeader("Content-Disposition", "attachment; filename=IPTV-Pro-TV.apk");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.sendFile(apkPath);
});

router.get("/eas-build-status", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const buildId = (req.query.buildId as string) || "2e9d7319-6797-40cb-a4a8-eeb19b36faa9";
  try {
    const stateFile = `${process.env.HOME}/.expo/state.json`;
    let token = "";
    if (fs.existsSync(stateFile)) {
      const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
      token = state?.auth?.sessionSecret || "";
    }
    const resp = await fetch(
      `https://api.expo.dev/v2/builds/${buildId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "expo-client-info": JSON.stringify({ clientType: "eas-cli" }),
        },
      }
    );
    if (!resp.ok) {
      return res.json({ status: "UNKNOWN", apkUrl: null });
    }
    const j = (await resp.json()) as any;
    const status = j?.data?.status || "UNKNOWN";
    const apkUrl = j?.data?.artifacts?.buildUrl || null;
    return res.json({ status, apkUrl, buildId });
  } catch {
    return res.json({ status: "UNKNOWN", apkUrl: null });
  }
});

export default router;
