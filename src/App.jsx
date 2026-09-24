import { useState, useEffect, useRef } from "react";
import "./App.css";
import { ROLES, PATIENT, DEFAULT_CONSENT, AUDIT_LOG, CONSENT_LABELS } from "./data";
import SummaryTab from "./tabs/SummaryTab";
import CompareTab from "./tabs/CompareTab";
import DataModelTab from "./tabs/DataModelTab";
import ScenarioTab from "./tabs/ScenarioTab";
import AuditTab from "./tabs/AuditTab";
import RegulatoryTab from "./tabs/RegulatoryTab";
import QualityTab from "./tabs/QualityTab";
import SafetyTab from "./tabs/SafetyTab";
import RationaleTab from "./tabs/RationaleTab";
import PatientDashboard from "./tabs/PatientDashboard";
import PatientConsent from "./tabs/PatientConsent";
import TransparencyTab from "./tabs/TransparencyTab";

const PROVIDER_TABS = [
  { id: "summary", label: "Patient Summary" },
  { id: "compare", label: "Compare Views" },
  { id: "scenario", label: "Safety Scenario" },
];

const PATIENT_TABS = [
  { id: "dashboard", label: "My Health" },
  { id: "consent", label: "Privacy" },
  { id: "transparency", label: "Who Sees What" },
];

const SYSTEM_TABS = [
  { id: "data", label: "Data Model" },
  { id: "audit", label: "Audit Trail" },
  { id: "reg", label: "Regulatory" },
  { id: "quality", label: "Quality" },
  { id: "safety", label: "AI Safety" },
  { id: "rationale", label: "Rationale" },
];

const MODES = [
  { id: "provider", label: "Provider" },
  { id: "patient", label: "Patient" },
  { id: "system", label: "System" },
];

const MODE_DESCRIPTIONS = {
  provider: "Clinician workspace · role-filtered patient summary",
  patient: "Patient portal · review and control sharing",
  system: "Operations · model, audit, governance",
};

