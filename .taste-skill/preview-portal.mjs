import { Browser } from "file:///C:/Users/eldav/.codex/plugins/cache/taste-skill/taste-skill/2.1.1/skills/taste-skill/scripts/lib/cdp.mjs";

const browser = await Browser.launch();
try {
  const page = await browser.newPage({ width: 1440, height: 1000 });
  const appUrl = "http://localhost:3001/?preview=firm#portal";
  await page.goto("http://localhost:3001/", { settleMs: 700 });
  const previewSession = {
    access_token: "preview-session-only",
    token_type: "bearer",
    expires_in: 3600,
    refresh_token: "preview-refresh-only",
    user: {
      id: "00000000-0000-4000-a000-000000000004",
      aud: "authenticated",
      role: "authenticated",
      email: "preview@local.test",
      app_metadata: { provider: "email", providers: ["email"] },
      user_metadata: { full_name: "Abogada de prueba", initials: "AP", role: "firm" },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
  await page.eval((session) => {
    localStorage.setItem("ja_legal_supabase_url", "http://local-preview.invalid");
    localStorage.removeItem("ja_legal_supabase_anon_key");
    localStorage.setItem("ja_legal_session", JSON.stringify(session));
  }, previewSession);
  await page.goto(appUrl, { settleMs: 4500 });
  const view = await page.eval(() => ({
    login: Boolean(document.querySelector(".login-view")),
    title: document.querySelector("h1")?.innerText,
    text: document.body.innerText.slice(0, 1000),
    width: document.documentElement.scrollWidth,
  }));
  await page.screenshot({ path: ".taste-skill/portal-desktop.jpg", quality: 88, fullPage: true });
  await page.setViewport({ width: 390, height: 844, mobile: true });
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await page.screenshot({ path: ".taste-skill/portal-mobile.jpg", quality: 88, fullPage: true });
  console.log(JSON.stringify(view));
} finally {
  await browser.close();
}
