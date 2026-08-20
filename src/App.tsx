import "./App.css";
import { About } from "./components/About";
import { Contact } from "./components/Contact";
import { FloatingWhatsApp } from "./components/FloatingWhatsApp";
import { Footer } from "./components/Footer";
import { Hero } from "./components/Hero";
import { Navbar } from "./components/Navbar";
import { Services } from "./components/Services";
import { Team } from "./components/Team";

function App() {
  return (
    <>
      <Navbar />

      <main>
        <Hero />
        <About />
        <Services />
        <Team />
        <Contact />
      </main>

      <Footer />
      <FloatingWhatsApp />
    </>
  );
}

export default App;
