import React from 'react';
import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <main className="min-h-screen relative orchestra-page">
      {/* Background layers */}
      <div className="page-void">
        <div className="page-void-gradient" />
        <div className="page-void-orb-blue" />
        <div className="page-void-orb-purple" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center py-24 px-6">
        <div className="glass-panel content-narrow w-full p-10 text-center">
          <h1 className="text-display mb-8">Orchestra</h1>
          <p className="text-body mb-8">
            Welcome to Orchestra - your AI development environment.
          </p>
          <Link 
            to="/mission-control"
            className="btn-primary inline-block"
          >
            Open Mission Control
          </Link>
        </div>
      </div>
    </main>
  );
}