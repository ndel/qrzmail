import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: path.join(__dirname),
  },
  // This app runs at qrzmail.com/marketing via reverse proxy
  basePath: "/marketing",
  // Allow the app to be served under a sub-path
  assetPrefix: "/marketing",
};

export default nextConfig;
