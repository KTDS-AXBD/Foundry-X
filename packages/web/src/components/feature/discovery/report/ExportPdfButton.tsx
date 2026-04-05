/**
 * Sprint 157: F350 — PDF Export 버튼
 * html2canvas + jsPDF 클라이언트 사이드 렌더링
 */
import { useState } from "react";
import { Download } from "lucide-react";

export default function ExportPdfButton() {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      // Dynamic import to keep bundle size small
      const [html2canvasModule, jsPDFModule] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const html2canvas = html2canvasModule.default;
      const { jsPDF } = jsPDFModule;

      // 리포트 영역을 캡처 (페이지 전체 대신 .space-y-6 컨테이너)
      const reportEl = document.querySelector("[data-report-root]") as HTMLElement | null;
      if (!reportEl) {
        console.warn("Report root element not found");
        return;
      }

      const canvas = await html2canvas(reportEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20; // 10mm margin each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let yOffset = 10;
      let remainingHeight = imgHeight;

      // Multi-page support
      while (remainingHeight > 0) {
        if (yOffset > 10) pdf.addPage();
        const sliceHeight = Math.min(remainingHeight, pageHeight - 20);
        pdf.addImage(imgData, "PNG", 10, yOffset - (imgHeight - remainingHeight), imgWidth, imgHeight);
        remainingHeight -= sliceHeight;
        yOffset = 10;
      }

      pdf.save("discovery-report.pdf");
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm hover:bg-muted transition-colors disabled:opacity-50"
    >
      <Download className="size-4" />
      {exporting ? "내보내는 중..." : "PDF"}
    </button>
  );
}
