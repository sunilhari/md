import { useSettings, PROSE_FONTS, CODE_FONTS, LINE_WIDTHS, LINE_HEIGHTS } from '../context/settings'
import { useTheme, THEMES } from '../context/theme'

interface Props {
  open: boolean
  onClose: () => void
}

export function SettingsPanel({ open, onClose }: Props) {
  const { settings, update } = useSettings()
  const { themeName, setTheme } = useTheme()

  return (
    <>
      {open && <div className="settings-overlay" onClick={onClose} />}

      <aside className={`settings-panel ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="settings-head">
          <span className="settings-title">Settings</span>
          <button className="settings-close" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* ── Theme ──────────────────────────────────────────────────── */}
        <section className="settings-section">
          <h4 className="settings-section-label">Appearance</h4>

          <div className="settings-row">
            <span className="settings-row-label">Theme</span>
            <div className="settings-chips stacked">
              {THEMES.map(t => (
                <button
                  key={t.name}
                  className={`chip ${themeName === t.name ? 'active' : ''}`}
                  onClick={() => setTheme(t.name)}
                >{t.label}</button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Typography ─────────────────────────────────────────────── */}
        <section className="settings-section">
          <h4 className="settings-section-label">Typography</h4>

          <div className="settings-row">
            <span className="settings-row-label">
              Font size <strong>{settings.fontSize}px</strong>
            </span>
            <input
              type="range"
              className="settings-slider"
              min={12} max={22} step={1}
              value={settings.fontSize}
              onChange={e => update({ fontSize: +e.target.value })}
            />
            <div className="settings-range-labels">
              <span>12</span><span>22</span>
            </div>
          </div>

          <div className="settings-row">
            <span className="settings-row-label">Prose font</span>
            <div className="settings-chips stacked">
              {PROSE_FONTS.map(f => (
                <button
                  key={f.label}
                  className={`chip ${settings.proseFont === f.value ? 'active' : ''}`}
                  style={{ fontFamily: f.value }}
                  onClick={() => update({ proseFont: f.value })}
                >{f.label}</button>
              ))}
            </div>
          </div>

          <div className="settings-row">
            <span className="settings-row-label">
              Line height <strong>{settings.lineHeight}</strong>
            </span>
            <div className="settings-chips">
              {LINE_HEIGHTS.map(lh => (
                <button
                  key={lh.label}
                  className={`chip ${settings.lineHeight === lh.value ? 'active' : ''}`}
                  onClick={() => update({ lineHeight: lh.value })}
                >{lh.label}</button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Code ───────────────────────────────────────────────────── */}
        <section className="settings-section">
          <h4 className="settings-section-label">Code</h4>

          <div className="settings-row">
            <span className="settings-row-label">Code font</span>
            <div className="settings-chips stacked">
              {CODE_FONTS.map(f => (
                <button
                  key={f.label}
                  className={`chip ${settings.codeFont === f.value ? 'active' : ''}`}
                  style={{ fontFamily: f.value }}
                  onClick={() => update({ codeFont: f.value })}
                >{f.label}</button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Layout ─────────────────────────────────────────────────── */}
        <section className="settings-section">
          <h4 className="settings-section-label">Layout</h4>

          <div className="settings-row">
            <span className="settings-row-label">Content width</span>
            <div className="settings-chips">
              {LINE_WIDTHS.map(lw => (
                <button
                  key={lw.label}
                  className={`chip ${settings.lineWidth === lw.value ? 'active' : ''}`}
                  onClick={() => update({ lineWidth: lw.value })}
                >{lw.label}</button>
              ))}
            </div>
          </div>
        </section>

        <div className="settings-footer">
          <button
            className="settings-reset"
            onClick={() => update({
              fontSize: 15, lineHeight: 1.75,
              proseFont: PROSE_FONTS[0].value,
              codeFont: CODE_FONTS[0].value,
              lineWidth: LINE_WIDTHS[1].value,
            })}
          >Reset to defaults</button>
        </div>
      </aside>
    </>
  )
}
