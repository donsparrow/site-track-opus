import jsPDF from 'jspdf';

export function downloadPdf(doc: jsPDF, fileName: string) {
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);

  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isAndroid = /android/i.test(ua);
  const isMobile = isIOS || isAndroid;

  // Use anchor click for all platforms — it preserves the user gesture
  // chain better than window.open() (which iOS blocks after async work).
  const link = document.createElement('a');
  link.href = url;
  link.rel = 'noopener';

  if (isIOS) {
    // iOS Safari ignores `download` and needs to open inline in a new tab
    link.target = '_blank';
  } else {
    link.download = fileName;
    if (isAndroid) link.target = '_blank';
  }

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Fallback: if iOS blocked the navigation (no tab opened), navigate current window
  if (isIOS) {
    setTimeout(() => {
      try {
        // If document is still visible, the new tab likely didn't open — fallback
        if (document.visibilityState === 'visible') {
          window.location.href = url;
        }
      } catch {
        /* ignore */
      }
    }, 800);
  }

  // Keep blob alive long enough for mobile browsers to load it
  setTimeout(() => URL.revokeObjectURL(url), isMobile ? 60000 : 10000);
}
