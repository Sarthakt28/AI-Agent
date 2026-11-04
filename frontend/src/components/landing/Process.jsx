import { useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    num: '01',
    title: 'Authenticate',
    desc: 'Sign up or log in with JWT-secured credentials. Your session is protected with token-based auth and refreshed seamlessly.',
  },
  {
    num: '02',
    title: 'Provide Context',
    desc: 'Optionally upload PDF, DOCX, or TXT documents. The RAG pipeline chunks, embeds, and indexes them in ChromaDB instantly.',
  },
  {
    num: '03',
    title: 'Send a Message',
    desc: 'Ask anything. The LangGraph ReAct agent parses your intent, selects the best tools, and begins its reasoning cycle.',
  },
  {
    num: '04',
    title: 'Watch It Think',
    desc: 'Every thought, tool call, and intermediate result streams live over SSE — token by token, thought by thought, in real-time.',
  },
  {
    num: '05',
    title: 'Get Answers',
    desc: 'Receive a final, grounded response synthesized from web data, your documents, or computed Python results — with full transparency.',
  },
];

export default function Process() {
  const sectionRef = useRef(null);
  const progressRef = useRef(null);
  const dotsRef = useRef([]);
  const inView = useInView(sectionRef, { once: true, margin: '-100px' });

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        progressRef.current,
        { scaleY: 0 },
        {
          scaleY: 1,
          transformOrigin: 'top center',
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 70%',
            end: 'bottom 60%',
            scrub: 0.5,
          },
        }
      );

      dotsRef.current.forEach((dot, i) => {
        if (!dot) return;
        ScrollTrigger.create({
          trigger: dot,
          start: 'top 65%',
          onEnter: () => dot.classList.add('active'),
        });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section className="process-section" ref={sectionRef} id="process">
      {/* BG accent */}
      <div style={{
        position: 'absolute',
        right: '-200px', top: '50%', transform: 'translateY(-50%)',
        width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div className="process-inner">
        <div className="process-header">
          <motion.div
            className="section-label"
            style={{ justifyContent: 'center' }}
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <div className="section-label-line" />
            How It Works
            <div className="section-label-line" />
          </motion.div>

          <motion.h2
            className="section-title"
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            From prompt to{' '}
            <span className="highlight">precision</span>
          </motion.h2>
        </div>

        <div className="timeline">
          <div className="timeline-track" />
          <div className="timeline-progress" ref={progressRef} />

          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              className="timeline-step"
              initial={{ opacity: 0, x: -20 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 + i * 0.1 }}
            >
              <div
                className="timeline-dot"
                ref={(el) => (dotsRef.current[i] = el)}
              >
                <div className="timeline-dot-inner" />
              </div>
              <div className="step-number">{step.num}</div>
              <div className="step-title">{step.title}</div>
              <p className="step-desc">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
