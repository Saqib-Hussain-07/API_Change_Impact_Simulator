import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, authActions } from '../store/auth.store';
import { authApi } from '../lib/api';
import toast from 'react-hot-toast';
import { PageShell } from '../components/PageShell';
import {
  Terminal,
  Shield,
  ShieldCheck,
  GitCompare,
  Users,
  CheckCircle2,
  ArrowRight,
  Play,
  RefreshCw,
  Zap,
  Lock,
  Cpu,
  Server,
  Code2,
  ArrowUp,
} from 'lucide-react';

interface Scenario {
  id: string;
  name: string;
  category: string;
  severity: 'BREAKING' | 'WARNING' | 'SAFE';
  endpoint: string;
  method: string;
  oldSnippet: string;
  newSnippet: string;
  explanation: string;
  impactedTeams: { name: string; impact: string; blocked: boolean }[];
  mockLogs: string[];
}

const DEMO_SCENARIOS: Scenario[] = [
  {
    id: 'field-removal',
    name: 'Field removal: user.email deleted',
    category: 'Response schema',
    severity: 'BREAKING',
    endpoint: '/users/{id}',
    method: 'GET',
    oldSnippet: `{\n  "id": "uuid",\n  "name": "Jane Doe",\n  "email": "jane@acme.dev",\n  "role": "admin"\n}`,
    newSnippet: `{\n  "id": "uuid",\n  "name": "Jane Doe",\n  "role": "admin"\n  // field "email" was removed\n}`,
    explanation: 'Removed response field "email". Downstream clients parsing email for auth headers or user attribution will fail to deserialize.',
    impactedTeams: [
      { name: 'Frontend Mobile Team', impact: 'Direct contract failure on auth token verification', blocked: true },
      { name: 'Analytics Service', impact: 'User attribution pipeline missing required email identifier', blocked: true },
    ],
    mockLogs: [
      '[prism] Spawning mock server on ephemeral port :4192...',
      '[prism] Ready at http://127.0.0.1:4192',
      '[newman] Running Mobile Team Postman collection...',
      '  ✗ GET /users/{id} -> Expected response to contain property "email"',
      '  AssertionError: expected { id, name, role } to have property "email"',
      '[result] 2/2 contract assertions failed. Release gate: BLOCKED',
    ],
  },
  {
    id: 'required-query',
    name: 'Required query parameter added: ?api_key',
    category: 'Parameter enforcement',
    severity: 'BREAKING',
    endpoint: '/users',
    method: 'GET',
    oldSnippet: `GET /api/v1/users\n\nParameters: None required\nResponse: 200 OK Array<User>`,
    newSnippet: `GET /api/v1/users?api_key={token}\n\nParameters:\n  - name: api_key\n    in: query\n    required: true\nResponse: 200 OK | 400 Bad Request`,
    explanation: 'Added mandatory query parameter "api_key". Existing requests omitting this parameter will receive HTTP 400 or 401.',
    impactedTeams: [
      { name: 'Frontend Mobile Team', impact: 'User search directory fails on initial app load', blocked: true },
      { name: 'Analytics Service', impact: 'Hourly sync worker rejected with HTTP 400', blocked: true },
    ],
    mockLogs: [
      '[prism] Spawning mock server on ephemeral port :4193...',
      '[prism] Contract verification active',
      '[newman] Running Newman suite for Analytics Service...',
      '  ✗ GET /users -> Status code is 200',
      '  AssertionError: expected response code 400 to equal 200',
      '[result] 1/1 contract assertions failed. Release gate: BLOCKED',
    ],
  },
  {
    id: 'type-narrowing',
    name: 'Type mutation: amount integer to string',
    category: 'Type narrowing',
    severity: 'BREAKING',
    endpoint: '/payments/charge',
    method: 'POST',
    oldSnippet: `{\n  "amount": 2500,  // integer in cents\n  "currency": "USD"\n}`,
    newSnippet: `{\n  "amount": "25.00",  // string representation\n  "currency": "USD"\n}`,
    explanation: 'Changed property type from integer to string. Mathematical operations and strict deserializers will fail at runtime.',
    impactedTeams: [
      { name: 'Analytics Service', impact: 'Financial ledger ingestion parser throws TypeError', blocked: true },
    ],
    mockLogs: [
      '[prism] Spawning mock server on ephemeral port :4194...',
      '[newman] Validating POST /payments/charge...',
      '  ✗ Type check: property "amount" must be integer',
      '  AssertionError: expected "25.00" to be a number',
      '[result] Release gate: BLOCKED',
    ],
  },
  {
    id: 'safe-addition',
    name: 'Safe addition: optional avatar_url',
    category: 'Non-breaking',
    severity: 'SAFE',
    endpoint: '/users/{id}',
    method: 'GET',
    oldSnippet: `{\n  "id": "uuid",\n  "name": "Jane Doe",\n  "email": "jane@acme.dev"\n}`,
    newSnippet: `{\n  "id": "uuid",\n  "name": "Jane Doe",\n  "email": "jane@acme.dev",\n  "avatar_url": "https://cdn.acme.dev/jane.png"  // optional\n}`,
    explanation: 'Added new optional property "avatar_url". Fully backward-compatible with all registered consumer contracts.',
    impactedTeams: [
      { name: 'Frontend Mobile Team', impact: 'Compatible. Can adopt field when scheduled.', blocked: false },
      { name: 'Analytics Service', impact: 'Ignored by existing parser.', blocked: false },
    ],
    mockLogs: [
      '[prism] Spawning mock server on ephemeral port :4195...',
      '[newman] Running registered consumer test suites...',
      '  ✓ GET /users/{id} -> Status 200 OK',
      '  ✓ Schema validation passed: All required fields present',
      '[result] 4/4 contract assertions passed. Release gate: APPROVED',
    ],
  },
];

