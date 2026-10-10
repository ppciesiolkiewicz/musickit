import type { NextConfig } from "next";

/** Pages that moved under /theory; old links keep working. */
const THEORY_SECTIONS = ["chords", "triads", "scales", "caged", "arpeggios", "improv"];

const nextConfig: NextConfig = {
  async redirects() {
    return THEORY_SECTIONS.flatMap((s) => [
      { source: `/${s}`, destination: `/theory/${s}`, permanent: true },
      { source: `/${s}/:path*`, destination: `/theory/${s}/:path*`, permanent: true },
    ]);
  },
};

export default nextConfig;