export default function App() {
  const [mode, setMode] = useState("provider");
  const [role, setRole] = useState("gp");
  const [tab, setTab] = useState("summary");
  const [consent, setConsent] = useState(DEFAULT_CONSENT);
  const [auditLog, setAuditLog] = useState(AUDIT_LOG);
  const headerRef = useRef(null);
  // Slot in the header's top-right corner where the Break Glass button renders.
  const [headerSlot, setHeaderSlot] = useState(null);

  // Expose the sticky header's height so sticky page elements can sit just below it.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const setVar = () =>
      document.documentElement.style.setProperty("--header-h", `${el.offsetHeight}px`);
    setVar();
    const ro = new ResizeObserver(setVar);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const appendAudit = (entry) => {
    const now = new Date();
    const ts = now.toISOString().slice(0, 19).replace("T", " ");
    setAuditLog((prev) => [
      { id: Date.now(), timestamp: ts, ...entry },
      ...prev,
    ]);
  };

  const toggleConsent = (targetRole, key) => {
    const newValue = !consent[targetRole]?.[key];
    setConsent((prev) => ({
      ...prev,
      [targetRole]: { ...prev[targetRole], [key]: newValue },
    }));
    appendAudit({
      actor: PATIENT.name,
      actorRole: "patient",
      action: "consent_changed",
      target: `${ROLES[targetRole]?.title} → ${key}`,
      detail: `${newValue ? "Granted" : "Revoked"}: ${CONSENT_LABELS[key]}`,
    });
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    if (newMode === "provider" && !PROVIDER_TABS.find((t) => t.id === tab)) {
      setTab("summary");
    }
    if (newMode === "patient" && !PATIENT_TABS.find((t) => t.id === tab)) {
      setTab("dashboard");
    }
    if (newMode === "system" && !SYSTEM_TABS.find((t) => t.id === tab)) {
      setTab("data");
    }
  };

  const activeTabs =
    mode === "provider" ? PROVIDER_TABS :
    mode === "patient" ? PATIENT_TABS :
    SYSTEM_TABS;

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header" ref={headerRef}>
        <div className="header-inner">
          <div className="header-brand">
            <a className="brand-mark" href="/" aria-label="ProviderConnect home">
              <svg viewBox="0 0 64 64" width="44" height="44" aria-hidden="true">
                <rect width="64" height="64" rx="11" fill="var(--brand)"/>
                <rect x="4.5" y="4.5" width="55" height="55" rx="7" fill="none" stroke="var(--paper)" strokeOpacity="0.18" strokeWidth="0.9"/>
                <text x="32" y="44" textAnchor="middle" fontFamily="'Fraunces','Times New Roman',Georgia,serif" fontStyle="italic" fontWeight="500" fontSize="40" fill="var(--paper)" letterSpacing="-1">P</text>
                <line x1="20" y1="51" x2="44" y2="51" stroke="var(--paper)" strokeOpacity="0.34" strokeWidth="0.7"/>
              </svg>
            </a>
            <div className="brand-words">
              <div className="brand-name">ProviderConnect</div>
              <div className="brand-eyebrow">Shared Patient Summary &middot; Vol. I</div>
            </div>
          </div>
          <div className="header-right">
            <div className="header-actions" ref={setHeaderSlot}></div>
            <div className="patient-pill">
              <span className="patient-pill-label">Patient</span>
              <span className="patient-pill-divider" aria-hidden="true">/</span>
              <span className="patient-pill-name">{PATIENT.name}</span>
              <span className="patient-pill-meta">{PATIENT.age} · {PATIENT.dob}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="app-layout">
        {/* Mode segmented control */}
        <div className="mode-bar">
          <div className="mode-switcher" role="tablist" aria-label="View mode">
            {MODES.map((m) => (
              <button
                key={m.id}
                role="tab"
                aria-selected={mode === m.id}
                className={`mode-btn${mode === m.id ? " active" : ""}`}
                onClick={() => switchMode(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="mode-caption">{MODE_DESCRIPTIONS[mode]}</div>
        </div>

        {/* Role row (provider mode only) */}
        {mode === "provider" && (
          <div className="role-row">
            <div className="role-row-label">Viewing as</div>
            <div className="role-chips">
              {Object.entries(ROLES).map(([key, r]) => (
                <button
                  key={key}
                  className={`role-chip${role === key ? " active" : ""}`}
                  onClick={() => setRole(key)}
                  style={
                    role === key
                      ? { borderColor: r.color, background: r.bg, color: r.color }
                      : undefined
                  }
                >
                  <span
                    className="role-monogram"
                    style={{
                      background: role === key ? r.color : "transparent",
                      color: role === key ? "#FBF6E9" : r.color,
                      borderColor: role === key ? r.color : r.color,
                    }}
                  >
                    {r.initials}
                  </span>
                  <span className="role-chip-text">
                    <span className="role-chip-name">{r.label}</span>
                    <span className="role-chip-title">{r.title}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab navigation */}
        <nav className="tab-nav" aria-label={`${mode} sections`}>
          <ol className="tab-list">
            {activeTabs.map((t, i) => (
              <li key={t.id} className="tab-item">
                <button
                  className={`tab-btn${tab === t.id ? " active" : ""}`}
                  onClick={() => setTab(t.id)}
                  aria-current={tab === t.id ? "page" : undefined}
                >
                  <span className="tab-num">{String(i + 1).padStart(2, "0")}</span>
                  <span className="tab-label">{t.label}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        {/* Tab Content */}
        <main className="tab-content" key={tab === "summary" ? tab + role : tab}>
          {/* Provider tabs */}
          {tab === "summary" && <SummaryTab role={role} consent={consent} onEmergencyOverride={appendAudit} headerSlot={headerSlot} />}
          {tab === "compare" && <CompareTab consent={consent} />}
          {tab === "scenario" && <ScenarioTab consent={consent} />}

          {/* Patient tabs */}
          {tab === "dashboard" && <PatientDashboard consent={consent} />}
          {tab === "consent" && <PatientConsent consent={consent} onToggle={toggleConsent} />}
          {tab === "transparency" && <TransparencyTab consent={consent} />}

          {/* System tabs */}
          {tab === "data" && <DataModelTab />}
          {tab === "audit" && <AuditTab auditLog={auditLog} />}
          {tab === "reg" && <RegulatoryTab />}
          {tab === "quality" && <QualityTab />}
          {tab === "safety" && <SafetyTab />}
          {tab === "rationale" && <RationaleTab />}
        </main>

        <footer className="app-footer">
          <div className="footer-rule" aria-hidden="true"></div>
          <div className="footer-grid">
            <div className="footer-brand">
              <svg viewBox="0 0 64 64" width="28" height="28" aria-hidden="true">
                <rect width="64" height="64" rx="11" fill="var(--brand)"/>
                <text x="32" y="44" textAnchor="middle" fontFamily="'Fraunces',Georgia,serif" fontStyle="italic" fontWeight="500" fontSize="40" fill="var(--paper)" letterSpacing="-1">P</text>
              </svg>
              <span className="footer-tagline">A working sketch of patient-controlled, role-filtered clinical data sharing.</span>
            </div>
            <div className="footer-meta">
              <span className="footer-meta-item">Vol. I</span>
              <span className="footer-meta-divider" aria-hidden="true">·</span>
              <span className="footer-meta-item">Demo</span>
              <span className="footer-meta-divider" aria-hidden="true">·</span>
              <span className="footer-meta-item">{new Date().getFullYear()}</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
