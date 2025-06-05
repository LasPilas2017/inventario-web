import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function MostrarTrabajo({ maquinaria, refrescar }) {
  const [reportes, setReportes] = useState([]);

  useEffect(() => {
    if (maquinaria?.id) cargarReportes();
    return () => setReportes([]);
  }, [maquinaria, refrescar]);

  const cargarReportes = async () => {
    const { data, error } = await supabase
      .from("reporte_trabajo_persona")
      .select("*")
      .eq("id_maquinaria", maquinaria.id)
      .order("hora_inicio", { ascending: false });

    if (!error) setReportes(data);
    else console.error("Error al cargar reportes:", error);
  };

  const exportarPDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    let y = 20;

    let logoDataUrl = null;

    try {
      const logoBlob = await fetch("/img/LOGOTUNCAJ.png").then((res) => res.blob());
      logoDataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(logoBlob);
      });

      doc.addImage(logoDataUrl, "PNG", 14, 10, 30, 15);
    } catch (e) {
      console.warn("No se pudo cargar el logo:", e.message);
    }

    doc.setFontSize(16);
    const titulo = `Historial: #${maquinaria.numero} - ${maquinaria.marca} ${maquinaria.modelo}`;
    const tituloWidth = doc.getTextWidth(titulo);
    doc.text(titulo, (pageWidth - tituloWidth) / 2, y);
    y += 10;

    if (maquinaria.foto_url) {
      try {
        const response = await fetch(maquinaria.foto_url);
        const blob = await response.blob();
        const dataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });

        const img = new Image();
        img.src = dataUrl;

        await new Promise((resolve) => {
          img.onload = () => resolve();
        });

        const imgX = 20;
        const imgY = y;
        const imgWidth = 60;
        const aspectRatio = img.height / img.width;
        const imgHeight = imgWidth * aspectRatio;

        doc.addImage(dataUrl, "JPEG", imgX, imgY, imgWidth, imgHeight);

        const textX = imgX + imgWidth + 10;
        let textY = imgY + 5;

        doc.setFontSize(11);
        const info = [
          `Marca: ${maquinaria.marca}`,
          `Modelo: ${maquinaria.modelo}`,
          `Año: ${maquinaria.anio}`,
          `Tipo: ${maquinaria.tipo}`,
          `Combustible: ${maquinaria.combustible}`,
          `Ubicación: ${maquinaria.ubicacion}`,
          `Responsable: ${maquinaria.responsable || "No asignado"}`
        ];

        info.forEach((line) => {
          doc.text(line, textX, textY);
          textY += 6;
        });

        y = Math.max(imgY + imgHeight, textY) + 10;
      } catch (e) {
        console.warn("No se pudo cargar la imagen de la máquina:", e.message);
      }
    }

   // Tabla de historial
autoTable(doc, {
  startY: y,
  head: [["Fecha", "Responsable", "Horómetro", "Duración", "Combustible", "Estado", "Comentario", "Lugar de trabajo"]],
  body: reportes.map((r) => {
    const inicio = r.hora_inicio ? new Date(r.hora_inicio) : null;
    const fecha = inicio
      ? inicio.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })
      : "";

    const duracion =
      r.horometro_final !== null && r.horometro_inicial !== null
        ? (parseFloat(r.horometro_final) - parseFloat(r.horometro_inicial)).toFixed(2) + " h"
        : "";

    return [
      fecha,
      r.responsable || "",
      r.horometro_inicial !== null && r.horometro_final !== null
        ? `${r.horometro_inicial} - ${r.horometro_final}`
        : "",
      duracion,
      r.combustible_usado ?? "",
      r.estado_fisico || "",
      r.comentario || "",
      r.lugar_trabajo || ""
    ];
  }),
  styles: {
    fontSize: 9,
    cellPadding: 3,
    lineColor: [0, 0, 0],       
    lineWidth: 0.1,           
    valign: 'middle',
    textColor: [0, 0, 0]
  },
  headStyles: {
    fillColor: [41, 128, 185],
    textColor: [255, 255, 255],
    lineColor: [0, 0, 0],
    lineWidth: 0.2
  },
  alternateRowStyles: {
    fillColor: [245, 245, 245]
  },
  tableLineColor: [0, 0, 0],
  tableLineWidth: 0.1
});


    const fechaHoy = new Date().toLocaleDateString();
    doc.setFontSize(10);
    doc.text(`Generado el ${fechaHoy}`, 14, pageHeight - 10);
    doc.save(`Historial_${maquinaria.marca || maquinaria.tipo}.pdf`);
  };

  return (
    <div
      className="w-full overflow-hidden transition-all duration-500 ease-in-out"
      style={{ maxHeight: reportes.length > 0 ? "1000px" : "300px" }}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">📄 Trabajos realizados</h2>
        <button
          onClick={exportarPDF}
          className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm"
        >
          Exportar a PDF
        </button>
      </div>

      {reportes.length === 0 ? (
        <p>No hay reportes registrados para esta máquina.</p>
      ) : (
        <div className="max-h-[300px] overflow-y-auto border rounded shadow transition-all duration-500 ease-in-out">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr>
                <th className="border px-2 py-2">Fecha</th>
                <th className="border px-2 py-2">Responsable</th>
                <th className="border px-2 py-2">Horómetro</th>
                <th className="border px-2 py-2">Duración</th>
                <th className="border px-2 py-2">Combustible</th>
                <th className="border px-2 py-2">Estado</th>
                <th className="border px-2 py-2">Comentario</th>
                <th className="border px-2 py-2">Lugar de trabajo</th>
              </tr>
            </thead>
            <tbody>
              {reportes.map((r, i) => {
                const inicio = r.hora_inicio ? new Date(r.hora_inicio) : null;
                const fechaFormateada = inicio
                  ? inicio.toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })
                  : "";

                const duracionHoras =
                  r.horometro_final !== null && r.horometro_inicial !== null
                    ? (parseFloat(r.horometro_final) - parseFloat(r.horometro_inicial)).toFixed(2) + " h"
                    : "";

                return (
                  <tr key={i} className="even:bg-gray-50 hover:bg-blue-50">
                    <td className="border px-2 py-2">{fechaFormateada}</td>
                    <td className="border px-2 py-2">{r.responsable || ""}</td>
                    <td className="border px-2 py-2">
                      {r.horometro_inicial !== null && r.horometro_final !== null
                        ? `${r.horometro_inicial} - ${r.horometro_final}`
                        : ""}
                    </td>
                    <td className="border px-2 py-2">{duracionHoras}</td>
                    <td className="border px-2 py-2">{r.combustible_usado ?? ""}</td>
                    <td className="border px-2 py-2">{r.estado_fisico || ""}</td>
                    <td className="border px-2 py-2">{r.comentario || ""}</td>
                    <td className="border px-2 py-2">{r.lugar_trabajo || ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
