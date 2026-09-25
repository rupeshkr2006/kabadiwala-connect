import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.kabadiwalaconnect.app",
  appName: "Kabadiwala Connect",
  webDir: "www",
  server: {
    url: "https://kabadiwala-connect-rupesh-95d6.vercel.app",
    cleartext: false,
    allowNavigation: [
      "kabadiwala-connect-rupesh-95d6.vercel.app"
    ]
  }
};

export default config;
