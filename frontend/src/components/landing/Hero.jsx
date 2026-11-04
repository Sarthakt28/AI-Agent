import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';

function GridCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let w, h, particles, animId, mouse = { x: -1000, y: -1000 };

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };

    const initParticles = () => {
      particles = [];
      const count = Math.floor((w * h) / 12000);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          r: Math.random() * 1.5 + 0.5,
          alpha: Math.random() * 0.4 + 0.1,
        });
      }
    };

    const drawGrid = () => {
      const step = 60;
      ctx.strokeStyle = 'rgba(79,110,247,0.04)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      drawGrid();

      // Particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        // Mouse repel
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          p.x += (dx / dist) * 1.5;
          p.y += (dy / dist) * 1.5;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(79,110,247,${p.alpha})`;
        ctx.fill();
      });

      // Connect close particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(79,110,247,${0.08 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    };

    const onMouse = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };

    resize();
    initParticles();
    draw();
    window.addEventListener('resize', () => { resize(); initParticles(); });
    window.addEventListener('mousemove', onMouse);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouse);
    };
  }, []);

  return <canvas ref={canvasRef} className="hero-canvas" />;
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

export default function Hero({ onLaunch }) {
  const heroRef = useRef(null);

  // Parallax on mouse move
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const onMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      el.style.backgroundPosition = `${50 + x * 0.1}% ${50 + y * 0.1}%`;
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <section className="hero-section" ref={heroRef} id="hero">
      <GridCanvas />
      <div className="hero-noise" />

      {/* Radial gradient center glow */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(79,110,247,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <motion.div
        className="hero-content"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="hero-badge" variants={itemVariants}>
          <span className="hero-badge-dot" />
          Powered by Gemini 2.5 Flash · LangGraph ReAct
        </motion.div>

        <motion.h1 className="hero-headline" variants={itemVariants}>
          Your AI Agent,
          <br />
          <span className="highlight">Fully Autonomous</span>
          <br />
          <span className="outline-text">Fully Yours</span>
        </motion.h1>

        <motion.p className="hero-subtext" variants={itemVariants}>
          A production-grade AI agent platform with real-time streaming, RAG-powered document understanding,
          secure Python execution, and tool-augmented reasoning.
        </motion.p>

        <motion.div className="hero-actions" variants={itemVariants}>
          <a
            className="btn-primary"
            href="#"
            onClick={(e) => { e.preventDefault(); onLaunch(); }}
          >
            Start for free
            <ArrowRight size={16} />
          </a>
          <a
            className="btn-secondary"
            href="#showcase"
            onClick={(e) => { e.preventDefault(); document.querySelector('#showcase')?.scrollIntoView({ behavior: 'smooth' }); }}
          >
            <Play size={15} />
            Watch demo
          </a>
        </motion.div>
      </motion.div>

      <div className="hero-scroll-hint">
        <div className="scroll-line" />
        <span>Scroll</span>
      </div>
    </section>
  );
}
