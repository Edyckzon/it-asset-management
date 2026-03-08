import { Injectable } from "@angular/core";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

@Injectable({
  providedIn: "root",
})
export class ExportService {
  constructor() {}

  // 📊 --- MAGIA PARA EXPORTAR A EXCEL ---
  exportToExcel(data: any[], fileName: string): void {
    if (!data || data.length === 0) {
      console.warn("No hay datos para exportar a Excel");
      return;
    }

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);

    const workbook: XLSX.WorkBook = {
      Sheets: { Reporte: worksheet },
      SheetNames: ["Reporte"],
    };

    const timestamp = new Date().getTime();

    XLSX.writeFile(workbook, `${fileName}_${timestamp}.xlsx`);
  }

  // 📄 --- MAGIA PARA EXPORTAR A PDF CON MARCA DE AGUA ---
  exportToPdf(
    data: any[],
    fileName: string,
    titulo: string = "Reporte Oficial",
  ): void {
    if (!data || data.length === 0) {
      console.warn("No hay datos para exportar a PDF");
      return;
    }

    // Configuración inicial del PDF (A4, vertical, unidades en mm)
    const doc = new jsPDF("p", "mm", "a4");

    // 1. Extraemos cabeceras y cuerpo (Datos limpios que le pasamos)
    const headers = Object.keys(data[0]);
    const body = data.map((obj) =>
      Object.values(obj).map((val) => String(val || "-")),
    );

    // 2. Dibujamos el Título del reporte
    doc.setFontSize(14);
    doc.setTextColor(31, 41, 55); // Gris oscuro
    doc.text(titulo, 14, 15);

    // 3. Dibujamos la fecha y hora de generación
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128); // Gris claro
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 22);

    // 4. Dibujamos la tabla usando AutoTable
    autoTable(doc, {
      head: [headers],
      body: body,
      startY: 28, // Empieza debajo de la fecha
      theme: "grid", // Tema con bordes
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246] }, // Azul 'brand-500'
      alternateRowStyles: { fillColor: [249, 250, 251] }, // Filas intercaladas

      // 🔥 --- AQUÍ ESTÁ LA MAGIA DE LA MARCA DE AGUA ---
      // 'didDrawPage' se ejecuta al final de CADA página
      didDrawPage: (dataArg) => {
        // Obtenemos el total de páginas (actualizando el alias interno de jsPDF)
        const totalPages = doc.getNumberOfPages();

        // --- TEXTO SUTIL DE "OSZ SOFTWARE" ---
        doc.setFontSize(40); // Grande pero sutil
        doc.setTextColor(230, 230, 230); // Gris SÚPER CLARO (Casi invisible)
        doc.setFont("helvetica", "bold");

        // Calculamos el centro de la página A4 (aprox 210mm x 297mm)
        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;

        // Colocamos el texto inclinado en el centro
        doc.text("OSZ Software", pageWidth / 2, pageHeight / 2, {
          align: "center", // Centrado horizontal
          angle: 45, // Inclinado 45 grados
        });
        // ---------------------------------------------

        // --- PIE DE PÁGINA OBLIGATORIO ---
        doc.setFontSize(8);
        doc.setTextColor(150); // Gris muy suave
        doc.setFont("helvetica", "normal");

        const footText = `Pag. ${dataArg.pageNumber}`;
        const finalText = `Sistema OSZ Software v1.0 | ${footText}`;

        // Dibujamos el pie de página centrado abajo (20mm arriba del borde)
        doc.text(finalText, pageWidth / 2, pageHeight - 10, {
          align: "center",
        });
      },
    });

    // 5. ¡Descarga del PDF!
    const timestamp = new Date().getTime();
    doc.save(`${fileName}_${timestamp}.pdf`);
  }
}
