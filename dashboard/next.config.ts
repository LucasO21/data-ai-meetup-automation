import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack(config: {
    resolve: {
      extensionAlias?: Record<string, string[]>;
      alias?: Record<string, string>;
      modules?: string[];
    };
  }) {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".js"],
      ".jsx": [".tsx", ".jsx"],
    };
    config.resolve.alias = {
      ...config.resolve.alias,
      "@backend": path.resolve(__dirname, "../src"),
    };
    // Ensure modules from outside dashboard/ resolve against dashboard/node_modules
    config.resolve.modules = [
      path.resolve(__dirname, "node_modules"),
      "node_modules",
    ];
    return config;
  },
};

export default nextConfig;
