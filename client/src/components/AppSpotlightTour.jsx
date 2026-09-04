import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronRight, ChevronLeft, CheckCircle2, Sparkles } from 'lucide-react';
import { markTourSeen } from '../lib/tourStorage';
import './AppSpotlightTour.css';

/* ── Target resolution ──────────────────────────────────────────────────────
   Steps may pass a single selector string or an array of fallbacks, e.g.
   ['#nav-requests', '#mnav-requests'] — the first element with a visible
   rect wins. This lets mobile bottom-nav items take over when the desktop
   sidebar (and its #nav-* ids) is hidden by CSS. */
function selectorList(step) {
  const raw = step && step.targetSelector;
  if (Array.isArray(raw)) return raw.filter(Boolean);
  return raw ? [raw] : [];
}

function findTargetEl(step) {
  for (const sel of selectorList(step)) {
    try {
      const el = document.querySelector(sel);
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return el;
      }
    } catch { /* invalid selector — try the next one */ }
  }
  return null;
}

const ESTIMATED_TOOLTIP_H = 295; // pre-measurement fallback (real height measured via ref)

export default function AppSpotlightTour({ isOpen, onClose, steps = [], tourKey = 'default', onStepChange }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [tooltipH, setTooltipH]     = useState(ESTIMATED_TOOLTIP_H);

  const tooltipRef       = useRef(null);
  const restoreFocusRef  = useRef(null);
  /* Keep latest callbacks/steps in refs so effects keep stable deps
     (dashboards pass inline arrow onStepChange — new identity per render). */
  const onStepChangeRef  = useRef(onStepChange);
  const stepsRef         = useRef(steps);
  const onCloseRef       = useRef(onClose);
  const tourKeyRef       = useRef(tourKey);

  useEffect(() => {
    onStepChangeRef.current = onStepChange;
    stepsRef.current        = steps;
    onCloseRef.current      = onClose;
    tourKeyRef.current      = tourKey;
  });

  const total = steps.length;

  /* Reset to step 0 whenever the tour is (re)opened */
  useEffect(() => {
    if (isOpen) setCurrentStep(0);
  }, [isOpen]);

  /* Save focus on open, restore it on close — keyboard users are not stranded */
  useEffect(() => {
    if (!isOpen) return;
    restoreFocusRef.current = document.activeElement;
    return () => {
      const el = restoreFocusRef.current;
      if (el && typeof el.focus === 'function' && document.contains(el)) el.focus();
    };
  }, [isOpen]);

  /* Measure the real tooltip height after each step render (replaces the
     old hardcoded 295px estimate that mis-clamped long descriptions) */
  useLayoutEffect(() => {
    if (isOpen && tooltipRef.current) {
      const h = tooltipRef.current.offsetHeight;
      if (h > 0) setTooltipH(h);
      tooltipRef.current.focus({ preventScroll: true });
    }
  }, [isOpen, currentStep]);

  /* ── Step navigation ── */
  const handleFinish = () => {
    markTourSeen(tourKeyRef.current);
    onCloseRef.current();
  };

  const handleNext = () => {
    setCurrentStep((prev) => {
      if (prev < stepsRef.current.length - 1) return prev + 1;
      handleFinish();
      return prev;
    });
  };

  const handlePrev = () => setCurrentStep((prev) => Math.max(0, prev - 1));

  /* Keyboard: Esc skips the tour, arrows navigate steps */
  useEffect(() => {
    if (!isOpen || total === 0) return;
    const onKey = (e) => {
      if (e.key === 'Escape')          { e.preventDefault(); handleFinish(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); handleNext(); }
      else if (e.key === 'ArrowLeft')  { e.preventDefault(); handlePrev(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, total]);

  /* Target location + positioning.
     - scrollIntoView runs ONCE per step (the old version re-scrolled on every
       scroll event, fighting the user's own scrolling).
     - scroll/resize listeners now only RE-MEASURE the rect (spotlight follows
       the element as the page moves).
     - Retries every 250ms for up to 2s so late-mounted targets (per-step demo
       cards, lazily rendered tabs) still get their spotlight. */
  useEffect(() => {
    if (!isOpen || total === 0) return;

    onStepChangeRef.current?.(currentStep);

    let cancelled  = false;
    let firstTimer = null;
    let retryTimer = null;
    let attempts   = 0;
    const MAX_RETRIES = 8; // 8 × 250ms

    const setRectFromEl = (el) => {
      const r = el.getBoundingClientRect();
      setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };

    const locateAndScroll = () => {
      if (cancelled) return;
      const el = findTargetEl(stepsRef.current[currentStep]);

      if (el) {
        try { el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' }); } catch { /* older browsers */ }
        setRectFromEl(el);
      } else if (attempts < MAX_RETRIES) {
        attempts += 1;
        retryTimer = setTimeout(locateAndScroll, 250);
        setTargetRect(null); // dimmed + centered fallback while target is missing
      } else {
        setTargetRect(null);
      }
    };

    const reMeasure = () => {
      if (cancelled) return;
      const el = findTargetEl(stepsRef.current[currentStep]);
      if (el) setRectFromEl(el);
    };

    firstTimer = setTimeout(locateAndScroll, 120);

    window.addEventListener('resize', reMeasure);
    window.addEventListener('scroll', reMeasure, true);
    return () => {
      cancelled = true;
      clearTimeout(firstTimer);
      clearTimeout(retryTimer);
      window.removeEventListener('resize', reMeasure);
      window.removeEventListener('scroll', reMeasure, true);
    };
  }, [isOpen, currentStep, total]);

  if (!isOpen || total === 0) return null;

  const step  = steps[currentStep] || steps[0];
  const IconComponent = step.icon || Sparkles;
  const isMobile = window.innerWidth <= 768;

  /* ── Tooltip placement with strict viewport clamping ── */
  const getTooltipStyle = () => {
    /* Mobile: spotlight still highlights the element, but the tooltip docks
       as a bottom sheet so it never covers the highlighted target. When the
       target IS the fixed bottom nav (it cannot scrollIntoView away), the
       sheet docks above the nav instead of over it. */
    if (isMobile) {
      if (targetRect) {
        const rectBottom = targetRect.top + targetRect.height;
        const BOTTOM_NAV_ZONE = 90; // fixed mobile bottom-nav height zone
        if (rectBottom > window.innerHeight - BOTTOM_NAV_ZONE) {
          const aboveNav = window.innerHeight - targetRect.top + 16;
          return {
            style: { top: 'auto', bottom: `${aboveNav}px`, left: '50%', transform: 'translateX(-50%)' },
            arrowClass: '',
            showSpotlight: true,
          };
        }
        return {
          style: { top: 'auto', bottom: '16px', left: '50%', transform: 'translateX(-50%)' },
          arrowClass: '',
          showSpotlight: true,
        };
      }
      return {
        style: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
        arrowClass: '',
        showSpotlight: false,
      };
    }

    if (!targetRect) {
      return {
        style: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
        arrowClass: '',
        showSpotlight: false,
      };
    }

    const preferredPos = step.preferredPos || 'bottom';
    const padding = 16;
    const tooltipWidth = Math.min(340, window.innerWidth - 32);
    const h = tooltipH || ESTIMATED_TOOLTIP_H;

    /* Space checks — used to pick a placement that never overlaps the target.
       Tall targets (e.g. full-width demo cards) cannot fit a tooltip above OR
       below, so we fall back to side placement instead of viewport-clamping
       the tooltip on top of the highlighted element. */
    const fitsBelow = targetRect.top + targetRect.height + padding + h <= window.innerHeight - 16;
    const fitsAbove = targetRect.top - padding - h >= 16;

    const placeSide = () => {
      const rightLeft = targetRect.left + targetRect.width + padding;
      if (rightLeft + tooltipWidth <= window.innerWidth - 16) {
        return {
          top: Math.max(16, Math.min(targetRect.top, window.innerHeight - h - 20)),
          left: rightLeft,
          arrow: 'left',
        };
      }
      const leftPos = targetRect.left - tooltipWidth - padding;
      if (leftPos >= 16) {
        return {
          top: Math.max(16, Math.min(targetRect.top, window.innerHeight - h - 20)),
          left: leftPos,
          arrow: 'right',
        };
      }
      return null; // no side fits either — caller clamps into viewport
    };

    let top = 0;
    let left = 0;
    let arrow = 'top';

    if (preferredPos === 'bottom') {
      left = Math.max(16, Math.min(targetRect.left, window.innerWidth - tooltipWidth - 16));
      if (fitsBelow) {
        top = targetRect.top + targetRect.height + padding;
        arrow = 'top';
      } else if (fitsAbove) {
        top = targetRect.top - h - padding;
        arrow = 'bottom';
      } else {
        const side = placeSide();
        if (side) ({ top, left, arrow } = side);
        else { top = targetRect.top + targetRect.height + padding; arrow = 'top'; }
      }
    } else if (preferredPos === 'top') {
      left = Math.max(16, Math.min(targetRect.left, window.innerWidth - tooltipWidth - 16));
      if (fitsAbove) {
        top = targetRect.top - h - padding;
        arrow = 'bottom';
      } else if (fitsBelow) {
        top = targetRect.top + targetRect.height + padding;
        arrow = 'top';
      } else {
        const side = placeSide();
        if (side) ({ top, left, arrow } = side);
        else { top = targetRect.top + targetRect.height + padding; arrow = 'top'; }
      }
    } else if (preferredPos === 'right') {
      top = Math.max(16, Math.min(targetRect.top, window.innerHeight - h - 20));
      left = targetRect.left + targetRect.width + padding;
      arrow = 'left';

      if (left + tooltipWidth > window.innerWidth - 16) {
        left = Math.max(16, targetRect.left);
        top = targetRect.top + targetRect.height + padding;
        arrow = 'top';
      }
    } else if (preferredPos === 'left') {
      top = Math.max(16, Math.min(targetRect.top, window.innerHeight - h - 20));
      left = targetRect.left - tooltipWidth - padding;
      arrow = 'right';

      if (left < 16) {
        left = Math.max(16, targetRect.left);
        top = targetRect.top + targetRect.height + padding;
        arrow = 'top';
      }
    }

    top  = Math.max(16, Math.min(top, window.innerHeight - h - 20));
    left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));

    return {
      style: { top: `${top}px`, left: `${left}px` },
      arrowClass: `spotlight-arrow-${arrow}`,
      showSpotlight: true,
    };
  };

  const { style: tooltipStyle, arrowClass, showSpotlight } = getTooltipStyle();

  const tourPortal = (
    <>
      {/* Overlay: dimmed ONLY when there is no spotlight box (the box's huge
          box-shadow provides the dim otherwise). Clicking the overlay ADVANCES
          the tour instead of permanently dismissing it — one accidental tap
          should not kill the whole guide. Explicit skip lives on the X button. */}
      <div
        className={`spotlight-tour-overlay${showSpotlight ? '' : ' dimmed'}`}
        onClick={handleNext}
        aria-hidden="true"
      />

      {targetRect && showSpotlight && (
        <div
          className="spotlight-target-box"
          style={{
            top: `${targetRect.top - 6}px`,
            left: `${targetRect.left - 6}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
          }}
        >
          <div className="spotlight-ripple-ring" />
          <div className="spotlight-ripple-ring-delayed" />
        </div>
      )}

      <div
        className="spotlight-tooltip-card"
        style={tooltipStyle}
        ref={tooltipRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="spotlight-tour-title"
        tabIndex={-1}
      >
        <button
          className="spotlight-close-btn"
          onClick={handleFinish}
          title="Skip tour"
          aria-label="Skip tour"
        >
          <X size={15} />
        </button>

        {arrowClass && <div className={`spotlight-arrow ${arrowClass}`} />}

        <div className="spotlight-tooltip-header">
          <div className="spotlight-tooltip-icon">
            <IconComponent size={20} />
          </div>
          <div>
            <div className="spotlight-tooltip-step-tag">
              STEP {currentStep + 1} OF {total}
            </div>
            <div className="spotlight-tooltip-title" id="spotlight-tour-title">{step.title}</div>
          </div>
        </div>

        <div className="spotlight-tooltip-body">
          {step.description}
        </div>

        <div className="spotlight-tooltip-footer">
          <div className="spotlight-dots" role="tablist" aria-label="Tour steps">
            {steps.map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={`spotlight-dot${idx === currentStep ? ' active' : ''}`}
                aria-label={`Go to step ${idx + 1}`}
                aria-current={idx === currentStep}
                onClick={() => setCurrentStep(idx)}
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {currentStep > 0 && (
              <button
                className="spotlight-nav-btn spotlight-btn-prev"
                onClick={handlePrev}
                aria-label="Previous step"
              >
                <ChevronLeft size={15} /> Back
              </button>
            )}
            <button
              className="spotlight-nav-btn spotlight-btn-next"
              onClick={handleNext}
              aria-label={currentStep < total - 1 ? 'Next step' : 'Finish tour'}
            >
              {currentStep < total - 1 ? (
                <>Next <ChevronRight size={15} /></>
              ) : (
                <>Got it! <CheckCircle2 size={15} /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(tourPortal, document.body);
}
