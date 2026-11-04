import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Cpu, Shield, Zap, FileSearch } from 'lucide-react';

const tags = [
  { icon: Zap, label: 'SSE Streaming' },
  { icon: Shield, label: 'JWT Auth' },
  { icon: Cpu, label: 'Docker Sandbox' },
  { icon: FileSearch, label: 'RAG Pipeline' },
];

const terminalOutputs = [
  { type: 'prompt', text: 'user@nexusai:~$' },
  { type: 'cmd', text: 'Ask: "Analyze Q3 report and get current AI market data"' },
  { type: 'output info', text: '── Thinking: I need to search the web and check the RAG index...' },
  { type: 'output tool', text: '⚙  tool_call: web_search("AI market trends Q3 2024")' },
  { type: 'output success', text: '✓  search returned 8 results, synthesizing...' },
  { type: 'output tool', text: '⚙  tool_call: rag_retrieve("Q3 revenue analysis")' },
  { type: 'output success', text: '✓  retrieved 4 relevant passages from report.pdf' },
  { type: 'output info', text: '── Composing final response...' },
  { type: 'output stream', text: 'The AI market grew 38% YoY in Q3, with LLM adoption' },
  { type: 'output stream', text: 'leading at $12.4B in enterprise spend. Cross-referencing' },
  { type: 'output stream', text: 'with your Q3 report: revenue up 24%, aligned with market.' },
  { type: 'prompt-idle', text: '' },
];

export default function Showcase() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="showcase-section" ref={ref} id="showcase">
      {/* left BG accent */}
      <div style={{
        position: 'absolute',
        left: '-200px', top: '50%', transform: 'translateY(-50%)',
        width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(79,110,247,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div className="showcase-inner">
        {/* Left content */}
        <div className="showcase-left">
          <motion.div
            className="section-label"
            initial={{ opacity: 0, x: -20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <div className="section-label-line" />
            Live Demo
          </motion.div>

          <motion.h2
            className="section-title"
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            See every{' '}
            <span className="highlight">thought.</span>
            <br />
            Live.
          </motion.h2>

          <motion.p
            className="showcase-desc"
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            Unlike black-box AI assistants, NexusAI streams its full reasoning — tool
            selections, search queries, retrieved passages, and final synthesis — all in
            real-time. You understand exactly how every answer was built.
          </motion.p>

          <motion.div
            className="showcase-tags"
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            {tags.map((t) => {
              const Icon = t.icon;
              return (
                <div key={t.label} className="showcase-tag">
                  <Icon size={14} />
                  {t.label}
                </div>
              );
            })}
          </motion.div>
        </div>

        {/* Right — Terminal */}
        <motion.div
          className="terminal-wrap"
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="terminal-glow" />
          <div className="terminal">
            <div className="terminal-header">
              <div className="terminal-dot terminal-dot-red" />
              <div className="terminal-dot terminal-dot-yellow" />
              <div className="terminal-dot terminal-dot-green" />
              <span className="terminal-title">nexusai — agent session</span>
            </div>

            <div className="terminal-body">
              {terminalOutputs.map((line, i) => {
                if (line.type === 'prompt-idle') {
                  return (
                    <div className="terminal-line" key={i}>
                      <span className="terminal-prompt">user@nexusai:~$</span>
                      <span className="terminal-cursor" />
                    </div>
                  );
                }
                if (line.type === 'prompt') {
                  return null;
                }
                if (line.type === 'cmd') {
                  return (
                    <div className="terminal-line" key={i}>
                      <span className="terminal-prompt">user@nexusai:~$</span>
                      <span className="terminal-cmd"> {line.text}</span>
                    </div>
                  );
                }
                return (
                  <div className="terminal-line" key={i}>
                    <span className={`terminal-output ${line.type.replace('output ', '')}`}>
                      {line.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
