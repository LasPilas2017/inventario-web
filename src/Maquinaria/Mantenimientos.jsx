import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Mantenimientos({ maquinaria, volver }) {
  const [vista, setVista] = useState("formulario");
  const [tipoMantenimiento, setTipoMantenimiento] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [responsable, setResponsable] = useState("");
  const [cambios, setCambios] = useState([{ articulo: "", cantidad: "" }]);
  const [guardando, setGuardando] = useState(false);
  const [mantenimientosFiltrados, setMantenimientosFiltrados] = useState([]);
  const tipoMaquina = maquinaria?.tipo || "";

  useEffect(() => {
    if (tipoMaquina) cargarMantenimientosPorMaquina();
  }, [tipoMaquina]);

  const cargarMantenimientosPorMaquina = async () => {
    const { data, error } = await supabase
      .from("mantenimiento_maquinaria")
      .select("*")
      .eq("tipo_maquina", tipoMaquina)
      .order("fecha", { ascending: false });

    if (!error) setMantenimientosFiltrados(data);
  };

  const agregarCambio = () => {
    setCambios([...cambios, { articulo: "", cantidad: "" }]);
  };

  const actualizarCambio = (index, campo, valor) => {
    const nuevosCambios = [...cambios];
    nuevosCambios[index][campo] = valor;
    setCambios(nuevosCambios);
  };

  const guardarMantenimiento = async () => {
    if (!tipoMaquina || !tipoMantenimiento || !responsable) {
      alert("Todos los campos principales son obligatorios");
      return;
    }

    setGuardando(true);

    const { error } = await supabase.from("mantenimiento_maquinaria").insert([
      {
        tipo_maquina: tipoMaquina,
        tipo_mantenimiento: tipoMantenimiento,
        fecha,
        responsable,
        cambios: cambios.filter(c => c.articulo || c.cantidad)
      }
    ]);

    if (error) {
      console.error(error);
      alert("Error al guardar el mantenimiento");
    } else {
      alert("Mantenimiento registrado exitosamente");
      setTipoMantenimiento("");
      setResponsable("");
      setCambios([{ articulo: "", cantidad: "" }]);
      cargarMantenimientosPorMaquina();
      setVista("tabla");
    }

    setGuardando(false);
  };

  const exportarPDF = async () => {
    const doc = new jsPDF();

    const logo = await fetch("/img/LOGOTUNCAJ.png")
      .then(res => res.blob())
      .then(blob => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      }));

    doc.addImage(logo, "PNG", 14, 10, 30, 15);
    doc.setFontSize(16);
    doc.text("Historial de Mantenimientos", 50, 20);

    autoTable(doc, {
      startY: 30,
      head: [["Fecha", "Tipo", "Responsable", "Artículos"]],
      body: mantenimientosFiltrados.map((m) => [
        m.fecha,
        m.tipo_mantenimiento,
        m.responsable,
        (m.cambios || []).map(c => `${c.articulo} - ${c.cantidad}`).join("\n")
      ]),
      styles: { fontSize: 10, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185] },
    });

    const fechaHoy = new Date().toLocaleDateString();
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.text(`Generado el ${fechaHoy}`, 14, pageHeight - 10);

    doc.save(`Mantenimientos_${tipoMaquina}.pdf`);
  };

  return (
    <div className="p-4 max-w-5xl mx-auto bg-white rounded shadow transition-all duration-500 ease-in-out">
      <div className="flex justify-center gap-4 mb-6">
        <div
          className={`cursor-pointer border px-6 py-4 rounded shadow w-64 text-center transition-all duration-200 ${vista === "formulario" ? "bg-blue-100 font-bold" : "bg-white"}`}
          onClick={() => setVista("formulario")}
        >
          Ingresar Mantenimiento
        </div>
        <div
          className={`cursor-pointer border px-6 py-4 rounded shadow w-64 text-center transition-all duration-200 ${vista === "tabla" ? "bg-blue-100 font-bold" : "bg-white"}`}
          onClick={() => setVista("tabla")}
        >
          Ver Mantenimientos
        </div>
      </div>

      <div className={`transition-all duration-500 ease-in-out ${vista === "formulario" ? "max-h-[2000px] opacity-100" : "max-h-0 overflow-hidden opacity-0"}`}>
        <h2 className="text-2xl font-bold mb-4">Registro de Mantenimiento</h2>
        <div className="mb-4">
          <label className="block font-medium mb-1">Fecha:</label>
          <input type="date" className="w-full border rounded px-3 py-2" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <div className="mb-4">
          <label className="block font-medium mb-1">Responsable:</label>
          <input type="text" className="w-full border rounded px-3 py-2" placeholder="Nombre del responsable" value={responsable} onChange={(e) => setResponsable(e.target.value)} />
        </div>
        <div className="mb-4">
          <label className="block font-medium mb-1">Tipo de máquina:</label>
          <input type="text" className="w-full border rounded px-3 py-2 bg-gray-100" value={tipoMaquina} disabled />
        </div>

        {tipoMaquina && (
          <div className="mb-4">
            <label className="block font-medium mb-1">Tipo de mantenimiento:</label>
            <select className="w-full border rounded px-3 py-2" value={tipoMantenimiento} onChange={(e) => setTipoMantenimiento(e.target.value)}>
              <option value="">-- Seleccionar --</option>
              <option value="Preventivo">Preventivo</option>
              <option value="Correctivo">Correctivo</option>
            </select>
          </div>
        )}

        {tipoMantenimiento && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Artículos cambiados</h3>
            {cambios.map((cambio, index) => (
              <div key={index} className="flex gap-3 mb-3">
                <input
                  type="text"
                  className="flex-1 border rounded px-3 py-2"
                  placeholder="Artículo cambiado"
                  value={cambio.articulo}
                  onChange={(e) => actualizarCambio(index, "articulo", e.target.value)}
                />
                <input
                  type="text"
                  className="w-24 border rounded px-3 py-2"
                  placeholder="Cantidad"
                  value={cambio.cantidad}
                  onChange={(e) => actualizarCambio(index, "cantidad", e.target.value)}
                />
              </div>
            ))}
            <button type="button" className="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600" onClick={agregarCambio}>
              Ingresar más artículos
            </button>
          </div>
        )}

        <button onClick={guardarMantenimiento} disabled={guardando} className="mt-4 bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700">
          Guardar Mantenimiento
        </button>
      </div>

      <div className={`transition-all duration-500 ease-in-out ${vista === "tabla" ? "max-h-[2000px] opacity-100 mt-6" : "max-h-0 overflow-hidden opacity-0"}`}>
        <h3 className="text-xl font-bold mb-4">Historial de Mantenimientos</h3>
        <button onClick={exportarPDF} className="mb-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
          Exportar a PDF
        </button>

        {mantenimientosFiltrados.length === 0 ? (
          <p>No hay mantenimientos registrados para esta máquina.</p>
        ) : (
          <div className="max-h-[300px] overflow-y-auto border rounded shadow">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr>
                  <th className="border px-2 py-2 text-left">Fecha</th>
                  <th className="border px-2 py-2 text-left">Tipo</th>
                  <th className="border px-2 py-2 text-left">Responsable</th>
                  <th className="border px-2 py-2 text-left">Artículos</th>
                </tr>
              </thead>
              <tbody>
                {mantenimientosFiltrados.map((m, i) => (
                  <tr key={i} className="even:bg-gray-50 hover:bg-blue-50">
                    <td className="border px-2 py-2">{m.fecha}</td>
                    <td className="border px-2 py-2">{m.tipo_mantenimiento}</td>
                    <td className="border px-2 py-2">{m.responsable}</td>
                    <td className="border px-2 py-2">
                      <ul className="list-disc pl-4">
                        {m.cambios?.map((c, j) => (
                          <li key={j}>{c.articulo} - {c.cantidad}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6">
        <button onClick={volver} className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600">
          Regresar
        </button>
      </div>
    </div>
  );
}
