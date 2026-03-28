import jsPDF from 'jspdf';

export function downloadPdf(doc: jsPDF, fileName: string) {
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  if (isIOS) {
    window.open(url, '_blank');
  } else {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
