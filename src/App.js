import { useState, useEffect } from "react";
import { supabase } from "./supabase";

function App() {
  const [tab, setTab] = useState("inventario");
  const [materiales, setMateriales] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [formIngreso, setFormIngreso] = useState({ nombre: "", cantidad: "", contenedor: "", descripcion: "" });
  const [formSalida, setFormSalida] = useState({ nombre: "", cantidad: "", responsable: "", observacion: "" });
  const [nombresMateriales, setNombresMateriales] = useState([]);
  const [modoNuevoArticulo, setModoNuevoArticulo] = useState(false);
  const [coincidencias, setCoincidencias] = useState([]);

  useEffect(() => {
    obtenerInventario();
    obtenerHistorial();
  }, []);

  const normalizarNombre = (nombre) => nombre.trim().toLowerCase();

  const obtenerInventario = async () => {
    const { data, error } = await supabase.from("inventario").select("*");
    if (!error) {
      setMateriales(data);
      const nombres = [...new Set(data.map(item => normalizarNombre(item.nombre)))];
      setNombresMateriales(nombres);
    }
  };

  const obtenerHistorial = async () => {
    const { data, error } = await supabase.from("historial").select("*");
    if (!error) setHistorial(data);
  };

  const handleChangeIngreso = (e) => {
    const { name, value } = e.target;
    setFormIngreso({ ...formIngreso, [name]: value });

    if (name === "nombre" && modoNuevoArticulo) {
      const valorNormalizado = normalizarNombre(value);
      const similares = nombresMateriales.filter((nombre) =>
        normalizarNombre(nombre).includes(valorNormalizado)
      );
      setCoincidencias(similares);
    }
  };

  const handleChangeSalida = (e) => setFormSalida({ ...formSalida, [e.target.name]: e.target.value });

  const handleSubmitIngreso = async (e) => {
    e.preventDefault();
    const { nombre, cantidad, contenedor, descripcion } = formIngreso;
    if (!nombre || !cantidad) return alert("Por favor, completa los campos obligatorios");

    const nombreNormalizado = normalizarNombre(nombre);
    const cantidadNum = parseInt(cantidad);

    const nombreYaExiste = nombresMateriales.some(n => normalizarNombre(n) === nombreNormalizado);
    if (modoNuevoArticulo && nombreYaExiste) {
      return alert("Este artículo ya existe, por favor selecciona desde la lista.");
    }

    const { data: existente, error: fetchError } = await supabase
      .from("inventario")
      .select("*")
      .eq("nombre", nombreNormalizado)
      .maybeSingle();

    if (fetchError) return alert("Error al verificar existencia");

    if (existente) {
      const nuevaCantidad = parseInt(existente.cantidad) + cantidadNum;
      const { error: updateError } = await supabase
        .from("inventario")
        .update({ cantidad: nuevaCantidad })
        .eq("id", existente.id);
      if (updateError) return alert("Error al actualizar cantidad");
    } else {
      const { error: insertError } = await supabase
        .from("inventario")
        .insert([{ nombre: nombreNormalizado, cantidad: cantidadNum, contenedor, descripcion }]);
      if (insertError) return alert("Error al registrar nuevo material");
    }

    await supabase.from("historial").insert([{ tipo: "Ingreso", ...formIngreso, nombre: nombreNormalizado, fecha: new Date().toISOString(), responsable: "Sistema" }]);
    setFormIngreso({ nombre: "", cantidad: "", contenedor: "", descripcion: "" });
    obtenerInventario();
    obtenerHistorial();
  };

  const handleSubmitSalida = async (e) => {
    e.preventDefault();
    const { nombre, cantidad, responsable } = formSalida;
    if (!nombre || !cantidad || !responsable) return alert("Por favor, completa los campos obligatorios");

    const nombreNormalizado = normalizarNombre(nombre);
    const cantidadNum = parseInt(cantidad);

    const { data: existente, error: fetchError } = await supabase
      .from("inventario")
      .select("*")
      .eq("nombre", nombreNormalizado)
      .maybeSingle();

    if (fetchError || !existente) return alert("Material no encontrado en inventario");
    if (cantidadNum > existente.cantidad) return alert("Cantidad insuficiente en inventario");

    const nuevaCantidad = parseInt(existente.cantidad) - cantidadNum;
    const { error: updateError } = await supabase
      .from("inventario")
      .update({ cantidad: nuevaCantidad })
      .eq("id", existente.id);
    if (updateError) return alert("Error al actualizar cantidad");

    await supabase.from("historial").insert([{ tipo: "Salida", ...formSalida, nombre: nombreNormalizado, fecha: new Date().toISOString() }]);
    setFormSalida({ nombre: "", cantidad: "", responsable: "", observacion: "" });
    obtenerInventario();
    obtenerHistorial();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-2xl p-6">
        <h1 className="text-3xl font-bold text-center mb-6">📦 Sistema de Inventario de Bodegas</h1>

        <div className="flex justify-center gap-3 mb-6 flex-wrap">
          {["inventario", "ingreso", "salida", "historial"].map((tabName) => (
            <button key={tabName} onClick={() => setTab(tabName)} className={`px-4 py-2 rounded-lg ${tab === tabName ? "bg-blue-600 text-white" : "bg-gray-200"}`}>
              {tabName.charAt(0).toUpperCase() + tabName.slice(1)}
            </button>
          ))}
        </div>

        <div className="bg-gray-50 p-4 rounded-xl">
          {tab === "inventario" && (
            <div>
              <h2 className="text-xl font-semibold mb-4">📋 Tabla de Inventario</h2>
              {materiales.length === 0 ? (
                <p className="text-gray-500 italic">Aún no hay materiales ingresados.</p>
              ) : (
                <table className="w-full text-sm text-left border border-gray-300">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="px-4 py-2">Nombre</th>
                      <th className="px-4 py-2">Cantidad</th>
                      <th className="px-4 py-2">Contenedor</th>
                      <th className="px-4 py-2">Descripción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materiales.map((item, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-4 py-2">{item.nombre}</td>
                        <td className="px-4 py-2">{item.cantidad}</td>
                        <td className="px-4 py-2">{item.contenedor}</td>
                        <td className="px-4 py-2">{item.descripcion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === "ingreso" && (
            <form className="grid gap-3" onSubmit={handleSubmitIngreso}>
              <div className="flex flex-col gap-1">
                <div className="flex gap-2 items-center">
                  {modoNuevoArticulo ? (
                    <input
                      name="nombre"
                      value={formIngreso.nombre}
                      onChange={handleChangeIngreso}
                      className="p-2 border rounded w-full"
                      placeholder="Nombre del nuevo artículo"
                    />
                  ) : (
                    <select
                      name="nombre"
                      value={formIngreso.nombre}
                      onChange={handleChangeIngreso}
                      className="p-2 border rounded w-full"
                    >
                      <option value="">Selecciona un artículo</option>
                      {nombresMateriales.map((nombre) => (
                        <option key={nombre} value={nombre}>{nombre}</option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setModoNuevoArticulo(!modoNuevoArticulo);
                      setFormIngreso({ ...formIngreso, nombre: "" });
                      setCoincidencias([]);
                    }}
                    className="text-sm px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    {modoNuevoArticulo ? "↩️ Volver" : "➕ Nuevo"}
                  </button>
                </div>

                {modoNuevoArticulo && coincidencias.length > 0 && (
                  <ul className="bg-white border rounded text-sm text-gray-700 shadow-sm max-h-28 overflow-y-auto">
                    {coincidencias.map((item, i) => (
                      <li
                        key={i}
                        className="px-3 py-1 hover:bg-gray-100 cursor-pointer"
                        onClick={() => {
                          setFormIngreso({ ...formIngreso, nombre: item });
                          setModoNuevoArticulo(false);
                          setCoincidencias([]);
                        }}
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {["cantidad", "contenedor", "descripcion"].map((field) => (
                <input key={field} className="p-2 border rounded" placeholder={field} name={field} value={formIngreso[field]} onChange={handleChangeIngreso} />
              ))}
              <button type="submit" className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Registrar ingreso</button>
            </form>
          )}

          {tab === "salida" && (
            <form className="grid gap-3" onSubmit={handleSubmitSalida}>
              <select name="nombre" value={formSalida.nombre} onChange={handleChangeSalida} className="p-2 border rounded">
                <option value="">Selecciona un artículo</option>
                {nombresMateriales.map((nombre) => (
                  <option key={nombre} value={nombre}>{nombre}</option>
                ))}
              </select>
              {["cantidad", "responsable", "observacion"].map((field) => (
                <input key={field} className="p-2 border rounded" placeholder={field} name={field} value={formSalida[field]} onChange={handleChangeSalida} />
              ))}
              <button type="submit" className="bg-red-600 text-white py-2 rounded hover:bg-red-700">Registrar salida</button>
            </form>
          )}

          {tab === "historial" && (
            <div>
              <h2 className="text-xl font-semibold mb-4">🕓 Historial de Movimientos</h2>
              {historial.length === 0 ? (
                <p className="text-gray-500 italic">Aún no hay registros de movimiento.</p>
              ) : (
                <table className="w-full text-sm text-left border border-gray-300">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="px-4 py-2">Fecha</th>
                      <th className="px-4 py-2">Tipo</th>
                      <th className="px-4 py-2">Material</th>
                      <th className="px-4 py-2">Cantidad</th>
                      <th className="px-4 py-2">Responsable</th>
                      <th className="px-4 py-2">Observación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map((item, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-4 py-2">{item.fecha}</td>
                        <td className="px-4 py-2">{item.tipo}</td>
                        <td className="px-4 py-2">{item.nombre}</td>
                        <td className="px-4 py-2">{item.cantidad}</td>
                        <td className="px-4 py-2">{item.responsable}</td>
                        <td className="px-4 py-2">{item.observacion || item.descripcion || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
