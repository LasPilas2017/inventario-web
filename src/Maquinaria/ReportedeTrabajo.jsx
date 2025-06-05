import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";

export default function ReportedeTrabajo({ maquinaria, volver, onFinalizado }) {
  const [trabajoEnCurso, setTrabajoEnCurso] = useState(null);
  const [horometroInicial, setHorometroInicial] = useState("0");
  const [horometroFinal, setHorometroFinal] = useState("");
  const [estado, setEstado] = useState("Funcional");
  const [comentario, setComentario] = useState("");
  const [combustible, setCombustible] = useState("");
  const [lugarTrabajo, setLugarTrabajo] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const fetchTrabajo = async () => {
      const { data, error } = await supabase
        .from("reporte_trabajo_persona")
        .select("*")
        .eq("id_maquinaria", maquinaria.id)
        .is("hora_final", null)
        .order("hora_inicio", { ascending: false })
        .limit(1);

      if (!error && data.length > 0) {
        setTrabajoEnCurso(data[0]);

        const { data: prev, error: err2 } = await supabase
          .from("reporte_trabajo_persona")
          .select("horometro_final")
          .eq("id_maquinaria", maquinaria.id)
          .not("horometro_final", "is", null)
          .order("hora_final", { ascending: false })
          .limit(1);

        if (!err2 && prev.length > 0) setHorometroInicial(prev[0].horometro_final);
      }
    };
    if (maquinaria) fetchTrabajo();
  }, [maquinaria]);

  const finalizarTrabajo = async () => {
    if (!trabajoEnCurso) return;
    if (estado === "Revisar" && comentario.trim() === "") {
      alert("Por favor, escribe un comentario si se requiere revisión.");
      return;
    }

    setGuardando(true);
    const horaFinal = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("reporte_trabajo_persona")
      .update({
        hora_final: horaFinal,
        horometro_inicial: parseFloat(horometroInicial),
        horometro_final: parseFloat(horometroFinal),
        estado_fisico: estado,
        comentario: comentario,
        combustible_usado: parseFloat(combustible),
        lugar_trabajo: lugarTrabajo,
      })
      .eq("id", trabajoEnCurso.id);

    if (updateError) {
      alert("Ocurrió un error al guardar el reporte.");
    } else {
      alert("Trabajo finalizado correctamente.");
      if (onFinalizado) await onFinalizado();
      volver();
    }
    setGuardando(false);
  };

  const calcularHorasTrabajadas = () => {
    const final = parseFloat(horometroFinal);
    const inicial = parseFloat(horometroInicial);
    if (!isNaN(final) && !isNaN(inicial)) {
      return (final - inicial).toFixed(2);
    }
    return "-";
  };

  if (!maquinaria || !trabajoEnCurso) return null;

  return (
    <div className="bg-white p-4 rounded shadow-md w-full">
      <h2 className="text-xl font-bold mb-4">
        Finalizar trabajo para: #{maquinaria.numero} - {maquinaria.marca}
      </h2>

      <div className="mb-3">
        <label className="block font-medium">Horómetro inicial:</label>
        <input
          type="number"
          value={horometroInicial}
          readOnly
          className="w-full px-3 py-1 border rounded bg-gray-100"
        />
      </div>

      <div className="mb-3">
        <label className="block font-medium">Horómetro final:</label>
        <input
          type="number"
          value={horometroFinal}
          onChange={(e) => setHorometroFinal(e.target.value)}
          className="w-full px-3 py-1 border rounded"
          placeholder="Ingrese horómetro final"
        />
        <p className="text-sm text-gray-600 mt-1">
          Total de horas trabajadas: <strong>{calcularHorasTrabajadas()} h</strong>
        </p>
      </div>

      <div className="mb-3">
        <label className="block font-medium">Estado físico:</label>
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          className="w-full px-3 py-1 border rounded"
        >
          <option value="Funcional">Funcional</option>
          <option value="Revisar">Revisar</option>
        </select>
      </div>

      {estado === "Revisar" && (
        <div className="mb-3">
          <label className="block font-medium">Comentario:</label>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            className="w-full px-3 py-1 border rounded"
            rows="2"
            placeholder="Describa el problema o lo que necesita revisión"
          ></textarea>
        </div>
      )}

      <div className="mb-3">
        <label className="block font-medium">Combustible usado (gal):</label>
        <input
          type="number"
          value={combustible}
          onChange={(e) => setCombustible(e.target.value)}
          className="w-full px-3 py-1 border rounded"
          placeholder="Galones utilizados"
        />
      </div>

      <div className="mb-3">
        <label className="block font-medium">Lugar de trabajo:</label>
        <input
          type="text"
          value={lugarTrabajo}
          onChange={(e) => setLugarTrabajo(e.target.value)}
          className="w-full px-3 py-1 border rounded"
          placeholder="Ej. Zona norte, entrada, etc."
        />
      </div>

      <div className="flex gap-3 mt-4">
        <button
          onClick={finalizarTrabajo}
          disabled={guardando}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Finalizar Trabajo
        </button>
        <button
          onClick={volver}
          className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
