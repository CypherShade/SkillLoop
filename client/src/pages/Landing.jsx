import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowRight, ArrowLeftRight, Search, ShieldCheck, Sparkles, UserPlus } from 'lucide-react';
import { Logo } from '../components/Layout';

const steps = [
  { icon: UserPlus, title: 'List what you know', text: 'Add skills you can teach and the ones you want to learn.' },
  { icon: Sparkles, title: 'Get matched', text: 'We find people who teach what you want and want what you teach.' },
  { icon: ArrowLeftRight, title: 'Swap, no money involved', text: 'Send a request, agree on times, and teach each other.' },
];

export default function Landing() {
  const authed = useSelector((s) => s.auth.status === 'authenticated');
  return (
    <div className="landing">
      <header className="container landing-nav">
        <Logo />
        <div className="row">
          {authed ? (
            <Link to="/dashboard" className="btn btn-primary">
              Open dashboard <ArrowRight size={16} />
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">
                Sign in
              </Link>
              <Link to="/register" className="btn btn-primary">
                Join free
              </Link>
            </>
          )}
        </div>
      </header>

      <section className="container hero">
        <div className="hero-copy">
          <span className="eyebrow">Skill exchange · no money involved</span>
          <h1>
            Teach what you know.
            <br />
            <span className="grad">Learn what you love.</span>
          </h1>
          <p className="lead">
            SkillLoop matches you with people who teach what you want to learn and want to learn what you teach. You
            teach guitar, you learn React, and nobody pays anything.
          </p>
          <div className="row">
            <Link to={authed ? '/matches' : '/register'} className="btn btn-primary btn-lg">
              {authed ? 'See my matches' : 'Start swapping'} <ArrowRight size={18} />
            </Link>
            {!authed && (
              <Link to="/login" className="btn btn-ghost btn-lg">
                I have an account
              </Link>
            )}
          </div>
        </div>

        <div className="hero-art" aria-hidden="true">
          <div className="loop-card a">
            <span className="chip">Music</span>
            <strong>Acoustic Guitar</strong>
            <small>Bilal teaches</small>
          </div>
          <div className="loop-ring">
            <ArrowLeftRight size={28} />
          </div>
          <div className="loop-card b">
            <span className="chip">Programming</span>
            <strong>React &amp; Redux</strong>
            <small>Ayesha teaches</small>
          </div>
          <div className="match-pill">
            <Sparkles size={14} /> 100% mutual match
          </div>
        </div>
      </section>

      <section className="container steps">
        {steps.map(({ icon: I, title, text }, i) => (
          <div className="step" key={title}>
            <span className="step-n">0{i + 1}</span>
            <I size={22} aria-hidden="true" />
            <h3>{title}</h3>
            <p className="muted">{text}</p>
          </div>
        ))}
      </section>

      <section className="container trust">
        <div>
          <ShieldCheck size={20} aria-hidden="true" /> Passwords hashed with bcrypt
        </div>
        <div>
          <Search size={20} aria-hidden="true" /> Search across 10+ categories
        </div>
        <div>
          <ArrowLeftRight size={20} aria-hidden="true" /> Swap requests you can track
        </div>
      </section>

      <footer className="container footer muted">
        SkillLoop · DigiHust Full-Stack Internship, Assignment 3 · Muhammad Owais
      </footer>
    </div>
  );
}
