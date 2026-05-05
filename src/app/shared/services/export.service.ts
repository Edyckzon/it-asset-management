import { Injectable } from "@angular/core";
import * as ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

@Injectable({
  providedIn: "root",
})
export class ExportService {
  constructor() {}

  // 📊 --- MAGIA PREMIUM PARA EXPORTAR A EXCEL ---
  async exportToExcel(data: any[], fileName: string, tituloReporte: string = "Reporte del Sistema"): Promise<void> {
    if (!data || data.length === 0) {
      console.warn("No hay datos para exportar a Excel");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Reporte", {
      views: [{ showGridLines: false }]
    });

    const colCount = Object.keys(data[0]).length;
    const lastColLetter = String.fromCharCode(64 + colCount); // Calcula dinámicamente la última columna (ej. 'G')

    worksheet.mergeCells(`A1:${lastColLetter}1`);
    const titleCell = worksheet.getCell("A1");
    titleCell.value = "A&M SMART HUB - ERP OPERATIVO";
    titleCell.font = { name: "Arial", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };

    worksheet.mergeCells(`A2:${lastColLetter}2`);
    const subTitleCell = worksheet.getCell("A2");
    subTitleCell.value = tituloReporte.toUpperCase();
    subTitleCell.font = { name: "Arial", size: 12, bold: true, color: { argb: "FF1E293B" } };
    subTitleCell.alignment = { vertical: "middle", horizontal: "center" };

    worksheet.mergeCells(`A3:${lastColLetter}3`);
    const dateCell = worksheet.getCell("A3");
    dateCell.value = `Generado el: ${new Date().toLocaleString()}`;
    dateCell.font = { name: "Arial", size: 10, italic: true, color: { argb: "FF64748B" } };
    dateCell.alignment = { vertical: "middle", horizontal: "right" };

    worksheet.addRow([]);

    const headers = Object.keys(data[0]);
    const headerRow = worksheet.addRow(headers);

    headerRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3B82F6" } };
      cell.font = { name: "Arial", bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin", color: { argb: "FF2563EB" } },
        bottom: { style: "thin", color: { argb: "FF2563EB" } },
        left: { style: "thin", color: { argb: "FF2563EB" } },
        right: { style: "thin", color: { argb: "FF2563EB" } }
      };
    });

    data.forEach((item, index) => {
      const row = worksheet.addRow(Object.values(item));
      const isEven = index % 2 === 0;

      row.eachCell((cell) => {
        if (!isEven) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
        }
        
        cell.font = { name: "Arial", size: 10, color: { argb: "FF334155" } };
        cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
        cell.border = {
          top: { style: "hair", color: { argb: "FFE2E8F0" } },
          bottom: { style: "hair", color: { argb: "FFE2E8F0" } },
          left: { style: "hair", color: { argb: "FFE2E8F0" } },
          right: { style: "hair", color: { argb: "FFE2E8F0" } }
        };
      });
    });

    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column["eachCell"]!({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(maxLength + 2, 50);
    });

    worksheet.views = [{ state: "frozen", xSplit: 0, ySplit: 5 }];
    worksheet.autoFilter = {
      from: { row: 5, column: 1 },
      to: { row: 5, column: headers.length }
    };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const timestamp = new Date().getTime();
    a.download = `${fileName}_${timestamp}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
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

    // 🔥 CAMBIO 1: "l" significa Landscape (Horizontal) en lugar de "p" (Vertical)
    const doc = new jsPDF("l", "mm", "a4");

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
      // 🔥 CAMBIO 2: Fuente más pequeña para que entren datos largos
      styles: { fontSize: 7.5, cellPadding: 3, overflow: 'linebreak' },
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold', halign: 'center' },
      alternateRowStyles: { fillColor: [249, 250, 251] }, 
      
      // 🔥 CAMBIO 3: Asignar anchos proporcionales a las columnas para que no se aplasten
      // Los índices (0, 1, 2...) corresponden al orden de tus columnas: Empleado, Sistema, etc.
      columnStyles: {
        0: { cellWidth: 40 }, // Empleado
        1: { cellWidth: 25 }, // Sistema
        2: { cellWidth: 20 }, // Tipo de Acceso
        3: { cellWidth: 50 }, // Usuario (Correos)
        4: { cellWidth: 25 }, // Contraseña
        5: { cellWidth: 60 }, // URL (Suelen ser muy largas)
        6: { cellWidth: 'auto' } // Notas toma el resto del espacio
      },

      didDrawPage: (dataArg) => {
        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;

        // MARCA DE AGUA
        doc.setFontSize(30); 
        doc.setTextColor(200, 200, 200); 
        doc.setFont("helvetica", "bold");

        doc.text("A&M SMART HUB", pageWidth / 2, pageHeight / 2, {
          align: "center", 
          angle: 30, // Ángulo más suave para hoja horizontal
          renderingMode: "stroke" 
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