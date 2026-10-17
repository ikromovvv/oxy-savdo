/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
  // Ba'zi brauzerlar/botlar /favicon.ico ni so'raydi — ikonka SVG (app/icon.svg)
  async redirects() {
    return [{ source: '/favicon.ico', destination: '/icon.svg', permanent: false }];
  },
};

export default nextConfig;
