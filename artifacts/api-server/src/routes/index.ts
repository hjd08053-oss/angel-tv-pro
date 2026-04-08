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

export default router;
