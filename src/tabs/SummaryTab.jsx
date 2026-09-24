import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ROLES, PATIENT, ALLERGIES,
  getVisibleConditions, getVisibleMedications, getVisibleVisits, getVisiblePlans,
  getAISummarySegments, lookupSource, getVisibleCoordinationFindings,
} from "../data";

function AccessBadge({ access }) {
  if (access === "full") return <span className="badge badge-green">Full Access</span>;
  if (access === "limited") return <span className="badge badge-amber">Redacted</span>;
  return <span className="badge badge-blue">Shared Summary</span>;
}

function RedactedIndicator() {
  return <span className="redacted-indicator">&#9888; Patient-controlled redaction</span>;
}

function RelevanceTooltip({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <button
        className="relevance-btn"
        onClick={() => setOpen(!open)}
        aria-label="Why is this relevant?"
      >
        Why relevant?
      </button>
      {open && (
        <div className="relevance-tooltip">
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>
            CLINICAL RELEVANCE
          </div>
          <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.5 }}>{text}</div>
        </div>
      )}
    </span>
  );
}

function CitationPill({ sources }) {
  const [open, setOpen] = useState(false);
  if (!sources || sources.length === 0) return null;
  const items = sources.map((id) => lookupSource(id)).filter(Boolean);
  if (items.length === 0) return null;
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="View sources"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          fontWeight: 700,
          padding: "1px 5px",
          marginLeft: 3,
          borderRadius: 4,
          background: open ? "var(--accent)" : "var(--accent-light)",
          color: open ? "#fff" : "var(--accent)",
          border: "1px solid rgba(37,99,235,0.25)",
          cursor: "pointer",
          verticalAlign: "super",
          lineHeight: 1.3,
        }}
      >
        {sources.join(",")}
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            zIndex: 20,
            minWidth: 280,
            maxWidth: 380,
            background: "#fff",
            border: "1px solid var(--border)",
            borderRadius: 8,
            boxShadow: "0 6px 24px rgba(0,0,0,0.12)",
            padding: 10,
            fontFamily: "system-ui, sans-serif",
            fontWeight: 400,
            verticalAlign: "baseline",
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", fontFamily: "'JetBrains Mono', monospace", marginBottom: 6, letterSpacing: 0.4 }}>
            SOURCE{items.length > 1 ? "S" : ""} &mdash; {items.length}
          </div>
          {items.map((item) => (
            <div key={item.id} style={{ padding: "6px 0", borderTop: "1px dashed var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, color: "var(--text-muted)" }}>
                  {item.id.toUpperCase()}
                </span>
                <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: 0.4 }}>
                  {item.type}
                </span>
                {item.date && (
                  <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: "auto" }}>{item.date}</span>
                )}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", lineHeight: 1.4 }}>{item.title}</div>
              {item.provider && (
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.provider}</div>
              )}
              {item.snippet && (
                <div style={{ fontSize: 11.5, color: "var(--text-sec)", lineHeight: 1.5, marginTop: 4, fontStyle: "italic" }}>
                  &ldquo;{item.snippet}&rdquo;
                </div>
              )}
            </div>
          ))}
          <button
            onClick={() => setOpen(false)}
            style={{
              marginTop: 6,
              fontSize: 10,
              color: "var(--text-muted)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            Close
          </button>
        </div>
      )}
    </span>
  );
}

function CitedSummary({ segments }) {
  return (
    <p className="ai-summary-text">
      {segments.map((seg, i) => (
        <span key={i}>
          {seg.text}
          <CitationPill sources={seg.sources} />
          {i < segments.length - 1 ? " " : ""}
        </span>
      ))}
    </p>
  );
}

const SEVERITY_STYLES = {
  warning: { bg: "var(--amber-bg)", border: "var(--amber-border)", color: "var(--amber)", icon: "⚠️", label: "Needs attention" },
  info: { bg: "var(--accent-light)", border: "rgba(37,99,235,0.2)", color: "var(--accent)", icon: "ℹ️", label: "Monitoring" },
  ok: { bg: "var(--green-bg)", border: "var(--green-border)", color: "var(--green)", icon: "✓", label: "Consistent" },
};

const STATUS_LABELS = {
  open: "Open",
  monitoring: "Monitoring",
  resolved: "Resolved",
  acknowledged: "Acknowledged",
};

