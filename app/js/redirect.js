/* Mobile redirect. Classic (non-module) script included in the <head> of the
 * desktop app pages so it runs before paint. If a mobile device lands on a
 * desktop page and hasn't chosen "view desktop version" this session, send it
 * to the /m/ equivalent. The mobile pages themselves never load this script. */
(function () {
  try {
    if (sessionStorage.getItem('ttb-prefer-desktop') === '1') return;
  } catch (e) { /* storage blocked — fall through */ }

  var ua = navigator.userAgent || '';
  var isMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
    || (/\bMobile\b/.test(ua) && !/iPad/i.test(ua));
  if (!isMobile) return;

  var path = location.pathname;
  if (path.indexOf('/m/') !== -1) return; // already on the mobile site

  var base = path.substring(0, path.lastIndexOf('/') + 1);
  var file = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
  var known = { '': 1, 'index.html': 1, 'batch.html': 1, 'instructions.html': 1, 'practice.html': 1 };
  if (!(file in known)) return;

  location.replace(base + 'm/' + (file || 'index.html'));
})();
