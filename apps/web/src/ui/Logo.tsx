/** Il marchio di TravelOps: un sole sopra le onde di un lago, e il nome. Colori solo dai token. */
export function Logo() {
  return (
    <span className="ui-logo">
      <svg className="ui-logo__segno" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <rect className="ui-logo__fondo" width="32" height="32" rx="9" />
        <circle className="ui-logo__sole" cx="20.5" cy="12" r="5" />
        <path className="ui-logo__onda" d="M5 20.5 c3 -2.6 5.5 -2.6 8.5 0 s5.5 2.6 8.5 0 s4.5 -2.4 5.5 -1.2" />
        <path className="ui-logo__onda" d="M5 25.5 c3 -2.6 5.5 -2.6 8.5 0 s5.5 2.6 8.5 0 s4.5 -2.4 5.5 -1.2" />
      </svg>
      <span className="ui-logo__nome">TravelOps</span>
    </span>
  );
}