const MARQUEE_ITEMS = [
  'OPENAPI 3.1 & 3.0.3',
  'PRISM EPHEMERAL MOCKING',
  'NEWMAN CONTRACT HARNESS',
  'RFC 7807 PROBLEM DETAILS',
  'AST SEMANTIC DIFFER',
  'FIELD-LEVEL BLAST RADIUS',
  'POSTMAN v2.1 COMPATIBLE',
  'ZERO CI PORT COLLISIONS',
  'SHA-256 AUDIT VERIFICATION',
  'WCAG 2.2 AA ACCESSIBLE',
];

export function LandingPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const currentUser = useAuthStore((s) => s.user);

  const [activeScenario, setActiveScenario] = useState<Scenario>(DEMO_SCENARIOS[0]);
  const [isRunningMock, setIsRunningMock] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<'admin' | 'mobile' | 'analytics'>('admin');
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    function handleScroll() {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = (window.scrollY / totalHeight) * 100;
        setScrollProgress(Math.min(100, Math.max(0, progress)));
      }
      setShowBackToTop(window.scrollY > 400);
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleOneClickLogin(role: 'admin' | 'mobile' | 'analytics') {
    let email = 'admin@acme.dev';
    let password = 'Admin@1234';
    if (role === 'mobile') {
      email = 'mobile-rep@acme.dev';
      password = 'Rep@1234';
    } else if (role === 'analytics') {
      email = 'analytics-rep@acme.dev';
      password = 'Rep@1234';
    }

    try {
      const data = await authApi.login(email, password);
      authActions.login(data.user, data.accessToken, data.refreshToken);
      toast.success(`Logged in as ${data.user.email}`);
      navigate('/app');
    } catch {
      navigate('/login');
    }
  }

  function handleTriggerSimulation() {
    setIsRunningMock(true);
    setShowLogs(true);
    setTimeout(() => {
      setIsRunningMock(false);
      toast.success('Contract test run completed');
    }, 1500);
  }

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white relative">
      {/* ── Top Scroll Progress Bar (Pure Black Architectural Indicator) ── */}
      <div
        className="scroll-progress-line"
        style={{ width: `${scrollProgress}%` }}
        role="progressbar"
        aria-valuenow={Math.round(scrollProgress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Reading scroll progress"
      />

      {/* ── Main Navigation ── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-black/10">
        <nav aria-label="Main navigation" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-black text-white flex items-center justify-center font-bold flex-shrink-0">
              <Terminal className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-black uppercase font-mono">API IMPACT</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-300 font-semibold">
                SIMULATOR
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-6 text-xs text-zinc-600 font-medium">
            <a href="#overview" className="hover:text-black transition-colors">Overview</a>
            <a href="#demo" className="hover:text-black transition-colors">Sandbox</a>
            <a href="#architecture" className="hover:text-black transition-colors">Architecture</a>
            <a href="#personas" className="hover:text-black transition-colors">Roles</a>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline-block text-xs text-zinc-600 font-mono">
                  {currentUser?.email}
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/app')}
                  className="btn-vyro-primary text-xs py-1.5 px-3.5"
                >
                  <span>Open console</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-xs text-zinc-600 hover:text-black px-2.5 py-1.5 rounded transition-colors font-medium"
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => handleOneClickLogin('admin')}
                  className="btn-vyro-primary text-xs py-1.5 px-3.5"
                >
                  <span>Launch demo</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </button>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* ── Hero Section (Awwwards Bold Black & White Minimalist) ── */}
      <section id="overview" className="pt-20 pb-20 border-b border-black/10 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Headline: Crisp, solid, authoritative pure black */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-black max-w-4xl mx-auto leading-tight">
            Detect breaking API changes before they reach downstream consumers.
          </h1>

          {/* Subtitle */}
          <p className="mt-5 text-base sm:text-lg text-zinc-600 max-w-2xl mx-auto leading-relaxed">
            Diff OpenAPI specs, trace consumer blast radius, and test contract compatibility before merge.
          </p>

          {/* Primary actions */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => handleOneClickLogin('admin')}
              className="btn-vyro-primary w-full sm:w-auto"
            >
              <span>Launch console as Admin</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </button>

            <a
              href="#demo"
              className="btn-vyro-secondary w-full sm:w-auto"
            >
              <span>View interactive sandbox</span>
            </a>
          </div>

          {/* Factual telemetry metrics (4 cols) */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-3 text-left">
            <div className="vyro-card p-4">
              <div className="text-lg font-bold text-black font-mono flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-black stroke-[2.2]" />
                <span className="tabular-nums">AST Differ</span>
              </div>
              <p className="text-xs text-zinc-800 mt-1 font-semibold">Full schema parsing</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">Evaluates body, path, query, and headers</p>
            </div>

            <div className="vyro-card p-4">
              <div className="text-lg font-bold text-black font-mono flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-black stroke-[2.2]" />
                <span className="tabular-nums">Dynamic Ports</span>
              </div>
              <p className="text-xs text-zinc-800 mt-1 font-semibold">Ephemeral Prism mocks</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">Zero port collision during concurrent CI jobs</p>
            </div>

            <div className="vyro-card p-4">
              <div className="text-lg font-bold text-black font-mono flex items-center gap-1.5">
                <Users className="w-4 h-4 text-black stroke-[2.2]" />
                <span className="tabular-nums">Field Level</span>
              </div>
              <p className="text-xs text-zinc-800 mt-1 font-semibold">Consumer blast radius</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">Alerts only teams using changed fields</p>
            </div>

            <div className="vyro-card p-4">
              <div className="text-lg font-bold text-black font-mono flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-black stroke-[2.2]" />
                <span className="tabular-nums">SHA-256</span>
              </div>
              <p className="text-xs text-zinc-800 mt-1 font-semibold">Cryptographic audit log</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">Immutable records with PDF compliance export</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Continuous Horizontal Marquee Ticker ── */}
      <div className="bg-[#f8f8fa] border-b border-black/10 py-3 overflow-hidden select-none">
        <div className="animate-ticker text-xs font-mono tracking-wider uppercase text-zinc-600">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, index) => (
            <div key={index} className="flex items-center gap-6 px-4">
              <span className="text-black">•</span>
              <span className="hover:text-black transition-colors font-semibold">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Interactive Sandbox Section ── */}
      <section id="demo" className="py-16 bg-[#fafafa] border-b border-black/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider font-semibold">+ [01] Interactive demo</span>
            <h2 className="text-2xl font-bold text-black tracking-tight mt-1">
              Simulate spec mutations and contract validation
            </h2>
            <p className="text-xs text-zinc-600 mt-1 max-w-2xl">
              Choose a scenario to see how the differ inspects modifications, flags impacted consumer contracts, and runs Newman assertions.
            </p>
          </div>

          {/* Scenario selector */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-6">
            {DEMO_SCENARIOS.map((scenario) => {
              const isSelected = activeScenario.id === scenario.id;
              return (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => {
                    setActiveScenario(scenario);
                    setShowLogs(false);
                  }}
                  className={`p-3 rounded-lg text-left border transition-all ${
                    isSelected
                      ? 'bg-black border-black text-white shadow-md'
                      : 'bg-white border-black/10 text-zinc-700 hover:border-black/30 hover:text-black'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-mono ${isSelected ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      {scenario.category}
                    </span>
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        scenario.severity === 'BREAKING'
                          ? isSelected
                            ? 'bg-white text-black font-semibold'
                            : 'bg-black text-white font-semibold'
                          : isSelected
                          ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                          : 'bg-zinc-100 text-zinc-800 border border-zinc-300'
                      }`}
                    >
                      {scenario.severity}
                    </span>
                  </div>
                  <p className="text-xs font-semibold truncate">{scenario.name}</p>
                </button>
              );
            })}
          </div>

          {/* Workbench */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Spec Diff Comparison (6 cols) */}
            <div className="lg:col-span-6 vyro-card p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2.5 border-b border-black/10 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-black border border-black/20 text-[11px] font-mono font-bold">
                      {activeScenario.method}
                    </span>
                    <span className="text-xs font-mono text-black font-semibold">{activeScenario.endpoint}</span>
                  </div>
                  <span className="text-[11px] text-zinc-500 font-mono">AST comparison</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-[11px] font-mono text-zinc-600 mb-1 flex items-center gap-1.5 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                      v1.0.0 (Production)
                    </div>
                    <pre className="p-2.5 rounded bg-zinc-50 border border-black/10 text-[11px] font-mono text-zinc-800 overflow-x-auto h-40">
                      {activeScenario.oldSnippet}
                    </pre>
                  </div>

                  <div>
                    <div className="text-[11px] font-mono text-black mb-1 flex items-center gap-1.5 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-black" />
                      v2.0.0 (Proposed PR)
                    </div>
                    <pre className="p-2.5 rounded bg-zinc-50 border border-black/20 text-[11px] font-mono text-black overflow-x-auto h-40 font-semibold">
                      {activeScenario.newSnippet}
                    </pre>
                  </div>
                </div>

                <div className="mt-3 p-2.5 rounded bg-zinc-50 border border-black/10">
                  <p className="text-xs text-zinc-700 leading-normal">
                    <strong className="text-black font-semibold">Analysis: </strong>
                    {activeScenario.explanation}
                  </p>
                </div>
              </div>

              {/* Trigger */}
              <div className="mt-4 pt-3 border-t border-black/10 flex items-center justify-between">
                <span className="text-[11px] text-zinc-500 font-mono font-medium">Prism ephemeral harness</span>
                <button
                  type="button"
                  onClick={handleTriggerSimulation}
                  disabled={isRunningMock}
                  className="btn-vyro-primary text-xs py-1.5 px-3 inline-flex items-center gap-1.5"
                >
                  {isRunningMock ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Executing Newman...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Run mock validation</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Blast radius & terminal (6 cols) */}
            <div className="lg:col-span-6 space-y-3">
              {/* Blast radius list */}
              <div className="vyro-card p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="text-xs font-semibold text-black flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-zinc-600" />
                    <span>Consumer blast radius</span>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500 font-medium">
                    {activeScenario.impactedTeams.filter((t) => t.blocked).length} blocked
                  </span>
                </div>

                <div className="space-y-2">
                  {activeScenario.impactedTeams.map((team) => (
                    <div
                      key={team.name}
                      className="p-2.5 rounded bg-zinc-50 border border-black/10 flex items-start justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-black">{team.name}</span>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                              team.blocked
                                ? 'bg-black text-white'
                                : 'bg-zinc-200 text-zinc-800 border border-zinc-300'
                            }`}
                          >
                            {team.blocked ? 'Blocked' : 'Compatible'}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-600 mt-0.5">{team.impact}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Terminal log (High-contrast dark terminal inset against white page) */}
              <div className="vyro-card p-3 bg-[#0c0c0e] border-black/20 text-zinc-200 shadow-md">
                <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800 mb-2 text-[10px] font-mono text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-zinc-600" />
                    <span className="font-semibold text-zinc-300">prism-runner.log</span>
                  </div>
                  <span>Port :dynamic</span>
                </div>

                <div className="font-mono text-[11px] space-y-0.5 h-32 overflow-y-auto">
                  {showLogs ? (
                    activeScenario.mockLogs.map((log, idx) => (
                      <div
                        key={idx}
                        className={
                          log.includes('BLOCKED') || log.includes('✗')
                            ? 'text-white font-medium bg-zinc-800 px-1 rounded'
                            : log.includes('APPROVED') || log.includes('✓')
                            ? 'text-zinc-100 font-medium'
                            : 'text-zinc-400'
                        }
                      >
                        {log}
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex items-center justify-center text-zinc-500 text-xs">
                      Run mock validation to inspect Newman logs
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Architecture Section ── */}
      <section id="architecture" className="py-16 bg-white border-b border-black/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider font-semibold">+ [02] System architecture</span>
            <h2 className="text-2xl font-bold text-black tracking-tight mt-1">
              How the verification engine works
            </h2>
            <p className="text-xs text-zinc-600 mt-1 max-w-2xl">
              Five components work together to evaluate spec changes, trace dependency reach, and enforce contract gates.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1 */}
            <div className="md:col-span-2 vyro-card p-5 flex flex-col justify-between relative group">
              <span className="absolute top-3 right-3 font-mono text-[10px] text-zinc-400 group-hover:text-black transition-colors select-none font-semibold">
                + [ 01 // PARSE ]
              </span>
              <div>
                <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center mb-3">
                  <GitCompare className="w-4 h-4 stroke-[2.2]" />
                </div>
                <h3 className="text-base font-bold text-black mb-1.5">
                  Semantic OpenAPI AST Differ
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed max-w-xl">
                  Parses OpenAPI specifications into typed syntax trees. Evaluates schema properties, array items,
                  path parameters, query filters, request bodies, and HTTP status codes against a deterministic 16-rule taxonomy.
                </p>
              </div>

              <div className="mt-4 p-3 rounded bg-zinc-50 border border-black/10 font-mono text-[11px] text-zinc-800 space-y-1">
                <div className="font-semibold text-black">[-] DELETE_ENDPOINT — High breaking severity</div>
                <div className="font-semibold text-black">[-] ADD_REQUIRED_PARAM — Query and header enforcement</div>
                <div className="text-zinc-600">[~] SCHEMA_TYPE_NARROWING — Runtime deserialization risk</div>
                <div className="text-zinc-600">[+] ADD_OPTIONAL_FIELD — Non-breaking expansion</div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="vyro-card p-5 flex flex-col justify-between relative group">
              <span className="absolute top-3 right-3 font-mono text-[10px] text-zinc-400 group-hover:text-black transition-colors select-none font-semibold">
                + [ 02 // GRAPH ]
              </span>
              <div>
                <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-300 text-black flex items-center justify-center mb-3">
                  <Users className="w-4 h-4 stroke-[2.2]" />
                </div>
                <h3 className="text-base font-bold text-black mb-1.5">
                  Field-Level Consumer Graph
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Teams register exact endpoints and payload properties they depend on.
                  Changes to unconsumed fields do not trigger false alerts.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-black/10 text-[11px] font-mono text-zinc-500">
                Granularity: Endpoint path and field key
              </div>
            </div>

            {/* Card 3 */}
            <div className="vyro-card p-5 flex flex-col justify-between relative group">
              <span className="absolute top-3 right-3 font-mono text-[10px] text-zinc-400 group-hover:text-black transition-colors select-none font-semibold">
                + [ 03 // MOCK ]
              </span>
              <div>
                <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-300 text-black flex items-center justify-center mb-3">
                  <Cpu className="w-4 h-4 stroke-[2.2]" />
                </div>
                <h3 className="text-base font-bold text-black mb-1.5">
                  Dynamic Port Ephemeral Mocks
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Allocates free operating system ports dynamically (<code className="text-black font-semibold">port: 0</code>).
                  Prevents port binding conflicts when multiple pull requests trigger mock runs simultaneously.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-black/10 text-[11px] font-mono text-zinc-500 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5" />
                <span>Isolated child process lifecycles</span>
              </div>
            </div>

            {/* Card 4 */}
            <div className="vyro-card p-5 flex flex-col justify-between relative group">
              <span className="absolute top-3 right-3 font-mono text-[10px] text-zinc-400 group-hover:text-black transition-colors select-none font-semibold">
                + [ 04 // GATE ]
              </span>
              <div>
                <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-300 text-black flex items-center justify-center mb-3">
                  <Shield className="w-4 h-4 stroke-[2.2]" />
                </div>
                <h3 className="text-base font-bold text-black mb-1.5">
                  Gated Release Approvals
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Blocks release progression until affected consumer representatives or platform administrators review and sign off.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-black/10 text-[11px] font-mono text-zinc-500 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Role-based access control</span>
              </div>
            </div>

            {/* Card 5 */}
            <div className="vyro-card p-5 flex flex-col justify-between relative group">
              <span className="absolute top-3 right-3 font-mono text-[10px] text-zinc-400 group-hover:text-black transition-colors select-none font-semibold">
                + [ 05 // CI/CD ]
              </span>
              <div>
                <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-300 text-black flex items-center justify-center mb-3">
                  <Code2 className="w-4 h-4 stroke-[2.2]" />
                </div>
                <h3 className="text-base font-bold text-black mb-1.5">
                  CI Pipeline Integration
                </h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Integrates with GitHub Actions, GitLab CI, Vercel, and Render. Non-zero exit codes halt PR merges on unapproved breaking changes.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-black/10 text-[11px] font-mono text-zinc-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Deterministic exit codes (0 / 1)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Role Workspaces ── */}
      <section id="personas" className="py-16 bg-[#fafafa] border-b border-black/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider font-semibold">+ [03] Role-based access</span>
            <h2 className="text-2xl font-bold text-black tracking-tight mt-1">
              Dedicated interfaces for producers and consumers
            </h2>
          </div>

          {/* Persona selector */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setSelectedPersona('admin')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                selectedPersona === 'admin'
                  ? 'bg-black text-white shadow-sm'
                  : 'bg-white text-zinc-700 border border-black/15 hover:text-black'
              }`}
            >
              API Producer (Admin)
            </button>
            <button
              type="button"
              onClick={() => setSelectedPersona('mobile')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                selectedPersona === 'mobile'
                  ? 'bg-black text-white shadow-sm'
                  : 'bg-white text-zinc-700 border border-black/15 hover:text-black'
              }`}
            >
              Mobile Team Rep
            </button>
            <button
              type="button"
              onClick={() => setSelectedPersona('analytics')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                selectedPersona === 'analytics'
                  ? 'bg-black text-white shadow-sm'
                  : 'bg-white text-zinc-700 border border-black/15 hover:text-black'
              }`}
            >
              Analytics Service Rep
            </button>
          </div>

          <div className="vyro-card p-5">
            {selectedPersona === 'admin' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-black/10">
                  <div>
                    <h3 className="text-sm font-bold text-black">API Producer & Platform Architect</h3>
                    <p className="text-xs text-zinc-600 mt-0.5">Upload specifications, evaluate version diffs, and inspect release gates.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOneClickLogin('admin')}
                    className="btn-vyro-primary text-xs py-1.5 px-3"
                  >
                    <span>Enter as Admin</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded bg-zinc-50 border border-black/10">
                    <p className="font-semibold text-black mb-1">Spec Versioning</p>
                    <p className="text-zinc-600">Upload JSON/YAML specs and track AST diffs between releases.</p>
                  </div>
                  <div className="p-3 rounded bg-zinc-50 border border-black/10">
                    <p className="font-semibold text-black mb-1">Mock Orchestration</p>
                    <p className="text-zinc-600">Trigger ephemeral Prism servers to validate all registered Postman collections.</p>
                  </div>
                  <div className="p-3 rounded bg-zinc-50 border border-black/10">
                    <p className="font-semibold text-black mb-1">Audit Trail</p>
                    <p className="text-zinc-600">Review SHA-256 spec hashes, consumer sign-offs, and PDF compliance reports.</p>
                  </div>
                </div>
              </div>
            )}

            {selectedPersona === 'mobile' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-black/10">
                  <div>
                    <h3 className="text-sm font-bold text-black">Frontend Mobile Team Representative</h3>
                    <p className="text-xs text-zinc-600 mt-0.5">Register consumed endpoints and attach Postman contract collections.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOneClickLogin('mobile')}
                    className="btn-vyro-primary text-xs py-1.5 px-3"
                  >
                    <span>Enter as Mobile Rep</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded bg-zinc-50 border border-black/10">
                    <p className="font-semibold text-black mb-1">Field Dependencies</p>
                    <p className="text-zinc-600">Register exact endpoint properties (e.g. id, email, name) used by iOS and Android apps.</p>
                  </div>
                  <div className="p-3 rounded bg-zinc-50 border border-black/10">
                    <p className="font-semibold text-black mb-1">Test Collections</p>
                    <p className="text-zinc-600">Upload Newman test suites to assert contract compatibility on proposed updates.</p>
                  </div>
                  <div className="p-3 rounded bg-zinc-50 border border-black/10">
                    <p className="font-semibold text-black mb-1">Sign-off Gates</p>
                    <p className="text-zinc-600">Approve or flag breaking changes before backend deployments merge.</p>
                  </div>
                </div>
              </div>
            )}

            {selectedPersona === 'analytics' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-black/10">
                  <div>
                    <h3 className="text-sm font-bold text-black">Analytics Service Representative</h3>
                    <p className="text-xs text-zinc-600 mt-0.5">Protect ingestion pipelines against schema mutations and payload type shifts.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOneClickLogin('analytics')}
                    className="btn-vyro-primary text-xs py-1.5 px-3"
                  >
                    <span>Enter as Analytics Rep</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded bg-zinc-50 border border-black/10">
                    <p className="font-semibold text-black mb-1">Ingestion Guardrails</p>
                    <p className="text-zinc-600">Guard event pipelines against type changes that cause database ingestion failures.</p>
                  </div>
                  <div className="p-3 rounded bg-zinc-50 border border-black/10">
                    <p className="font-semibold text-black mb-1">Automated Assertions</p>
                    <p className="text-zinc-600">Execute regression tests across batch worker endpoints automatically.</p>
                  </div>
                  <div className="p-3 rounded bg-zinc-50 border border-black/10">
                    <p className="font-semibold text-black mb-1">Pipeline Continuity</p>
                    <p className="text-zinc-600">Maintain schema stability for downstream streaming and data warehouse pipelines.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Compact Architectural Footer ── */}
      {/* replaced by StickyFooter inside PageShell — see components/StickyFooter.tsx */}

      {/* ── Floating Smooth Back-To-Top Button ── */}
      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 p-2.5 rounded-full bg-black text-white hover:bg-zinc-800 transition-all shadow-elevated focus-visible:outline-none"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-4 h-4 stroke-[2.5]" />
        </button>
      )}
    </div>
  );
}

export function LandingPageWrapped() {
  return (
    <PageShell>
      <LandingPage />
    </PageShell>
  );
}
