/**
 * Non-blocking advisories from the API's `meta.warnings` (closed-door
 * agency, closed agent, offer already out). Styled as a warning, never
 * as a form error: the thread was created regardless.
 */
export default function AdvisoryBox({
  warnings, onDismiss,
}: {
  warnings: string[]
  onDismiss: () => void
}) {
  if (warnings.length === 0) return null

  return (
    <div className="warnbox" role="alert">
      <strong className="warnbox__head">Before you lick the stamp</strong>
      <ul>
        {warnings.map((w) => <li key={w}>{w}</li>)}
      </ul>
      <button
        type="button" className="btn btn--ghost"
        onClick={onDismiss}
      >
        Dismiss
      </button>
    </div>
  )
}
