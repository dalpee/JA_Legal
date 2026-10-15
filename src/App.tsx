import { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { TrustBar } from "./components/TrustBar";
import { About } from "./components/About";
import { Services } from "./components/Services";
import { Team } from "./components/Team";
import { FAQ } from "./components/FAQ";
import { Contact } from "./components/Contact";
import { Footer } from "./components/Footer";
import { FloatingWhatsApp } from "./components/FloatingWhatsApp";
import { ClientPortal } from "./components/ClientPortal";
import "./App.css";

export default function App() {
  const [currentView, setCurrentView] = useState<"site" | "portal">(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      if (hash === "#portal" || path.startsWith("/portal")) {
        return "portal";
      }
    }
    return "site";
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === "#portal") {
        setCurrentView("portal");
      } else if (hash === "#inicio" || hash === "#quienes-somos" || hash === "#servicios" || hash === "#equipo" || hash === "#faq" || hash === "#contacto") {
        setCurrentView("site");
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const openPortal = () => {
    setCurrentView("portal");
    window.location.hash = "#portal";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const backToSite = () => {
    setCurrentView("site");
    window.location.hash = "#inicio";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (currentView === "portal") {
    return <ClientPortal onBackToSite={backToSite} />;
  }

  return (
    <div className="site-wrapper">
      {/* Barra superior de acceso directo al Portal de Clientes & Despacho */}
      <div
        style={{
          background: "linear-gradient(90deg, #0b1324 0%, #1e293b 50%, #0f172a 100%)",
          borderBottom: "1px solid var(--brass)",
          padding: "8px 16px",
          color: "#f8fafc",
          fontSize: "0.82rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          zIndex: 1000,
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "1.1rem" }}>🏛️</span>
          <span>
            <strong>Portal de Clientes &amp; Despacho J&amp;A:</strong> Acceso para <strong>David Pérez</strong>, <strong>Dr. Marlon Jiménez</strong>, <strong>Dr. Sebastián Ariza</strong> y Clientes.
          </span>
        </div>
        <button
          type="button"
          onClick={openPortal}
          style={{
            background: "var(--brass)",
            color: "var(--ink)",
            fontWeight: 700,
            border: "none",
            padding: "6px 16px",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "0.78rem",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
        >
          <span>🔑 Entrar al Despacho / Portal →</span>
        </button>
      </div>

      <Navbar onOpenPortal={openPortal} />
      <main>
        <Hero />
        <TrustBar />
        <About />
        <Services />
        <Team />
        <FAQ />
        <Contact />
      </main>
      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}
