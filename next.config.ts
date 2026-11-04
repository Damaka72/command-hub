import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The tracker API reads data/trackers/*.json at runtime by scanning the folder,
  // which file tracing can't see on its own — so include it explicitly.
  outputFileTracingIncludes: {
    '/api/trackers': ['./data/trackers/**/*.json'],
    '/api/trackers/*': ['./data/trackers/**/*.json'],
  },
};

export default nextConfig;
