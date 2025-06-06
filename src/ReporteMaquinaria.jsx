import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import IngresoMaquinaria from "./Maquinaria/IngresoMaquinaria";
import ReportedeTrabajo from "./Maquinaria/ReportedeTrabajo";
import Mantenimientos from "./Maquinaria/Mantenimientos";
import MostrarTrabajo from "./Maquinaria/MostrarTrabajo";
import { supabase } from "./supabase";
import MovimientodeMaquinaria from "./Maquinaria/MovimientodeMaquinaria";
import InventariodeInsumos from "./Maquinaria/InventariodeInsumos";

export default function ReporteMaquinaria() {
  const [vista, setVista] = useState("menu");
  const [maquinarias, setMaquinarias] = useState([]);
  const [maquinariaSeleccionada, setMaquinariaSeleccionada] = useState(null);
  const [mostrarSeccion, setMostrarSeccion] = useState("");
  const [maquinasEnTrabajo, setMaquinasEnTrabajo] = useState([]);
  const [maquinaParaFinalizar, setMaquinaParaFinalizar] = useState(null);
  const [refrescarHistorial, setRefrescarHistorial] = useState(Date.now());

  const recargarMaquinasEnTrabajo = async () => {
    const { data: trabajos } = await supabase
      .from("reporte_trabajo_persona")
      .select("id_maquinaria")
      .is("hora_final", null);

    if (trabajos) {
      const enTrabajo = trabajos.map((t) => t.id_maquinaria);
      setMaquinasEnTrabajo(enTrabajo);
    }
  };

  const recargarTodo = async () => {
    const { data } = await supabase.from("maquinaria").select("*").order("id", { ascending: false });
    setMaquinarias(data);
    await recargarMaquinasEnTrabajo();
  };

  const iniciarTrabajoPersona = async (id, responsable) => {
    if (!responsable || responsable === "No asignado" || responsable.trim() === "") {
      alert("Debe asignar un responsable antes de iniciar el trabajo.");
      return;
    }

    const horaActual = new Date().toISOString();

    const { data: prev } = await supabase
      .from("reporte_trabajo_persona")
      .select("horometro_final")
      .eq("id_maquinaria", id)
      .not("horometro_final", "is", null)
      .order("hora_final", { ascending: false })
      .limit(1);

    const horometroInicial = prev?.[0]?.horometro_final || 0;

    const { error } = await supabase.from("reporte_trabajo_persona").insert([
      {
        id_maquinaria: id,
        hora_inicio: horaActual,
        responsable,
        horometro_inicial: horometroInicial
      }
    ]);

    if (!error) {
      setMaquinasEnTrabajo((prev) => [...prev, id]);
      setMaquinaParaFinalizar(maquinarias.find(m => m.id === id));
      await recargarMaquinasEnTrabajo();
      setRefrescarHistorial(Date.now());
    } else {
      alert("Error al iniciar el trabajo.");
    }
  };

  useEffect(() => {
    recargarTodo();
  }, [vista]);

  const eliminarMaquinaria = async (id) => {
    if (confirm("¿Eliminar esta máquina?")) {
      await supabase.from("maquinaria").delete().eq("id", id);
      setMaquinarias(maquinarias.filter((m) => m.id !== id));
    }
  };

  return (
   <div className="px-4">
  {vista === "menu" && (
    <>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
          📋 Maquinaria Registrada
        </h2>

        <div className="flex gap-3">
          <button
            onClick={() => setVista("ingreso")}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow-md transition"
          >
            <span className="text-lg">➕</span> Agregar Máquina
          </button>
<div className="flex justify-between items-center mb-4"></div>
          {vista !== "insumos" ? (
            <button
              onClick={() => setVista("insumos")}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg shadow-md transition"
            >
              Ver Insumos
            </button>
          ) : (
            <button
              onClick={() => setVista("menu")}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg shadow-md transition"
            >
              Volver
            </button>
          
          )}
        </div>
      </div>

          <div className="flex flex-col gap-6 items-center">
            {maquinarias.map((m) => {
              const expandida = maquinariaSeleccionada?.id === m.id;
              const trabajando = maquinasEnTrabajo.includes(m.id);
              return (
                <motion.div
                  layout
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4 }}
                  className={`rounded-xl bg-white border overflow-hidden max-w-2xl w-full transition-all duration-300 ${
                    expandida ? "shadow-2xl border-blue-400 scale-[1.01]" : "shadow-md border-gray-200"
                  }`}
                >
                  <div className="flex p-3 gap-4 w-full items-start" onClick={() => setMaquinariaSeleccionada(expandida ? null : m)}>
                    <div className="flex flex-col items-center">
                      {m.foto_url && (
                        <img src={m.foto_url} alt="foto" className="w-36 h-32 object-cover rounded" />
                      )}
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (trabajando) {
                            setMaquinaParaFinalizar(m);
                            setMostrarSeccion("");
                          } else {
                            await iniciarTrabajoPersona(m.id, m.responsable || "Sin responsable");
                          }
                        }}
                        className={`mt-2 ${trabajando ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'} text-white text-sm py-1 px-2 rounded`}
                      >
                        {trabajando ? "Trabajando..." : "Iniciar Trabajo"}
                      </button>
                      <input
                        disabled={trabajando}
                        defaultValue={m.responsable || ""}
                        placeholder="Responsable"
                        className="w-full mt-1 text-xs border rounded px-2 py-1"
                        onClick={(e) => e.stopPropagation()}
                        onBlur={(e) => {
                          supabase.from("maquinaria").update({ responsable: e.target.value }).eq("id", m.id);
                        }}
                      />
                    </div>

                    <div className="text-sm text-gray-800 flex-1">
                      <h3 className="text-md font-bold mb-1">#{m.numero} - {m.marca}</h3>
                      <p><b>Modelo:</b> {m.modelo}</p>
                      <p><b>Año:</b> {m.anio}</p>
                      <p><b>Tipo:</b> {m.tipo}</p>
                      <p><b>Combustible:</b> {m.combustible}</p>
                      <p><b>Estado:</b> {m.estado}</p>
                      <p><b>Ubicación:</b> {m.ubicacion}</p>
                      <p><b>Responsable:</b> {m.responsable || "No asignado"}</p>
                    </div>

                    <AnimatePresence>
                      {expandida && (
                        <motion.div
                          initial={{ opacity: 0, x: 30, scale: 0.95 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={{ opacity: 0, x: 30, scale: 0.95 }}
                          transition={{ duration: 0.3 }}
                          className="min-w-[180px] flex flex-col items-center justify-center gap-2 px-2 py-3 bg-white rounded-lg shadow-md"
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMaquinaParaFinalizar(null);
                              setMostrarSeccion(mostrarSeccion === "mantenimiento" ? "" : "mantenimiento");
                            }}
                            className="bg-purple-500 text-white text-sm px-3 py-1 rounded-md w-full hover:bg-purple-600"
                          >
                            Registro de Mantenimiento
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMaquinaParaFinalizar(null);
                              setRefrescarHistorial(Date.now());
                              setMostrarSeccion(mostrarSeccion === "trabajo" ? "" : "trabajo");
                            }}
                            className="bg-gray-800 text-white text-sm px-3 py-1 rounded-md w-full hover:bg-gray-900"
                          >
                            Mostrar Trabajo
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMaquinaParaFinalizar(null);
                              setMostrarSeccion(mostrarSeccion === "movimiento" ? "" : "movimiento");
                            }}
                            className="bg-yellow-500 text-white text-sm px-3 py-1 rounded-md w-full hover:bg-yellow-600"
                          >
                            Mover a otra planta
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              eliminarMaquinaria(m.id);
                            }}
                            className="bg-red-600 text-white text-sm px-3 py-1 rounded-md w-full hover:bg-red-700"
                          >
                            Eliminar
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <AnimatePresence>
                    {expandida && mostrarSeccion === "mantenimiento" && (
                      <motion.div layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="px-4 pt-4">
                        <Mantenimientos maquinaria={m} volver={() => setMostrarSeccion("")} />
                      </motion.div>
                    )}

                    {expandida && mostrarSeccion === "trabajo" && (
                      <motion.div layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="px-4 pt-4">
                        <MostrarTrabajo maquinaria={m} refrescar={refrescarHistorial} />
                      </motion.div>
                    )}

                    {expandida && maquinaParaFinalizar?.id === m.id && (
                      <motion.div layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-4">
                        <ReportedeTrabajo
                          maquinaria={m}
                          volver={() => setMaquinaParaFinalizar(null)}
                         onFinalizado={async () => {
                            await recargarMaquinasEnTrabajo(); // ⬅ asegura que está actualizado desde la BD
                            setMaquinasEnTrabajo(prev => prev.filter(id => id !== m.id)); // ⬅ fuerza la limpieza visual
                            setMaquinaParaFinalizar(null);
                            setRefrescarHistorial(Date.now());
                            }}
                        />
                      </motion.div>
                    )}

                    {expandida && mostrarSeccion === "movimiento" && (
                      <motion.div layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="px-4 pt-4">
                        <MovimientodeMaquinaria maquinaria={m} volver={() => setMostrarSeccion("")} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

        
      {vista === "ingreso" && <IngresoMaquinaria volver={() => setVista("menu")} />}
      {vista === "insumos" && <InventariodeInsumos volver={() => setVista("menu")} />}
    </div>
  );
}