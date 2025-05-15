import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import Login from "./Login";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function App() {
  // Estados de la aplicación
  const [usuario, setUsuario] = useState(null); // Usuario logueado
  const [tab, setTab] = useState("inventario"); // Pestaña activa
  const [materiales, setMateriales] = useState([]); // Inventario actual
  const [historial, setHistorial] = useState([]); // Historial de movimientos
  const [formIngreso, setFormIngreso] = useState({ nombre: "", cantidad: "", ubicacion: "", descripcion: "" }); // Formulario ingreso
  const [formSalida, setFormSalida] = useState({ nombre: "", cantidad: "", responsable: "", observacion: "" }); // Formulario salida
  const [nombresMateriales, setNombresMateriales] = useState([]); // Lista de nombres
  const [modoNuevoArticulo, setModoNuevoArticulo] = useState(false); // Modo de ingreso nuevo
  const [coincidencias, setCoincidencias] = useState([]); // Coincidencias en nombres
  const [detalleMaterial, setDetalleMaterial] = useState(null); // Material seleccionado para ver detalle
  const [historialFiltrado, setHistorialFiltrado] = useState([]); // Historial filtrado por material

  // Cierra sesión
  const cerrarSesion = () => setUsuario(null);

  // Obtiene datos al iniciar sesión
  useEffect(() => {
    if (usuario) {
      obtenerInventario();
      obtenerHistorial();
    }
  }, [usuario]);

  const normalizarNombre = (nombre) => nombre.trim().toLowerCase();

  // Obtiene inventario de Supabase
  const obtenerInventario = async () => {
    const { data, error } = await supabase.from("inventario").select("*");
    if (!error) {
      setMateriales(data);
      const nombres = [...new Set(data.map(item => normalizarNombre(item.nombre)))];
      setNombresMateriales(nombres);
    }
  };

  // Obtiene historial general
  const obtenerHistorial = async () => {
    const { data, error } = await supabase.from("historial").select("*");
    if (!error) {
      setHistorial(data);
      if (detalleMaterial) {
        const filtrado = data.filter((h) => normalizarNombre(h.nombre) === normalizarNombre(detalleMaterial.nombre));
        setHistorialFiltrado(filtrado);
      }
    }
  };

  // Manejo de formulario de ingreso
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

  // Manejo de formulario de salida
  const handleChangeSalida = (e) => setFormSalida({ ...formSalida, [e.target.name]: e.target.value });

  // Envío de formulario ingreso
  const handleSubmitIngreso = async (e) => {
    e.preventDefault();
    const { nombre, cantidad, ubicacion, descripcion } = formIngreso;
    if (!nombre || !cantidad) return alert("Por favor, completa los campos obligatorios");

    const nombreNormalizado = normalizarNombre(nombre);
    const cantidadNum = parseInt(cantidad);

    const { data: existente } = await supabase
      .from("inventario")
      .select("*")
      .eq("nombre", nombreNormalizado)
      .maybeSingle();

    if (existente) {
      const nuevaCantidad = parseInt(existente.cantidad) + cantidadNum;
      await supabase
        .from("inventario")
        .update({ cantidad: nuevaCantidad })
        .eq("id", existente.id);
    } else {
      await supabase
        .from("inventario")
        .insert([{ nombre: nombreNormalizado, cantidad: cantidadNum, ubicacion, descripcion }]);
    }

    await supabase.from("historial").insert([{
      tipo: "Ingreso",
      ...formIngreso,
      nombre: nombreNormalizado,
      fecha: new Date().toISOString(),
      responsable: usuario?.nombre || "Desconocido"
    }]);
    setFormIngreso({ nombre: "", cantidad: "", ubicacion: "", descripcion: "" });
    obtenerInventario();
    obtenerHistorial();
  };

  // Envío de formulario salida
  const handleSubmitSalida = async (e) => {
    e.preventDefault();
    const { nombre, cantidad } = formSalida;
    if (!nombre || !cantidad) return alert("Por favor, completa los campos obligatorios");

    const nombreNormalizado = normalizarNombre(nombre);
    const cantidadNum = parseInt(cantidad);

    const { data: existente } = await supabase
      .from("inventario")
      .select("*")
      .eq("nombre", nombreNormalizado)
      .maybeSingle();

    if (!existente) return alert("Material no encontrado en inventario");
    if (cantidadNum > existente.cantidad) return alert("Cantidad insuficiente en inventario");

    const nuevaCantidad = parseInt(existente.cantidad) - cantidadNum;
    await supabase
      .from("inventario")
      .update({ cantidad: nuevaCantidad })
      .eq("id", existente.id);

    await supabase.from("historial").insert([{
      tipo: "Salida",
      ...formSalida,
      nombre: nombreNormalizado,
      fecha: new Date().toISOString(),
      responsable: usuario?.nombre || formSalida.responsable
    }]);
    setFormSalida({ nombre: "", cantidad: "", responsable: "", observacion: "" });
    obtenerInventario();
    obtenerHistorial();
  };

  // Descargar PDF del inventario
  const descargarPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Inventario General", 14, 22);

    const datos = materiales.map((item) => [
      item.nombre,
      item.cantidad,
      item.ubicacion,
      item.descripcion,
    ]);

    autoTable(doc, {
      head: [["Nombre", "Cantidad", "Ubicación", "Descripción"]],
      body: datos,
      startY: 30,
    });

    doc.save("Inventario_Bodega.pdf");
  };

  // Login si no hay usuario
  if (!usuario) return <Login onLogin={setUsuario} />;

  // Define pestañas permitidas por tipo de usuario
  const pestañasPermitidas = usuario.rol === 'lectura'
    ? ["inventario", "historial"]
    : ["inventario", "ingreso", "salida", "historial"];

  // Vista principal del sistema
  return (
    <div className="relative min-h-screen bg-cover bg-center" style={{ backgroundImage: "url('/img/FONDOLASPILASAEREA.jpg')" }}>
      {/* Barra superior */}
      <div className="fixed top-0 left-0 w-full flex justify-between items-center bg-white/90 text-black px-4 py-2 shadow z-50">
        <span className="font-semibold">Usuario: {usuario.nombre} ({usuario.rol})</span>
        <button
          onClick={cerrarSesion}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded"
        >
          Cerrar sesión
        </button>
      </div>

      {/* Contenedor central */}
      <div className="pt-20 max-w-6xl mx-auto bg-white/90 shadow-lg rounded-2xl p-6 mt-4">
        {/* Logo y título */}
        <div className="flex justify-center items-center mb-6 gap-4">
          <img src="/img/LOGOTUNCAJ.png" alt="Logo" className="w-32 h-auto" />
          <h1 className="text-3xl font-bold text-center">📦 Sistema de Inventario de Bodegas</h1>
        </div>

        {/* Pestañas */}
        <div className="flex justify-center gap-3 mb-6 flex-wrap">
          {pestañasPermitidas.map((tabName) => (
            <button key={tabName} onClick={() => setTab(tabName)} className={`px-4 py-2 rounded-lg ${tab === tabName ? "bg-blue-600 text-white" : "bg-gray-200"}`}>
              {tabName.charAt(0).toUpperCase() + tabName.slice(1)}
            </button>
          ))}
        </div>

        
         {/* tabla del inventario*/}
          {tab === "inventario" && (
  <div>
    <h2 className="text-xl font-semibold mb-4">📋 Tabla de Inventario</h2>
    <button
      onClick={descargarPDF}
      className="mb-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
    >
      📄 Descargar PDF
    </button>
    {materiales.length === 0 ? (
      <p className="text-gray-500 italic">Aún no hay materiales ingresados.</p>
    ) : (
      <table className="w-full text-sm text-left border border-gray-300">
        <thead className="bg-gray-200">
          <tr>
            <th className="px-4 py-2">Nombre</th>
            <th className="px-4 py-2">Cantidad</th>
            <th className="px-4 py-2">Ubicación</th>
            <th className="px-4 py-2">Descripción</th>
          </tr>
        </thead>
        <tbody>
          {materiales.map((item, i) => (
            <tr key={i} className="border-t hover:bg-gray-100 cursor-pointer" onClick={() => {
              setDetalleMaterial(item);
              const filtrado = historial.filter(h => normalizarNombre(h.nombre) === normalizarNombre(item.nombre));
              setHistorialFiltrado(filtrado);
            }}>
              <td className="px-4 py-2">{item.nombre}</td>
              <td className="px-4 py-2">{item.cantidad}</td>
              <td className="px-4 py-2">{item.ubicacion}</td>
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
          <input name="nombre" value={formIngreso.nombre} onChange={handleChangeIngreso} className="p-2 border rounded w-full" placeholder="Nombre del nuevo artículo" />
        ) : (
          <select name="nombre" value={formIngreso.nombre} onChange={handleChangeIngreso} className="p-2 border rounded w-full">
            <option value="">Selecciona un artículo</option>
            {nombresMateriales.map((nombre) => (
              <option key={nombre} value={nombre}>{nombre}</option>
            ))}
          </select>
        )}
        <button type="button" onClick={() => { setModoNuevoArticulo(!modoNuevoArticulo); setFormIngreso({ ...formIngreso, nombre: "" }); setCoincidencias([]); }} className="text-sm px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600">
          {modoNuevoArticulo ? "↩️ Volver" : "➕ Nuevo"}
        </button>
      </div>
      {modoNuevoArticulo && coincidencias.length > 0 && (
        <ul className="bg-white border rounded text-sm text-gray-700 shadow-sm max-h-28 overflow-y-auto">
          {coincidencias.map((item, i) => (
            <li key={i} className="px-3 py-1 hover:bg-gray-100 cursor-pointer" onClick={() => {
              setFormIngreso({ ...formIngreso, nombre: item });
              setModoNuevoArticulo(false);
              setCoincidencias([]);
            }}>{item}</li>
          ))}
        </ul>
      )}
    </div>
    {["cantidad", "ubicacion", "descripcion"].map((field) => (
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


        {/* Modal de historial por material */}
        {detalleMaterial && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl shadow-lg max-w-3xl w-full">
              <h3 className="text-xl font-bold mb-4">Historial de: {detalleMaterial.nombre}</h3>
              <table className="w-full text-sm text-left border border-gray-300">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Cantidad</th>
                    <th className="px-3 py-2">Responsable</th>
                    <th className="px-3 py-2">Observación</th>
                  </tr>
                </thead>
                <tbody>
                  {historialFiltrado.map((h, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-1">{h.fecha}</td>
                      <td className="px-3 py-1">{h.tipo}</td>
                      <td className="px-3 py-1">{h.cantidad}</td>
                      <td className="px-3 py-1">{h.responsable}</td>
                      <td className="px-3 py-1">{h.observacion || h.descripcion || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 text-right">
                <button onClick={() => setDetalleMaterial(null)} className="bg-red-500 text-white px-4 py-2 rounded">Cerrar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
