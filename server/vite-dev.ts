import express, { type Express } from "express";
import path from "path";
import { type Server } from "http";
import { nanoid } from "nanoid";
import fs from "fs";
// Note: vite imports are done inside functions to avoid dependency in production builds

export async function setupVite(app: Express, server: Server) {
  // Dynamically import vite only when needed (development mode)
  // Using Function constructor to create a truly dynamic import that esbuild can't analyze
  const viteModule = await new Function("path", "return import(path)")("vite");
  const { createServer: createViteServer, createLogger } = viteModule;
  const viteConfig = await import("../vite.config");
  const viteLogger = createLogger();
  
  const serverOptions = {
    middlewareMode: true,
    // Completely disable HMR to stop reload loops
    hmr: false,
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig.default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        console.log('[Vite Error]', msg, options);
        viteLogger.error(msg, options);
        // Don't exit on error - let it continue to debug
        // process.exit(1);
      },
    },
    server: {
      ...serverOptions,
      // Re-enable file watching (removed watch: null)
      hmr: false, // Keep HMR disabled to prevent potential loops, use full reload
    },
    appType: "custom",
  });
  
  // #region agent log
  // Completely disable Vite WebSocket to prevent reload messages
  if (vite.ws) {
    // Close the WebSocket server to prevent any HMR/reload messages
    vite.ws.close();
    console.log('[Vite] WebSocket server closed to prevent reload loops');
  }
  // #endregion

  app.use(vite.middlewares);
  
  // #region agent log
  // Test route to bypass Vite - register BEFORE vite.middlewares
  app.get("/test-simple.html", async (req, res) => {
    const testFile = path.resolve(import.meta.dirname, "..", "client", "test-simple.html");
    try {
      const content = await fs.promises.readFile(testFile, "utf-8");
      res.status(200).set({ "Content-Type": "text/html" }).end(content);
    } catch (error) {
      console.error("[Test Route] Error:", error);
      res.status(500).json({ error: "Failed to load test file" });
    }
  });
  // #endregion
  
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    
    // #region agent log
    console.log('[Vite] Request:', url);
    // #endregion

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      // Remove the nanoid() call that was causing Vite to detect changes and reload
      // Vite handles cache busting automatically
      let page = await vite.transformIndexHtml(url, template);
      
      // Remove HMR client script injection to prevent connection attempts
      // This prevents ERR_CONNECTION_REFUSED errors when HMR is disabled
      // Vite injects <script type="module">import '/@vite/client'</script> which tries to connect
      page = page.replace(/<script[^>]*>[\s\S]*?\/@vite\/client[\s\S]*?<\/script>/gi, '');
      
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

