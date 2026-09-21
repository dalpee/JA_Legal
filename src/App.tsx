import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { About } from "./components/About";
import { Services } from "./components/Services";
import { Team } from "./components/Team";
import { Contact } from "./components/Contact";
import { Footer } from "./components/Footer";
import { ClientPortal } from "./components/ClientPortal";
import "./App.css";

function App() {
  const isPortal = window.location.pathname === "/portal";

  if (isPortal) {
    return <ClientPortal />;
  }

  return (
    <>
      <Navbar />
      <Hero />
      <About />
      <Services />
      <Team />
      <Contact />
      <Footer />
    </>
  );
}

export default App;