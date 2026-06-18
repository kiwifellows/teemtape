export function Footer() {
  return (
    <footer className="site-footer">
      <p className="footer-note">
        Not a trading tool. teemtape is for learning and commenting on stocks. Data is delayed and
        informational only.
      </p>
      <p className="footer-links">
        <a
          href="https://github.com/kiwifellows/teemtape/issues/new"
          target="_blank"
          rel="noreferrer"
        >
          Feedback
        </a>
        <span className="sep" aria-hidden="true">
          ·
        </span>
        <a href="https://github.com/kiwifellows/teemtape" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </p>
    </footer>
  );
}
