import { useState } from "react";
import { useAuth } from "../auth";
import { IS_TEST_MODE } from "../api";
import { getMockPersonas } from "../mock";

export default function TestPersonaSwitcher() {
  const { user, switchPersona, resetSimulation } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!IS_TEST_MODE) {
    return null;
  }

  const personas = getMockPersonas();

  const handleSwitch = async (id: string) => {
    try {
      await switchPersona(id);
      setFeedback("Switched persona!");
      setTimeout(() => setFeedback(null), 2000);
    } catch (err: any) {
      alert("Failed to switch persona: " + err.message);
    }
  };

  const handleReset = async () => {
    if (!confirm("Reset all test data back to clean initial seed? Any sentences submitted or payouts requested in this test session will be restored.")) {
      return;
    }
    try {
      setResetting(true);
      await resetSimulation();
      setFeedback("Test state reset to initial seed!");
      setTimeout(() => setFeedback(null), 2500);
    } finally {
      setResetting(false);
    }
  };

  if (collapsed) {
    return (
      <div className="test-switcher-collapsed">
        <button
          className="test-switcher-expand-btn"
          onClick={() => setCollapsed(false)}
          title="Open Test Persona Switcher"
        >
          🧪 Test Mode ({user?.full_name?.split(" ")[0] || user?.role || "Test"}) ▼
        </button>
      </div>
    );
  }

  return (
    <aside className="test-switcher-bar" aria-label="Test Environment Simulation Toolbar">
      <div className="test-switcher-inner">
        <div className="test-switcher-badge">
          <span className="test-flask-icon">🧪</span>
          <span className="test-title">TEST SIMULATION</span>
          <span className="test-isolation-tag">Zero-Collision</span>
        </div>

        <div className="test-personas-group">
          <span className="test-switch-label">Switch Persona:</span>
          {personas.map((p) => {
            const isActive = user?.id === p.id || user?.email === p.email;
            let icon = "✍️";
            if (p.role === "admin") icon = "👑";
            else if (p.role === "reviewer") icon = "🩺";
            else if (p.id === "u5") icon = "⚠️";
            else if (p.id === "u6") icon = "🆕";

            return (
              <button
                key={p.id}
                type="button"
                className={`test-persona-pill ${isActive ? "active" : ""}`}
                onClick={() => handleSwitch(p.id)}
                title={`${p.full_name} (${p.email}) - ${p.role.toUpperCase()}`}
              >
                <span className="persona-icon">{icon}</span>
                <span className="persona-name">{p.full_name.split(" ")[0]}</span>
                <span className={`persona-role-tag role-${p.role}`}>{p.role}</span>
              </button>
            );
          })}
        </div>

        <div className="test-switcher-actions">
          {feedback && <span className="test-feedback-pill">{feedback}</span>}
          <button
            type="button"
            className="test-reset-btn"
            onClick={handleReset}
            disabled={resetting}
            title="Reset test database & queues to fresh initial seed"
          >
            {resetting ? "Resetting…" : "↻ Reset Data"}
          </button>
          <button
            type="button"
            className="test-collapse-btn"
            onClick={() => setCollapsed(true)}
            title="Minimize test toolbar"
          >
            ▲
          </button>
        </div>
      </div>
    </aside>
  );
}
