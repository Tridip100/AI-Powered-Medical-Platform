import React, { useState, useRef, useCallback } from 'react';
import { wikiSearch, wikiSummary } from '../api';

const TEXT = '#d0e4f0';
const DIM = 'rgba(180,220,240,0.75)';
const DIMMER = 'rgba(140,180,210,0.5)';
const ACCENT = '#00e5ff';

const PRESETS = [
  { name: 'Heart', system: 'Cardiovascular' },
  { name: 'Brain', system: 'Nervous' },
  { name: 'Lungs', system: 'Respiratory' },
  { name: 'Liver', system: 'Digestive' },
  { name: 'Kidneys', system: 'Urinary' },
  { name: 'Diabetes', system: 'Endocrine Disease' },
  { name: 'Cancer', system: 'Oncology' },
  { name: 'Retina', system: 'Visual' },
  { name: 'Skin', system: 'Dermatology' },
  { name: 'Thyroid', system: 'Endocrine' },
  { name: 'Pneumonia', system: 'Respiratory Disease' },
  { name: 'Hypertension', system: 'Cardiology' },
];

interface WikiPage {
  title: string;
  extract: string;
  thumbnail?: {
    source: string;
  };
  content_urls?: {
    desktop: {
      page: string;
    };
  };
}

const OrganSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [result, setResult] = useState<WikiPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hoveredPreset, setHoveredPreset] = useState<string | null>(null);

  const debounce = useRef<NodeJS.Timeout | null>(null);

  const stripHtml = (h: string) => h.replace(/<[^>]+>/g, '');

  const fetchPage = useCallback(async (title: string) => {
    setLoading(true);
    setError('');
    setSuggestions([]);
    setResult(null);

    try {
      try {
        const direct = await wikiSummary(title);

        if (
          direct &&
          direct.extract &&
          direct.extract.length > 80 &&
          ![
            'tv series',
            'television',
            'episode',
            'movie',
            'film',
            "grey's anatomy",
          ].some((b) =>
            `${direct.title} ${direct.extract}`
              .toLowerCase()
              .includes(b)
          )
        ) {
          setResult(direct);
          return;
        }
      } catch {}

      const hits = await wikiSearch(title);

      if (!hits || hits.length === 0) {
        setError('No medical article found.');
        return;
      }

      let found = false;

      for (const hit of hits.slice(0, 10)) {
        try {
          const candidate = await wikiSummary(hit.title);

          if (
            candidate &&
            candidate.extract &&
            candidate.extract.length > 80 &&
            ![
              'tv series',
              'television',
              'episode',
              'movie',
              'film',
              "grey's anatomy",
            ].some((b) =>
              `${candidate.title} ${candidate.extract}`
                .toLowerCase()
                .includes(b)
            )
          ) {
            setResult(candidate);
            found = true;
            break;
          }
        } catch {}
      }

      if (!found) {
        setError('No medical article found.');
      }
    } catch {
      setError('Could not load article.');
    } finally {
      setLoading(false);
    }
  }, []);

  const onQueryChange = (val: string) => {
    setQuery(val);

    if (debounce.current) {
      clearTimeout(debounce.current);
    }

    if (val.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    debounce.current = setTimeout(async () => {
      try {
        const results = await wikiSearch(val);

        const filtered = results.filter((s: any) => {
          const text =
            `${s.title} ${stripHtml(s.snippet)}`.toLowerCase();

          return ![
            'tv',
            'episode',
            'season',
            'actor',
            'movie',
            'film',
            "grey's anatomy",
          ].some((b) => text.includes(b));
        });

        setSuggestions(filtered.slice(0, 8));
      } catch {
        setSuggestions([]);
      }
    }, 300);
  };

  return (
    <div
      style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: 1100,
        margin: '0 auto',
        padding: '3rem 2.5rem',
      }}
    >
      {/* HEADER */}
      <div className="fade-in" style={{ marginBottom: '2.5rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
            background: 'rgba(0,229,255,0.05)',
            border: '1px solid rgba(0,229,255,0.15)',
            borderRadius: 100,
            padding: '6px 16px',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: ACCENT,
              display: 'inline-block',
            }}
          />

          <span
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              color: ACCENT,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Wikipedia API · Medical Search
          </span>
        </div>

        <h1
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 'clamp(2rem, 4vw, 2.8rem)',
            fontWeight: 900,
            letterSpacing: -2,
            color: TEXT,
            marginBottom: 10,
            lineHeight: 1,
          }}
        >
          Medical Search
        </h1>

        <p
          style={{
            color: DIM,
            fontSize: 16,
            maxWidth: 560,
          }}
        >
          Search organs, diseases, anatomy, physiology, pathology,
          treatments, and medical conditions with automatic filtering
          of unrelated entertainment results.
        </p>
      </div>

      {/* SEARCH */}
      <div style={{ position: 'relative', marginBottom: 28 }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();

            if (query.trim()) {
              fetchPage(query.trim());
            }
          }}
        >
          <div style={{ position: 'relative' }}>
            <input
              className="input-med"
              style={{
                paddingLeft: 24,
                paddingRight: 130,
                height: 56,
                fontSize: 15,
                color: TEXT,
              }}
              placeholder="Search medical topics..."
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
            />

            <button
              type="submit"
              className="btn-cyan"
              disabled={loading}
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                padding: '8px 22px',
                fontSize: 12,
              }}
            >
              {loading ? '...' : 'Search'}
            </button>
          </div>
        </form>

        {suggestions.length > 0 && (
          <div
            className="glass"
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: 6,
              borderRadius: 12,
              overflow: 'hidden',
              zIndex: 50,
            }}
          >
            {suggestions.map((s: any) => (
              <button
                key={s.pageid}
                onClick={() => {
                  setQuery(s.title);
                  fetchPage(s.title);
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '14px 20px',
                  background: 'none',
                  border: 'none',
                  borderBottom: '1px solid rgba(0,229,255,0.06)',
                  cursor: 'pointer',
                  fontFamily: 'Outfit, sans-serif',
                }}
              >
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: TEXT,
                    marginBottom: 3,
                  }}
                >
                  {s.title}
                </p>

                <p
                  style={{
                    fontSize: 12,
                    color: DIM,
                    lineHeight: 1.5,
                  }}
                >
                  {stripHtml(s.snippet).slice(0, 90)}...
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* PRESETS */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 40,
        }}
      >
        {PRESETS.map((o) => (
          <button
            key={o.name}
            onClick={() => {
              setQuery(o.name);
              fetchPage(o.name);
            }}
            onMouseEnter={() => setHoveredPreset(o.name)}
            onMouseLeave={() => setHoveredPreset(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 20px',
              borderRadius: 10,
              background:
                hoveredPreset === o.name
                  ? 'rgba(0,229,255,0.04)'
                  : 'rgba(0,10,22,0.65)',
              border:
                hoveredPreset === o.name
                  ? '1px solid rgba(0,229,255,0.3)'
                  : '1px solid rgba(0,229,255,0.1)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontFamily: 'Outfit, sans-serif',
            }}
          >
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: TEXT,
              }}
            >
              {o.name}
            </span>

            <span
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10,
                color: DIMMER,
              }}
            >
              {o.system}
            </span>
          </button>
        ))}
      </div>

      {/* ERROR */}
      {error && (
        <div
          style={{
            background: 'rgba(255,82,82,0.06)',
            border: '1px solid rgba(255,82,82,0.2)',
            borderRadius: 12,
            padding: '16px 20px',
            color: '#ff8a80',
            fontSize: 14,
            marginBottom: 28,
          }}
        >
          {error}
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div
          style={{
            textAlign: 'center',
            padding: '4rem 0',
            color: DIM,
          }}
        >
          Loading medical article...
        </div>
      )}

      {/* RESULT */}
      {!loading && result && (
        <>
          <div
            className="fade-in"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 320px',
              gap: 28,
            }}
          >
            {/* LEFT */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 16,
                  marginBottom: 22,
                }}
              >
                <h2
                  style={{
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: '2rem',
                    fontWeight: 800,
                    color: TEXT,
                  }}
                >
                  {result.title}
                </h2>

                {result.content_urls && (
                  <a
                    href={result.content_urls.desktop.page}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tag-cyan"
                    style={{
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Wikipedia ↗
                  </a>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                }}
              >
                {result.extract
                  .split('\n')
                  .filter(Boolean)
                  .map((p, i) => (
                    <p
                      key={i}
                      style={{
                        fontSize: i === 0 ? 15.5 : 14,
                        lineHeight: 1.8,
                        color: i === 0 ? TEXT : DIM,
                        fontFamily: 'Outfit, sans-serif',
                      }}
                    >
                      {p}
                    </p>
                  ))}
              </div>
            </div>

            {/* RIGHT */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              {result.thumbnail && (
                <div
                  className="glass"
                  style={{
                    borderRadius: 14,
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={result.thumbnail.source}
                    alt={result.title}
                    style={{
                      width: '100%',
                      display: 'block',
                    }}
                  />
                </div>
              )}

              <div
                className="glass"
                style={{
                  borderRadius: 12,
                  padding: '18px 20px',
                }}
              >
                <p
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 11,
                    color: ACCENT,
                    marginBottom: 14,
                  }}
                >
                  Article Stats
                </p>

                {[
                  ['Source', 'Wikipedia'],
                  ['Language', 'English'],
                  ['Words', result.extract.split(' ').length.toString()],
                  [
                    'Paragraphs',
                    result.extract
                      .split('\n')
                      .filter(Boolean)
                      .length.toString(),
                  ],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '6px 0',
                    }}
                  >
                    <span style={{ color: DIM }}>{k}</span>
                    <span style={{ color: TEXT }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RELATED TOPICS */}
          <div
            className="glass"
            style={{
              marginTop: 32,
              borderRadius: 16,
              padding: '22px',
            }}
          >
            <p
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11,
                color: ACCENT,
                marginBottom: 18,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Explore Related Topics
            </p>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              {[
                `${result.title} anatomy`,
                `${result.title} disease`,
                `${result.title} treatment`,
                `${result.title} symptoms`,
                `${result.title} physiology`,
                `${result.title} pathology`,
                `${result.title} diagnosis`,
                `${result.title} surgery`,
              ].map((topic) => (
                <button
                  key={topic}
                  onClick={() => {
                    setQuery(topic);
                    fetchPage(topic);
                  }}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 10,
                    background: 'rgba(0,229,255,0.04)',
                    border: '1px solid rgba(0,229,255,0.12)',
                    color: TEXT,
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontFamily: 'Outfit, sans-serif',
                  }}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* EMPTY */}
      {!loading && result === null && !error && (
        <div
          style={{
            textAlign: 'center',
            padding: '6rem 0',
          }}
        >
          <h3
            style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: '1.5rem',
              fontWeight: 700,
              color: TEXT,
              marginBottom: 10,
            }}
          >
            Search Medical Topics
          </h3>

          <p
            style={{
              color: DIMMER,
              fontSize: 14,
            }}
          >
            Search anatomy, diseases, physiology, treatments, pathology,
            organs, symptoms, and medical conditions.
          </p>
        </div>
      )}
    </div>
  );
};

export default OrganSearch;