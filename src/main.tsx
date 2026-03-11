import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

function loadScript(src: string, type: "module" | "classic" = "classic"): Promise<void> {
  const existing = document.querySelector<HTMLScriptElement>(`script[data-src="${src}"]`);
  if (existing) {
    if (existing.dataset.loaded === "true") return Promise.resolve();
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), {
        once: true,
      });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.dataset.src = src;
    if (type === "module") {
      script.type = "module";
    }
    script.src = src;
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve();
      },
      { once: true }
    );
    script.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), {
      once: true,
    });
    document.head.appendChild(script);
  });
}

async function bootstrap() {
  const base = import.meta.env.BASE_URL;

  try {
    await loadScript(`${base}piper/dist/ort.min.js`);
    await loadScript(`${base}piper/piper-global-loader.js`, "module");
  } catch (error) {
    console.warn("Failed to preload piper assets:", error);
  }

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

void bootstrap();
