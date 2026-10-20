import { useState, useRef, useEffect } from "react";

interface AiHintTooltipProps {
  text: string;
  label?: string;
  className?: string;
}

export function AiHintTooltip({ text, label = "AI Hint", className = "" }: AiHintTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isOpen]);

  const handleMouseEnter = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 250);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  if (!text) return null;

  return (
    <div
      ref={containerRef}
      className={`ai-hint-wrapper ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        className={`ai-hint-trigger ${isOpen ? "active" : ""}`}
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        title="Hover or tap to view AI translation hint"
      >
        <span className="ai-hint-icon-circle" aria-hidden="true">i</span>
        <span className="ai-hint-btn-label">{label}</span>
      </button>

      {isOpen && (
        <div
          className="ai-hint-popover"
          role="dialog"
          aria-label="AI Translation Hint"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="ai-hint-popover-header">
            <div className="ai-hint-popover-title">
              <span className="ai-hint-badge-icon" aria-hidden="true">💡</span>
              <span>AI Translation Hint</span>
            </div>
            <button
              type="button"
              className="ai-hint-close-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Close AI hint"
              title="Close"
            >
              ✕
            </button>
          </div>

          <p className="ai-hint-explanation">
            Reference draft if sentence is complex or confusing:
          </p>

          <blockquote className="ai-hint-body">
            "{text}"
          </blockquote>

          <div className="ai-hint-popover-footer">
            <span className="ai-hint-disclaimer">
              ⚠️ For reference only. AI drafts often contain clinical inaccuracies.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
