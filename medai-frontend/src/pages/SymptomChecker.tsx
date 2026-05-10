import React, { useState } from 'react';
import { checkSymptoms } from '../api';
import { SymptomResult } from '../types';

const TEXT = '#d0e4f0';
const DIM = 'rgba(180,220,240,0.75)';
const ACCENT = '#00e5ff';

const EXAMPLES = [
  { text: 'fever, dry cough, shortness of breath, fatigue', image: 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=80&q=80' },
  { text: 'severe headache, blurred vision, nausea, balance issues', image: 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=80&q=80' },
  { text: 'chest pain, palpitations, dizziness on exertion', image: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=80&q=80' },
  { text: 'skin rash, itching, discoloration, dry patches', image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=80&q=80' },
  { text: 'joint pain, swelling, morning stiffness in knees', image: 'https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=80&q=80' },
];

const SymptomChecker: React.FC = () => {
  const [input, setInput]       = useState('');
  const [results, setResults]   = useState<SymptomResult[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [searched, setSearched] = useState(false);

  const handleCheck = async (text?: string) => {
    const s = (text || input).trim();
    if (!s) return;
    if (text) setInput(text);
    setLoading(true); setError(''); setSearched(true);
    try { setResults(await checkSymptoms(s)); }
    catch (e: any) { setError(e?.response?.data?.detail || 'Could not connect to backend.'); setResults([]); }
    finally { setLoading(false); }
  };

  const scoreColor = (n: number) => n >= 0.6 ? '#ff5252' : n >= 0.35 ? '#ffd740' : '#00e676';

  return (
    <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '3.5rem 3rem' }}>

      {/* ── HEADER ── */}
      <div className="fade-in" style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '2.4rem' }}>
        <div style={{
          width: 90, height: 90, borderRadius: 16, overflow: 'hidden', flexShrink: 0,
          border: '1px solid rgba(0,229,255,0.3)',
          boxShadow: '0 0 28px rgba(0,229,255,0.15)',
        }}>
          <img
            src="https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=200&q=80"
            alt="Symptom Checker"
            style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(20%) brightness(0.85)' }}
          />
        </div>

        <div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 14,
            background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.2)',
            borderRadius: 100, padding: '8px 20px',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: ACCENT, display: 'inline-block', boxShadow: `0 0 10px ${ACCENT}` }} />
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: ACCENT, letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
              NLP · 26 Disease Profiles · Jaccard Scoring
            </span>
          </div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, letterSpacing: -2, color: TEXT, lineHeight: 1 }}>
            Symptom Checker
          </h1>
          <p style={{ color: DIM, fontSize: 16, fontWeight: 300, marginTop: 8, maxWidth: 520 }}>
            Describe symptoms in plain English. NLP matches against 26 disease profiles using Jaccard similarity.
          </p>
        </div>
      </div>

      {/* ── INPUT CARD ── */}
      <div className="glass" style={{ borderRadius: 16, padding: '28px 30px', marginBottom: 26 }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: ACCENT, letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 14 }}>
          Describe Your Symptoms
        </div>
        <textarea
          className="input-med"
          style={{ minHeight: 110, resize: 'none' as const, marginBottom: 18, fontSize: 16, lineHeight: 1.8 }}
          placeholder="e.g. I have fever, dry cough, fatigue and difficulty breathing..."
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => handleCheck()} disabled={!input.trim() || loading}
            className="btn-cyan"
            style={{ opacity: (!input.trim() || loading) ? 0.4 : 1, fontSize: 15, padding: '13px 32px', borderRadius: 10 }}
          >
            {loading ? 'Analyzing…' : 'Check Symptoms'}
          </button>
          <button
            onClick={() => { setInput(''); setResults([]); setSearched(false); }}
            className="btn-outline"
            style={{ fontSize: 15, padding: '13px 28px', borderRadius: 10 }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* ── EXAMPLES ── */}
      {!searched && (
        <div style={{ marginBottom: 34 }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: ACCENT, letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 16 }}>
            Example Descriptions
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {EXAMPLES.map(ex => (
              <button key={ex.text} onClick={() => handleCheck(ex.text)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 18,
                  textAlign: 'left', padding: '16px 20px', borderRadius: 12,
                  background: 'rgba(0,10,22,0.65)', border: '1px solid rgba(0,229,255,0.09)',
                  cursor: 'pointer', transition: 'all 0.18s', fontFamily: 'Outfit, sans-serif',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,229,255,0.28)';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(0,229,255,0.04)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,229,255,0.09)';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(0,10,22,0.65)';
                }}
              >
                <div style={{ width: 52, height: 52, borderRadius: 10, overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(0,229,255,0.18)' }}>
                  <img src={ex.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(30%) brightness(0.8)' }} />
                </div>
                <span style={{ fontSize: 15, color: DIM, lineHeight: 1.6 }}>{ex.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── ERROR ── */}
      {error && (
        <div style={{ background: 'rgba(255,82,82,0.06)', border: '1px solid rgba(255,82,82,0.25)', borderRadius: 12, padding: '16px 20px', color: '#ff6b6b', fontSize: 15, marginBottom: 22 }}>
          {error}
        </div>
      )}

      {/* ── RESULTS ── */}
      {results.length > 0 && (
        <div className="fade-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: ACCENT, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
              Top Matches
            </div>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
              padding: '3px 12px', borderRadius: 20,
              background: 'rgba(0,229,255,0.08)', color: ACCENT,
              border: '1px solid rgba(0,229,255,0.2)',
            }}>{results.length} results</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {results.map((r, i) => (
              <div key={r.disease} className="glass" style={{
                borderRadius: 14, padding: '24px 28px',
                borderColor: i === 0 ? 'rgba(255,82,82,0.25)' : undefined,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      {i === 0 && <span className="tag-red">Top Match</span>}
                      <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 19, color: TEXT }}>{r.disease}</h3>
                    </div>
                    <p style={{ fontSize: 15, color: DIM, lineHeight: 1.75 }}>{r.description}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2.2rem', fontWeight: 900, color: scoreColor(r.score), lineHeight: 1 }}>
                      {Math.round(r.score * 100)}%
                    </p>
                    {/* was DIMMER grey → now visible */}
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'rgba(0,200,255,0.55)' }}>similarity</span>
                  </div>
                </div>

                <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden', marginBottom: 18 }}>
                  <div style={{ height: '100%', width: `${Math.round(r.score * 100)}%`, background: scoreColor(r.score), borderRadius: 2, transition: 'width 0.8s', boxShadow: `0 0 8px ${scoreColor(r.score)}60` }} />
                </div>

                {r.matched_symptoms?.length > 0 && (
                  <div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: ACCENT, letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 10 }}>
                      Matched Symptoms
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                      {r.matched_symptoms.map(sym => (
                        <span key={sym} className="tag-cyan" style={{ fontSize: 12, padding: '5px 12px' }}>{sym}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* disclaimer — visible color */}
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'rgba(0,200,255,0.45)', textAlign: 'center', marginTop: 24, fontStyle: 'italic' }}>
            Educational use only. Consult a qualified physician for medical advice.
          </p>
        </div>
      )}

      {/* ── NO RESULTS ── */}
      {searched && !loading && results.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '5rem 0' }}>
          <div style={{
            width: 72, height: 72, borderRadius: 18, overflow: 'hidden',
            margin: '0 auto 20px', opacity: 0.35,
            border: '1px solid rgba(0,229,255,0.2)',
          }}>
            <img src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=150&q=80" alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(60%)' }} />
          </div>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.3rem', fontWeight: 700, color: TEXT, marginBottom: 8 }}>No matches found</p>
          <p style={{ color: DIM, fontSize: 15 }}>Try more specific medical symptom terms.</p>
        </div>
      )}
    </div>
  );
};

export default SymptomChecker;