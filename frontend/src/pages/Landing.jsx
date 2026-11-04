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
    document.body.classList.add('landing-active');
    return () => document.body.classList.remove('landing-active');
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
