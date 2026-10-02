import { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { About } from "./components/About";
import { Services } from "./components/Services";
import { Team } from "./components/Team";
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
      } else if (hash === "#inicio" || hash === "#quienes-somos" || hash === "#servicios" || hash === "#equipo" || hash === "#contacto") {
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
      <Navbar onOpenPortal={openPortal} />
      <main>
        <Hero />
        <About />
        <Services />
        <Team />
        <Contact />
      </main>
      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}
