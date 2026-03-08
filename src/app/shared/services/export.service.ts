import { Injectable } from "@angular/core";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

@Injectable({
  providedIn: "root",
})
export class ExportService {
  constructor() {}

  // 📊 --- MAGIA PREMIUM PARA EXPORTAR A EXCEL ---
  exportToExcel(data: any[], fileName: string, tituloReporte: string = "Reporte del Sistema"): void {
    if (!data || data.length === 0) {
      console.warn("No hay datos para exportar a Excel");
      return;
    }

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet([]);

    XLSX.utils.sheet_add_aoa(worksheet, [
      ["A&M SMART HUB - ERP OPERATIVO"], 
      [tituloReporte.toUpperCase()], 
      [`Generado el: ${new Date().toLocaleString()}`],
      [""], 
    ], { origin: "A1" });

    XLSX.utils.sheet_add_json(worksheet, data, { origin: "A5", skipHeader: false });

    // Auto-ajustar columnas
    const objectKeys = Object.keys(data[0]);
    const wscols = objectKeys.map(key => {
      const maxLength = Math.max(
        ...data.map(item => (item[key] ? item[key].toString().length : 0)),
        key.length
      );
      return { wch: Math.min(maxLength + 2, 50) };
    });
    worksheet['!cols'] = wscols;

    const workbook: XLSX.WorkBook = {
      Sheets: { Reporte: worksheet },
      SheetNames: ["Reporte"],
    };

    const timestamp = new Date().getTime();
    XLSX.writeFile(workbook, `${fileName}_${timestamp}.xlsx`);
  }

  // 📄 --- EXPORTAR A PDF CORREGIDO ---
  exportToPdf(
    data: any[],
    fileName: string,
    titulo: string = "Reporte Oficial",
  ): void {
    if (!data || data.length === 0) {
      console.warn("No hay datos para exportar a PDF");
      return;
    }

    const doc = new jsPDF("p", "mm", "a4");

    const headers = Object.keys(data[0]);
    const body = data.map((obj) =>
      Object.values(obj).map((val) => String(val || "-")),
    );

    // Encabezados
    doc.setFontSize(16);
    doc.setTextColor(31, 41, 55); 
    doc.setFont("helvetica", "bold");
    doc.text("A&M Smart Hub", 14, 15);

    doc.setFontSize(12);
    doc.setTextColor(59, 130, 246); 
    doc.text(titulo, 14, 22);

    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128); 
    doc.setFont("helvetica", "normal");
    doc.text(`Fecha de generación: ${new Date().toLocaleString()}`, 14, 28);

    autoTable(doc, {
      head: [headers],
      body: body,
      startY: 35, 
      theme: "grid", 
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] }, 

      didDrawPage: (dataArg) => {
        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;

        // 🔥 MARCA DE AGUA CORREGIDA 🔥
        doc.setFontSize(26); // <-- Mucho más pequeña
        doc.setTextColor(200, 200, 200); // Gris claro
        doc.setFont("helvetica", "bold");

        // Usamos 'renderingMode: stroke' para dibujar solo el contorno transparente
        doc.text("A&M SMART HUB", pageWidth / 2, pageHeight / 2, {
          align: "center", 
          angle: 45,
          renderingMode: "stroke" // <-- ESTA LÍNEA EVITA QUE SE TAPE LA TABLA
        });

        // Pie de página
        doc.setFontSize(8);
        doc.setTextColor(150); 
        doc.setFont("helvetica", "normal");

        const footText = `Página ${dataArg.pageNumber} de ${doc.getNumberOfPages()}`;
        const finalText = `Propiedad de A&M Smart Hub | Desarrollado por OSZ Software | ${footText}`;

        doc.text(finalText, pageWidth / 2, pageHeight - 10, {
          align: "center",
        });
      },
    });

    const timestamp = new Date().getTime();
    doc.save(`${fileName}_${timestamp}.pdf`);
  }
}