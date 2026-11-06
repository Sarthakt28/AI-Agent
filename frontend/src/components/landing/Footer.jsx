import { GitFork, ExternalLink, Zap } from 'lucide-react';

const footerLinks = {
  Product: ['Features', 'How It Works', 'Demo', 'Changelog'],
  Docs: ['Getting Started', 'API Reference', 'Architecture', 'Self-hosting'],
  Legal: ['Privacy', 'Terms', 'Security'],
};

export default function Footer() {
  return (
    <footer className="landing-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="footer-logo">
            <div className="nav-logo-icon">
              <Zap size={16} color="white" fill="white" />
            </div>
            Nexus AI
          </div>
          <p className="footer-tagline">
            A production-grade autonomous AI agent platform built on LangGraph, Gemini, and FastAPI.
          </p>
        </div>

        {Object.entries(footerLinks).map(([title, links]) => (
          <div key={title}>
            <div className="footer-col-title">{title}</div>
            <ul className="footer-links">
              {links.map((link) => (
                <li key={link}>
                  <a href="#">{link}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="footer-bottom">
        <p className="footer-copy">
          © {new Date().getFullYear()} Nexus AI. Built with LangGraph + Gemini 2.5 Flash.
        </p>
        <div className="footer-social">
          <a href="https://github.com/Sarthakt28/AI-Agent" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
            <GitFork size={16} />
          </a>
          <a href="#" aria-label="Share">
            <ExternalLink size={16} />
          </a>
        </div>
      </div>
    </footer>
  );
}
