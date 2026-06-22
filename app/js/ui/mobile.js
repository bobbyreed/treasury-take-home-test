/**
 * Mobile-page chrome shared by the /m/ pages:
 *  - the "View desktop version" escape (remembers the choice for the session and
 *    sends the user to the desktop equivalent), and
 *  - bridging the optional "choose from library" picker into the main file input
 *    the single-label flow listens on.
 * Browser-only.
 */
export function initMobileChrome(doc) {
  const link = doc.getElementById('desktopLink');
  if (link) {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      try { sessionStorage.setItem('ttb-prefer-desktop', '1'); } catch (err) { /* blocked */ }
      location.href = link.getAttribute('href') || '../index.html';
    });
  }

  const lib = doc.getElementById('labelImageLib');
  const main = doc.getElementById('labelImage');
  if (lib && main) {
    lib.addEventListener('change', () => {
      if (!lib.files || !lib.files[0]) return;
      try {
        const dt = new DataTransfer();
        dt.items.add(lib.files[0]);
        main.files = dt.files;
        main.dispatchEvent(new Event('change', { bubbles: true }));
      } catch (err) { /* very old browsers: the camera input still works */ }
    });
  }
}
