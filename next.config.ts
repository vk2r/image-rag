import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Evitar que Next intente empaquetar pdfjs-dist en el runtime del servidor
  serverExternalPackages: ["pdfjs-dist"],
};

export default nextConfig;