function CoordinationPanel({ role, consent }) {
  const findings = getVisibleCoordinationFindings(role, consent);
  if (findings.length === 0) return null;
  const warnCount = findings.filter((f) => f.severity === "warning").length;
  return (
    <div className="card summary-section" id="sec-coordination">
      <div className="section-title">
        <span className="section-title-icon">&#128279;</span> Cross-Provider Coordination
        <span
          className={`badge ${warnCount > 0 ? "badge-amber" : "badge-green"}`}
          style={{ marginLeft: "auto" }}
        >
          {warnCount > 0 ? `${warnCount} need${warnCount === 1 ? "s" : ""} attention` : "All consistent"}
        </span>
      </div>
      <div className="stack stack-sm">
        {findings.map((f) => {
          const s = SEVERITY_STYLES[f.severity] || SEVERITY_STYLES.info;
          return (
            <div
              key={f.id}
              className="info-block"
              style={{
                background: s.bg,
                borderColor: s.border,
                borderLeft: `3px solid ${s.color}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 14 }}>{s.icon}</span>
                <div className="info-block-title" style={{ color: s.color, flex: 1 }}>
                  {f.title}
                </div>
                <span
                  className="badge"
                  style={{
                    fontSize: 9,
                    background: "#fff",
                    color: s.color,
                    border: `1px solid ${s.color}35`,
                  }}
                >
                  {STATUS_LABELS[f.status] || f.status}
                </span>
              </div>
              <div className="info-block-desc">{f.detail}</div>
              {f.redacted && (
                <div style={{ fontSize: 11, color: "var(--amber)", marginTop: 6 }}>
                  &#9888; Shown in generalized form — patient has not granted full medication visibility to this role.
                </div>
              )}
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span>Involves: {f.involvedRoles.map((r) => ROLES[r]?.title).filter(Boolean).join(", ")}</span>
                {f.sources && f.sources.length > 0 && (
                  <>
                    <span>&middot;</span>
                    <span>Sources:</span>
                    <CitationPill sources={f.sources} />
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConsentIndicator({ consent, role }) {
  const granted = Object.values(consent[role] || {}).filter(Boolean).length;
  const total = Object.values(consent[role] || {}).length;
  if (granted === total) return null;
  return (
    <div className="consent-indicator">
      <span className="consent-indicator-icon">&#128274;</span>
      <span>Patient has shared {granted}/{total} data categories with this role</span>
    </div>
  );
}

export default function SummaryTab({ role, consent, onEmergencyOverride, headerSlot }) {
  const [feedback, setFeedback] = useState(null);
  const [flagText, setFlagText] = useState("");
  const [flagSubmitted, setFlagSubmitted] = useState(false);
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState("");
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  const effectiveConsent = emergencyActive
    ? { ...consent, [role]: { mental_health_detail: true, all_medications: true, session_content: true, substance_history: true } }
    : consent;

  const conditions = getVisibleConditions(role, effectiveConsent);
  const medications = getVisibleMedications(role, effectiveConsent);
  const visits = getVisibleVisits(role, effectiveConsent);
  const plans = getVisiblePlans(role, effectiveConsent);
  const aiSummarySegments = getAISummarySegments(role, effectiveConsent);
  const ri = ROLES[role];
  const coordinationCount = getVisibleCoordinationFindings(role, effectiveConsent).length;

  const sections = [
    { id: "sec-summary", label: "AI Summary" },
    ...(coordinationCount > 0 ? [{ id: "sec-coordination", label: "Coordination", count: coordinationCount }] : []),
    { id: "sec-conditions", label: "Conditions", count: conditions.length },
    { id: "sec-medications", label: "Medications", count: medications.length },
    { id: "sec-allergies", label: "Allergies", count: ALLERGIES.length, critical: true },
    { id: "sec-goals", label: "Patient Goals" },
    { id: "sec-visits", label: "Recent Visits", count: visits.length },
    { id: "sec-plans", label: "Treatment Plans", count: plans.length },
  ];
  const sectionIds = sections.map((sec) => sec.id).join(",");
  const [activeSection, setActiveSection] = useState("sec-summary");

  // Highlight the section currently in view in the left menu.
  useEffect(() => {
    const ids = sectionIds.split(",");
    let frame = 0;
    const update = () => {
      frame = 0;
      const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 76;
      const line = headerH + 120;
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      // At the very bottom of the page, the last section counts as active.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        current = ids[ids.length - 1];
      }
      setActiveSection(current);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [sectionIds]);

  // On narrow screens the menu is a horizontal strip: keep the active chip in view.
  useEffect(() => {
    const nav = document.querySelector(".summary-nav");
    const link = nav?.querySelector(".summary-nav-link.active");
    if (!nav || !link || nav.scrollWidth <= nav.clientWidth) return;
    const left = link.offsetLeft - (nav.clientWidth - link.offsetWidth) / 2;
    nav.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [activeSection]);

  const jumpTo = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    setActiveSection(id);
  };

  const handleEmergencyActivate = () => {
    if (emergencyReason.trim().length < 5) return;
    setEmergencyActive(true);
    setShowEmergencyModal(false);
    if (onEmergencyOverride) {
      onEmergencyOverride({
        actor: ri.label,
        actorRole: role,
        action: "emergency_override",
        target: "Full Record Access",
        detail: `Emergency override activated — reason: ${emergencyReason}`,
      });
      onEmergencyOverride({
        actor: "System",
        actorRole: "system",
        action: "notification",
        target: PATIENT.name,
        detail: "Patient notified of emergency access override",
      });
    }
  };

  return (
    <div className="summary-layout">
      {/* Left section menu */}
      <nav className="summary-nav" aria-label="Patient summary sections">
        <div className="summary-nav-label">On this page</div>
        <ol className="summary-nav-list">
          {sections.map((sec) => (
            <li key={sec.id}>
              <button
                className={`summary-nav-link${activeSection === sec.id ? " active" : ""}${sec.critical ? " critical" : ""}`}
                onClick={() => jumpTo(sec.id)}
                aria-current={activeSection === sec.id ? "location" : undefined}
              >
                <span className="summary-nav-text">{sec.label}</span>
                {sec.count !== undefined && <span className="summary-nav-count">{sec.count}</span>}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="summary-main">
      {/* Break Glass: lives in the sticky header's top-right corner */}
      {headerSlot && createPortal(
        emergencyActive ? (
          <button
            className="break-glass-btn active"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            title="Emergency override is active. Jump to the banner to deactivate."
          >
            <span className="break-glass-dot" aria-hidden="true"></span>
            Override active
          </button>
        ) : (
          <button
            className="break-glass-btn"
            onClick={() => setShowEmergencyModal(true)}
            title="Override consent restrictions for urgent clinical need. Fully audited."
          >
            <span aria-hidden="true">&#128680;</span>
            Break Glass
          </button>
        ),
        headerSlot
      )}

      {/* Consent Indicator */}

      {!emergencyActive && <ConsentIndicator consent={consent} role={role} />}

      {/* Emergency Override Banner */}
      {emergencyActive && (
        <div className="card" style={{ background: "var(--red-bg)", borderColor: "var(--red-border)", borderWidth: 2 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--red)", marginBottom: 4 }}>
                &#128680; Emergency Override Active
              </div>
              <div style={{ fontSize: 12, color: "var(--text-sec)" }}>
                Full record access granted. Reason: &ldquo;{emergencyReason}&rdquo; &mdash; Patient has been notified. Full audit trail recorded.
              </div>
            </div>
            <button
              className="btn btn-outline-red"
              onClick={() => setEmergencyActive(false)}
            >
              Deactivate
            </button>
          </div>
        </div>
      )}

      {/* AI Summary with Feedback */}
      <div
        className="card ai-summary-card summary-section"
        id="sec-summary"
        style={{
          background: `linear-gradient(135deg, ${ri.bg}, #fff)`,
          borderColor: ri.color + "25",
          borderTopColor: ri.color,
          borderTopWidth: 3,
        }}
      >
        <div className="ai-summary-header">
          <div className="ai-summary-icon" style={{ background: ri.color + "12", color: ri.color }}>&#10022;</div>
          <div style={{ flex: 1 }}>
            <div className="ai-summary-label" style={{ color: ri.color }}>
              AI-Generated Summary &mdash; View for {ri.title}
            </div>
            <div className="ai-summary-sublabel">
              Synthesized from shared records &bull; Tailored to clinical role
            </div>
          </div>
        </div>
        <CitedSummary segments={aiSummarySegments} />
        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: -4, marginBottom: 8, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 0.3 }}>
          Click any <span style={{ color: "var(--accent)", fontWeight: 700 }}>source pill</span> to trace the claim to its record.
        </div>

        {/* Feedback buttons */}
        <div className="ai-feedback">
          {feedback === null && (
            <div className="ai-feedback-buttons">
              <button className="btn btn-sm btn-green" onClick={() => { setFeedback("confirmed"); setFlagSubmitted(false); }}>
                &#10003; Confirm Accurate
              </button>
              <button className="btn btn-sm btn-amber" onClick={() => setFeedback("flagged")}>
                &#9873; Flag Inaccuracy
              </button>
            </div>
          )}
          {feedback === "confirmed" && (
            <div className="ai-feedback-result" style={{ color: "var(--green)" }}>
              &#10003; Marked as accurate by {ri.label} &mdash; logged to quality dashboard
            </div>
          )}
          {feedback === "flagged" && !flagSubmitted && (
            <div className="ai-feedback-flag">
              <input
                type="text"
                className="flag-input"
                placeholder="Describe the inaccuracy..."
                value={flagText}
                onChange={(e) => setFlagText(e.target.value)}
              />
              <button
                className="btn btn-sm btn-accent"
                onClick={() => { if (flagText.trim()) setFlagSubmitted(true); }}
              >
                Submit Flag
              </button>
            </div>
          )}
          {feedback === "flagged" && flagSubmitted && (
            <div className="ai-feedback-result" style={{ color: "var(--amber)" }}>
              &#9873; Flagged by {ri.label}: &ldquo;{flagText}&rdquo; &mdash; Summary will be regenerated &amp; error pattern logged
            </div>
          )}
          {(feedback === "confirmed" || (feedback === "flagged" && flagSubmitted)) && (
            <button className="btn-link" onClick={() => { setFeedback(null); setFlagText(""); setFlagSubmitted(false); }} style={{ marginTop: 6 }}>
              Change response
            </button>
          )}

          {/* Mock accuracy dashboard */}
          <div className="accuracy-bar">
            <div className="accuracy-stats">
              <span>AI Summary Accuracy</span>
              <span style={{ fontWeight: 700, color: "var(--green)" }}>97.2%</span>
            </div>
            <div className="accuracy-track">
              <div className="accuracy-fill" style={{ width: "97.2%" }} />
            </div>
            <div className="accuracy-detail">
              331 confirmed &middot; 7 flagged &middot; 2 regenerated this month
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Modal */}
      {showEmergencyModal && (
        <div className="modal-backdrop" onClick={() => setShowEmergencyModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--red)", marginBottom: 6 }}>&#128680; Emergency Access Override</div>
            <p style={{ fontSize: 13, color: "var(--text-sec)", lineHeight: 1.6, marginBottom: 16 }}>
              This will grant full access to all patient records regardless of consent settings. This action is:
            </p>
            <div className="stack stack-sm" style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "var(--text)", padding: "6px 10px", background: "var(--red-bg)", borderRadius: 6 }}>&#8226; Logged with your identity and timestamp</div>
              <div style={{ fontSize: 12, color: "var(--text)", padding: "6px 10px", background: "var(--red-bg)", borderRadius: 6 }}>&#8226; Patient will be notified immediately</div>
              <div style={{ fontSize: 12, color: "var(--text)", padding: "6px 10px", background: "var(--red-bg)", borderRadius: 6 }}>&#8226; Subject to clinical governance review</div>
            </div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", display: "block", marginBottom: 6 }}>Reason for emergency access *</label>
            <input
              type="text"
              className="flag-input"
              placeholder="e.g., Acute medication reaction assessment"
              value={emergencyReason}
              onChange={(e) => setEmergencyReason(e.target.value)}
              style={{ marginBottom: 14 }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-sm btn-ghost" onClick={() => setShowEmergencyModal(false)}>Cancel</button>
              <button className="btn btn-sm btn-red" onClick={handleEmergencyActivate} disabled={emergencyReason.trim().length < 5}>
                Activate Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cross-Provider Coordination */}
      <CoordinationPanel role={role} consent={effectiveConsent} />

      {/* Active Conditions */}
      <div className="card summary-section" id="sec-conditions">
        <div className="section-title">
          <span className="section-title-icon">&#128203;</span> Active Conditions
        </div>
        <div className="stack stack-sm">
          {conditions.map((c) => (
            <div key={c.id} className={`row-item${c.redacted ? " redacted" : ""}`}>
              <div>
                <div className="row-item-primary">{c.display}</div>
                <div className="row-item-secondary">
                  Managed by: {c.managedBy.split(",").map((r) => ROLES[r]?.title).join(", ")}
                </div>
              </div>
              <div className="row-item-right">
                {c.redacted && <RedactedIndicator />}
                <span className={`badge ${c.severity === "moderate" ? "badge-amber" : "badge-green"}`}>
                  {c.severity}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Medications */}
      <div className="card summary-section" id="sec-medications">
        <div className="section-title">
          <span className="section-title-icon">&#128138;</span> Current Medications
        </div>
        <div className="stack stack-sm">
          {medications.map((m, i) => (
            <div key={i}>
              <div className={`row-item${m.redacted ? " redacted" : ""}`}>
                <div>
                  <div className="row-item-primary">
                    {m.display}
                    {m.redacted && m.roleRelevance?.[role] && (
                      <RelevanceTooltip text={m.roleRelevance[role]} />
                    )}
                  </div>
                  <div className="row-item-secondary">
                    {m.redacted ? "" : m.dose + " \u2022 "}
                    Prescribed by {ROLES[m.prescriber]?.title}
                  </div>
                </div>
                {m.redacted && !m.roleRelevance?.[role] && (
                  <div className="row-item-right"><RedactedIndicator /></div>
                )}
              </div>
              {m.interactionFlag && (
                <div className="interaction-flag">&#9888;&#65039; {m.interactionFlag}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Allergies */}
      <div className="card summary-section" id="sec-allergies">
        <div className="section-title">
          <span className="section-title-icon">&#128680;</span> Allergies & Contraindications
          <span className="badge badge-green" style={{ marginLeft: "auto" }}>Always Shared</span>
        </div>
        <div className="allergy-grid">
          {ALLERGIES.map((a, i) => (
            <div key={i} className="allergy-item">
              <div className="allergy-name">{a.allergen}</div>
              <div className="allergy-reaction">{a.reaction}</div>
              <span className="badge badge-red">{a.severity}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Patient Goals */}
      <div className="card summary-section" id="sec-goals">
        <div className="section-title">
          <span className="section-title-icon">&#127919;</span> Patient-Reported Goals
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.75, fontStyle: "italic", color: "var(--text-sec)" }}>
          &ldquo;{PATIENT.patientGoals}&rdquo;
        </p>
      </div>

      {/* Recent Visits */}
      <div className="card summary-section" id="sec-visits">
        <div className="section-title">
          <span className="section-title-icon">&#128197;</span> Recent Visits
        </div>
        <div className="stack stack-md">
          {visits.map((v) => {
            const vR = ROLES[v.provider];
            return (
              <div key={v.id} className="visit-card">
                <div className="visit-header">
                  <div className="visit-provider">
                    <span className="visit-provider-icon">{vR.icon}</span>
                    <div>
                      <div className="visit-title">{v.title}</div>
                      <div className="visit-meta">{v.providerName} &bull; {v.date}</div>
                    </div>
                  </div>
                  <AccessBadge access={v.access} />
                </div>
                <p className="visit-body">{v.displaySummary}</p>
                {v.access === "limited" && (
                  <div style={{ marginTop: 8 }}><RedactedIndicator /></div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Treatment Plans */}
      <div className="card summary-section" id="sec-plans">
        <div className="section-title">
          <span className="section-title-icon">&#128221;</span> Treatment Plans
        </div>
        <div className="stack stack-md">
          {plans.map((tp, i) => {
            const pR = ROLES[tp.provider];
            return (
              <div key={i} className="visit-card">
                <div className="visit-header">
                  <div className="visit-provider">
                    <span className="visit-provider-icon">{pR.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{pR.title}</span>
                  </div>
                  <AccessBadge access={tp.access} />
                </div>
                <p className="visit-body">{tp.displayPlan}</p>
              </div>
            );
          })}
        </div>
      </div>
      </div>
    </div>
  );
}
