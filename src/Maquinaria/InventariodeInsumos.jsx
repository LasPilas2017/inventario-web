import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";

export default function InventariodeInsumos({ volver }) {
  const [vista, setVista] = useState("tabla");
  const [nombre, setNombre] = useState("");
  const [numeroParte, setNumeroParte] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [unidad, setUnidad] = useState("");
  const [comentario, setComentario] = useState("");
  const [foto, setFoto] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [articulos, setArticulos] = useState([]);
  const [maquinarias, setMaquinarias] = useState([]);
  const [articuloSeleccionado, setArticuloSeleccionado] = useState(null);
  const [historialEntradas, setHistorialEntradas] = useState([]);
  const [historialSalidas, setHistorialSalidas] = useState([]);
  const [maquinariaId, setMaquinariaId] = useState("");
  const [cantidadEntrega, setCantidadEntrega] = useState("");
  const [comentarioEntrega, setComentarioEntrega] = useState("");
  const [fotoEntrega, setFotoEntrega] = useState(null);
  const [fechaEntrega, setFechaEntrega] = useState(new Date().toISOString().slice(0, 10));
  const [cantidadIngresada, setCantidadIngresada] = useState("");
  const [comentarioIngreso, setComentarioIngreso] = useState("");
  const [fechaIngreso, setFechaIngreso] = useState(new Date().toISOString().slice(0, 10));
  const [fotoIngreso, setFotoIngreso] = useState(null); // si vas a subir foto en ingreso

  useEffect(() => {
    cargarArticulos();
    cargarMaquinarias();
  }, []);

  const cargarArticulos = async () => {
    const { data, error } = await supabase.from("insumos_maquinaria").select("*").order("id", { ascending: false });
    if (!error) setArticulos(data);
  };

  const cargarMaquinarias = async () => {
    const { data } = await supabase.from("maquinaria").select("id, numero, marca");
    setMaquinarias(data || []);
  };

 const guardarArticulo = async () => {
if (!cantidad) {
    alert("Debes ingresar la cantidad.");
    return;
  }

  setGuardando(true);
  let urlFoto = "";

  if (fotoIngreso) {
    const { data, error: uploadError } = await supabase.storage
      .from("fotos-insumos")
      .upload(`ingreso_${Date.now()}`, fotoIngreso);
    if (!uploadError) {
      urlFoto = supabase.storage
        .from("fotos-insumos")
        .getPublicUrl(data.path).data.publicUrl;
    }
  }

  let articuloId = articuloSeleccionado?.id;

  if (!articuloSeleccionado) {
    const { data, error } = await supabase
      .from("insumos_maquinaria")
      .insert([
        {
          nombre,
          numero_parte: numeroParte,
          cantidad: parseFloat(cantidad),
          unidad,
          comentario,
          foto_url: urlFoto,
        },
      ])
      .select();
    articuloId = data?.[0]?.id;
  } else {
    await supabase
      .from("insumos_maquinaria")
      .update({
        cantidad: articuloSeleccionado.cantidad + parseFloat(cantidadIngresada),
      })
      .eq("id", articuloId);
  }

  await supabase.from("historial_insumos_maquinaria").insert([
    {
      id_insumo: articuloId,
      tipo: "entrada",
      cantidad: parseFloat(cantidadIngresada),
      observacion: comentarioIngreso,
      fecha: fechaIngreso,
      foto_url: urlFoto,
      id_maquinaria: null,
    },
  ]);

  // Reset
  setCantidadIngresada("");
  setComentarioIngreso("");
  setFechaIngreso(new Date().toISOString().slice(0, 10));
  setFotoIngreso(null);
  setNombre("");
  setNumeroParte("");
  setUnidad("");
  setComentario("");
  setFoto(null);
  setArticuloSeleccionado(null);
  setVista("tabla");
  cargarArticulos();
  setGuardando(false);
    };


const entregarArticulo = async () => {
  if (!articuloSeleccionado || !cantidadEntrega || !maquinariaId) {
    alert("Completa todos los campos.");
    return;
  }

  if (cantidadEntrega > articuloSeleccionado.cantidad) {
    alert("No hay suficiente inventario disponible.");
    return;
  }

  let foto_url = "";
  if (fotoEntrega) {
    const { data, error } = await supabase.storage
      .from("fotos-insumos")
      .upload(`salida_${Date.now()}`, fotoEntrega);
    if (!error) {
      foto_url = supabase.storage
        .from("fotos-insumos")
        .getPublicUrl(data.path).data.publicUrl;
    }
  }

  const { error: insertError } = await supabase
    .from("historial_insumos_maquinaria")
    .insert([
      {
        id_insumo: articuloSeleccionado.id,
        cantidad: parseFloat(cantidadEntrega),
        tipo: "salida", // asegurate que esté en minúscula por el CHECK
        observacion: comentarioEntrega,
        foto_url,
        fecha: fechaEntrega,
        id_maquinaria: maquinariaId
      }
    ]);

  if (insertError) {
    console.error("Error al guardar el historial:", insertError);
    alert("Ocurrió un error al guardar el historial.");
    return;
  }

  await supabase
    .from("insumos_maquinaria")
    .update({
      cantidad: articuloSeleccionado.cantidad - parseFloat(cantidadEntrega)
    })
    .eq("id", articuloSeleccionado.id);

  // Reset campos
  setCantidadEntrega("");
  setComentarioEntrega("");
  setFotoEntrega(null);
  setFechaEntrega(new Date().toISOString().slice(0, 10));
  setVista("tabla");
  cargarArticulos();
};



const verDetalle = async (item) => {
  setArticuloSeleccionado(item);
  setVista("detalle");

  const { data: entradas, error: errorEntradas } = await supabase
    .from("historial_insumos_maquinaria")
    .select("*, maquinaria:maquinaria(numero)") // left join implícito
    .eq("id_insumo", item.id)
    .eq("tipo", "entrada")
    .order("id", { ascending: false });

  const { data: salidas, error: errorSalidas } = await supabase
    .from("historial_insumos_maquinaria")
    .select("*, maquinaria:maquinaria(numero)") // left join implícito
    .eq("id_insumo", item.id)
    .eq("tipo", "salida")
    .order("id", { ascending: false });

  if (errorEntradas || errorSalidas) {
    console.error("Error al obtener historial:", errorEntradas || errorSalidas);
    alert("Error al cargar el historial del artículo.");
    return;
  }

  setHistorialEntradas(entradas || []);
  setHistorialSalidas(salidas || []);
};





  return (
    <div className="relative bg-white p-6 rounded-xl shadow-xl max-w-6xl w-full mx-auto mt-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Inventario de Insumos</h2>
        {vista === "tabla" && (
          <div className="flex gap-2">
            <button onClick={() => setVista("entrega")} className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700">Entrega de Artículo</button>
            <button onClick={() => setVista("formulario")} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Ingresar Artículo</button>
          </div>
        )}
        {vista !== "tabla" && (
          <button onClick={() => { setVista("tabla"); setArticuloSeleccionado(null); }} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">Regresar</button>
        )}
      </div>

      {vista === "tabla" && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border">
            <thead className="bg-gray-200">
              <tr>
                <th className="border px-3 py-2">Nombre</th>
                <th className="border px-3 py-2">No. Parte</th>
                <th className="border px-3 py-2">Cantidad</th>
                <th className="border px-3 py-2">Unidad</th>
                <th className="border px-3 py-2">Comentario</th>
                <th className="border px-3 py-2">Foto</th>
              </tr>
            </thead>
            <tbody>
              {articulos.map((item) => (
                <tr key={item.id} className="hover:bg-gray-100 cursor-pointer" onClick={() => verDetalle(item)}>
                  <td className="border px-3 py-2">{item.nombre}</td>
                  <td className="border px-3 py-2">{item.numero_parte}</td>
                  <td className="border px-3 py-2">{item.cantidad}</td>
                  <td className="border px-3 py-2">{item.unidad}</td>
                  <td className="border px-3 py-2">{item.comentario}</td>
                  <td className="border px-3 py-2">{item.foto_url && <img src={item.foto_url} className="w-16 h-16 object-cover" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    {vista === "formulario" && (
  <div className="mt-6">
    <select
      onChange={(e) => {
        const id = parseInt(e.target.value);
        const art = articulos.find(a => a.id === id);
        setArticuloSeleccionado(art);
        setNombre(art?.nombre || "");
        setNumeroParte(art?.numero_parte || "");
        setUnidad(art?.unidad || "");
      }}
      className="w-full border px-3 py-2 rounded mb-3"
    >
      <option value="">-- Seleccionar Artículo Existente o dejar vacío --</option>
      {articulos.map((a) => (
        <option key={a.id} value={a.id}>{a.nombre} - {a.numero_parte}</option>
      ))}
    </select>

    {!articuloSeleccionado && (
      <>
        <input type="text" placeholder="Nombre del artículo" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full border px-3 py-2 rounded mb-3" />
        <input type="text" placeholder="No. de Parte" value={numeroParte} onChange={(e) => setNumeroParte(e.target.value)} className="w-full border px-3 py-2 rounded mb-3" />
        <input type="text" placeholder="Unidad" value={unidad} onChange={(e) => setUnidad(e.target.value)} className="w-full border px-3 py-2 rounded mb-3" />
        <input type="file" accept="image/*" onChange={(e) => setFoto(e.target.files[0])} className="mb-4" />
      </>
    )}

    <input
      type="number"
      placeholder="Cantidad a ingresar"
      value={cantidadIngresada}
      onChange={(e) => setCantidadIngresada(e.target.value)}
      className="w-full border px-3 py-2 rounded mb-3"
    />

    <textarea
            placeholder="Comentario"
            value={articuloSeleccionado ? comentarioIngreso : comentario}
            onChange={(e) => {
                if (articuloSeleccionado) {
                setComentarioIngreso(e.target.value);
                } else {
                setComentario(e.target.value);
                }
            }}
            className="w-full border px-3 py-2 rounded mb-3"
            />


    <button
      onClick={guardarArticulo}
      disabled={guardando}
      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
    >
      {guardando ? "Guardando..." : "Guardar"}
    </button>
  </div>
)}
 

{vista === "entrega" && (
  <div className="mt-6">
    <select
      onChange={(e) => {
        const id = parseInt(e.target.value);
        const art = articulos.find(a => a.id === id);
        setArticuloSeleccionado(art);
      }}
      className="w-full border px-3 py-2 rounded mb-3"
    >
      <option value="">-- Seleccionar artículo para entregar --</option>
      {articulos.map((a) => (
        <option key={a.id} value={a.id}>{a.nombre} - {a.numero_parte}</option>
      ))}
    </select>

    {articuloSeleccionado ? (
      <p className="font-bold">
        {articuloSeleccionado.nombre} - Existencia: {articuloSeleccionado.cantidad}
      </p>
    ) : (
      <p className="text-gray-500 italic">Selecciona un artículo para ver su existencia</p>
    )}

    <select value={maquinariaId} onChange={(e) => setMaquinariaId(e.target.value)} className="w-full border px-3 py-2 rounded mb-3">
      <option value="">-- Selecciona maquinaria --</option>
      {maquinarias.map(m => (
        <option key={m.id} value={m.id}>{m.numero} - {m.marca}</option>
      ))}
    </select>

    <input
      type="number"
      placeholder="Cantidad a entregar"
      value={cantidadEntrega}
      onChange={(e) => setCantidadEntrega(e.target.value)}
      className="w-full border px-3 py-2 rounded mb-3"
    />

    <textarea
      placeholder="Comentario"
      value={comentarioEntrega}
      onChange={(e) => setComentarioEntrega(e.target.value)}
      className="w-full border px-3 py-2 rounded mb-3"
    />

    <input
      type="date"
      value={fechaEntrega}
      onChange={(e) => setFechaEntrega(e.target.value)}
      className="w-full border px-3 py-2 rounded mb-3"
    />

    <input
      type="file"
      accept="image/*"
      onChange={(e) => setFotoEntrega(e.target.files[0])}
      className="mb-4"
    />

    <button
      onClick={entregarArticulo}
      className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
    >
      Registrar Entrega
    </button>
  </div>
)}

{vista === "detalle" && articuloSeleccionado && (
  <div className="mt-6">
    <h3 className="text-xl font-bold mb-4">
      Historial de movimientos: {articuloSeleccionado?.nombre}
    </h3>

    {articuloSeleccionado.foto_url && (
      <img
        src={articuloSeleccionado.foto_url}
        className="w-48 h-48 object-cover rounded mb-4 mx-auto"
        alt="Foto del artículo"
      />
    )}

    {(() => {
      const historialCompleto = [...historialEntradas, ...historialSalidas].sort(
        (a, b) => new Date(b.fecha) - new Date(a.fecha)
      );
      return (
        <table className="w-full text-sm mt-4 border">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2 text-left">Fecha</th>
              <th className="p-2 text-left">Tipo</th>
              <th className="p-2 text-left">Cantidad</th>
              <th className="p-2 text-left">No. de Maquina</th>
              <th className="p-2 text-left">Observación</th>
            </tr>
          </thead>
          <tbody>
            {historialCompleto.map((h) => (
              <tr key={h.id} className="border-t">
                <td className="p-2">{h.fecha}</td>
                <td className="p-2 capitalize">{h.tipo}</td>
                <td className="p-2">{h.cantidad}</td>
                <td className="p-2">{h.maquinaria?.numero || "—"}</td>
                <td className="p-2">{h.observacion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    })()}
  </div>
)}


  


    </div>
  );
}
