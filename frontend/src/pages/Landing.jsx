import { useEffect } from 'react';
import '../styles/landing.css';
import Cursor from '../components/landing/Cursor';
import Navbar from '../components/landing/Navbar';
import Hero from '../components/landing/Hero';
import About from '../components/landing/About';
import Features from '../components/landing/Features';
import Process from '../components/landing/Process';
import Showcase from '../components/landing/Showcase';
import CTA from '../components/landing/CTA';
import Footer from '../components/landing/Footer';

export default function Landing({ onLaunch }) {
  useEffect(() => {
    // Override index.css global overflow:hidden on html + body
    const html = document.documentElement;
    const body = document.body;

    const prevHtmlHeight = html.style.height;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyHeight = body.style.height;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyDisplay = body.style.display;

    html.style.height = 'auto';
    html.style.overflow = 'visible';
    body.style.height = 'auto';
    body.style.overflowX = 'hidden';
    body.style.overflowY = 'auto';
    body.style.display = 'block';

    body.classList.add('landing-active');

    return () => {
      // Restore when leaving landing page
      html.style.height = prevHtmlHeight;
      html.style.overflow = prevHtmlOverflow;
      body.style.height = prevBodyHeight;
      body.style.overflow = prevBodyOverflow;
      body.style.display = prevBodyDisplay;
      body.classList.remove('landing-active');
    };
  }, []);

  return (
    <>
      <Cursor />
      <Navbar onLaunch={onLaunch} />
      <main>
        <Hero onLaunch={onLaunch} />
        <About />
        <Features />
        <Process />
        <Showcase />
        <CTA onLaunch={onLaunch} />
      </main>
      <Footer />
    </>
  );
}

