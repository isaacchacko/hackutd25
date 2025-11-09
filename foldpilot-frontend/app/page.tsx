'use client';

import Link from 'next/link';
import { Dna, Sparkles, Brain, BookOpen, FileText, ArrowRight, Zap } from 'lucide-react';
import Squares from '@/components/Squares';



export default function Home() {
  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Analysis',
      description: 'Advanced AI agents work together to extract insights from protein structures and literature.',
    },
    {
      icon: Dna,
      title: 'Structure Analysis',
      description: 'Get detailed protein structure information with quality metrics and confidence scores.',
    },
    {
      icon: BookOpen,
      title: 'Literature Search',
      description: 'Automatically search and summarize relevant research papers from PubMed.',
    },
    {
      icon: FileText,
      title: 'Comprehensive Reports',
      description: 'Receive detailed analysis reports with mutations, binding sites, and synthesis.',
    },
  ];

  const exampleQueries = [
    'Analyze human p53',
    'Find drug targets in SARS-CoV-2 spike',
    'Effects of R273H mutation on p53',
    'Analyze hemoglobin',
  ];

  return (
    <main className="min-h-screen bg-white text-black">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 max-w-6xl">
        <div className="text-center mb-16 animate-fade-in-up">
          <div className="flex items-center justify-center gap-4 mb-6">
            <Dna className="w-16 h-16 text-black" />
            <h1
              className="text-7xl md:text-8xl font-bold text-black leading-tight"
              style={{ fontFamily: 'var(--font-instrument-serif)' }}
            >
              FoldPilot AI
            </h1>
          </div>
          <p
            className="text-2xl md:text-3xl text-black/70 mb-6 max-w-3xl mx-auto"
            style={{ fontFamily: 'var(--font-instrument-serif)' }}
          >
            AI-powered protein analysis in seconds
          </p>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Unlock deep insights into protein structures, mutations, and drug targets with our advanced AI analysis platform.
          </p>
          <Link
            href="/search"
            className="inline-flex items-center gap-3 px-8 py-4 bg-black text-white hover:bg-gray-800 rounded-lg font-semibold text-lg transition-all transform hover:scale-105 shadow-lg"
          >
            <Sparkles className="w-6 h-6" />
            Start Analyzing
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {/* Example Queries */}
        <div className="mb-20 animate-fade-in-up-delay">
          <p className="text-sm text-gray-600 mb-4 text-center">Try these examples:</p>
          <div className="flex flex-wrap justify-center gap-3">
            {exampleQueries.map((example, index) => (
              <Link
                key={example}
                href={`/search?q=${encodeURIComponent(example)}`}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-all border border-gray-300 text-black hover:border-black"
              >
                {example}
              </Link>
            ))}
          </div>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="bg-gray-50 rounded-2xl p-6 border border-gray-200 hover:border-black transition-all hover:shadow-lg animate-fade-in-up"
                style={{ animationDelay: `${0.1 * (index + 1)}s`, opacity: 0 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-black rounded-lg">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-black" style={{ fontFamily: 'var(--font-instrument-serif)' }}>
                    {feature.title}
                  </h3>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* How It Works */}
        <div className="bg-gray-50 rounded-3xl p-12 border border-gray-200 animate-fade-in">
          <h2
            className="text-4xl font-bold text-black mb-8 text-center"
            style={{ fontFamily: 'var(--font-instrument-serif)' }}
          >
            How It Works
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '1', title: 'Ask a Question', desc: 'Enter your protein query in natural language' },
              { step: '2', title: 'AI Planning', desc: 'Our planning agent extracts protein and mutation information' },
              { step: '3', title: 'Data Collection', desc: 'Structure and literature agents gather comprehensive data' },
              { step: '4', title: 'Synthesis', desc: 'Get detailed analysis and insights in seconds' },
            ].map((item, index) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-black mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center animate-fade-in">
          <div className="bg-black text-white rounded-3xl p-12">
            <Zap className="w-12 h-12 mx-auto mb-4" />
            <h2
              className="text-4xl font-bold mb-4"
              style={{ fontFamily: 'var(--font-instrument-serif)' }}
            >
              Ready to Get Started?
            </h2>
            <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
              Start analyzing proteins with AI-powered insights. Get comprehensive reports in seconds.
            </p>
            <Link
              href="/search"
              className="inline-flex items-center gap-3 px-8 py-4 bg-white text-black hover:bg-gray-100 rounded-lg font-semibold text-lg transition-all transform hover:scale-105"
            >
              <Sparkles className="w-6 h-6" />
              Analyze Your First Protein
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
