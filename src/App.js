import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import Login from "./Login";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import React from "react";
import ReporteMaquinaria from "./ReporteMaquinaria";

function App() {
  // Estados de la aplicación
  const [usuario, setUsuario] = useState(null); // Usuario logueado
  const [tab, setTab] = useState("inventario"); // Pestaña activa
  const [materiales, setMateriales] = useState([]); // Inventario actual
  const [historial, setHistorial] = useState([]); // Historial de movimientos
  const [formIngreso, setFormIngreso] = useState({ nombre: "", cantidad: "", ubicacion: "", descripcion: "" }); // Formulario ingreso
  const [nombresMateriales, setNombresMateriales] = useState([]); // Lista de nombres
  const [modoNuevoArticulo, setModoNuevoArticulo] = useState(false); // Modo de ingreso nuevo
  const [coincidencias, setCoincidencias] = useState([]); // Coincidencias en nombres
  const [detalleMaterial, setDetalleMaterial] = useState(null); // Material seleccionado para ver detalle
  const [historialFiltrado, setHistorialFiltrado] = useState([]); // Historial filtrado por material
  const [combinerSeleccionado, setCombinerSeleccionado] = useState(null);
  const [filtroInventario, setFiltroInventario] = useState("");
  //const pestanasPermitidas = ["inventario", "ingresos", "salidas", "historial", "verificacion"];
  const [verificaciones, setVerificaciones] = useState([]);
  const [fechaSeleccionada, setFechaSeleccionada] = useState("");
  const [fechasUnicas, setFechasUnicas] = useState([]);
  const [verificacionesFiltradas, setVerificacionesFiltradas] = useState([]);
  const [fotoIngreso, setFotoIngreso] = useState(null);
  const [fotoSalida, setFotoSalida] = useState(null);
  const [inventario, setInventario] = useState([]);
  const [ubicacionesRegistradas, setUbicacionesRegistradas] = useState([]);
  const [combinerExpandido, setCombinerExpandido] = useState(null);
  const imagenMaterial = historialFiltrado.find((h) => h.foto_url)?.foto_url || null;
  const [filtroVerifPlanta, setFiltroVerifPlanta] = useState("");
  const [filtroVerifCombiner, setFiltroVerifCombiner] = useState("");


    useEffect(() => {
  const cargarCambios = async () => {
    if (!combinerSeleccionado) return;
    const { data, error } = await supabase
      .from("cambios_panel")
      .select("*")
      .eq("combiner", combinerSeleccionado)
      .order("fecha", { ascending: false });

    if (!error) {
      setCambiosPanel(data);
    }
  };

  cargarCambios();
}, [combinerSeleccionado]);


// formulario para guardar los datos de la página paneles y combiner
const guardarDatosCombiner = async () => {
  const { planta, combiner, strings, potencia, mesas, paneles } = formCombiner;

  if (!planta || !combiner || !strings || !potencia || !mesas) {
    alert("Por favor completa todos los campos.");
    return;
  }

  const { error } = await supabase.from("combiner_info").insert([
    {
      planta,
      combiner,
      strings: parseInt(strings),
      potencia: parseInt(potencia),
      mesas: parseInt(mesas),
      paneles: parseInt(paneles)
    }
  ]);

  if (error) {
    alert("Error al guardar en Supabase");
    console.error(error);
  } else {
    alert("Datos del combiner guardados correctamente.");
    setCombinerSeleccionado(combiner); // Mostrar la siguiente parte
  }
};


//Ver Detalles cambios paneles
const [cambiosPanel, setCambiosPanel] = useState([]);

useEffect(() => {
  const cargarCambios = async () => {
    if (!combinerSeleccionado) return;
    const { data, error } = await supabase
      .from("cambios_panel")
      .select("*")
      .eq("combiner", combinerSeleccionado)
      .order("fecha", { ascending: false });

    if (!error) {
      setCambiosPanel(data);
    }
  };

  cargarCambios();
}, [combinerSeleccionado]);


   // para descargar el pdf de la tabla de verificacion
const descargarVerificacionPDF = () => {
  if (!fechaSeleccionada || verificacionesFiltradas.length === 0) {
    alert("No hay datos para exportar.");
    return;
  }

  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(`Verificación de Planta - ${fechaSeleccionada}`, 14, 22);

  const filas = verificacionesFiltradas.map(v => [
    v.planta,
    v.combiner,
    v.string,
    v.voltaje,
    v.amp,
    v.fusible || "No"
  ]);

  autoTable(doc, {
    startY: 30,
    head: [["Planta", "Combiner", "String", "Voltaje", "Amperaje", "Fusible Quemado"]],
    body: filas
  });

  doc.save(`verificacion_${fechaSeleccionada}.pdf`);
};
  const [combinerList, setCombinerList] = useState([]);
  useEffect(() => {
  const cargarCombiners = async () => {
    const { data, error } = await supabase
      .from("combiner_info")
      .select("*")
      .order("planta", { ascending: true })      // ordena por planta
      .order("combiner", { ascending: true });   // luego por combiner (A1, A2...)
    if (!error) {
      setCombinerList(data);
    }
  };
  cargarCombiners();
}, []);

  

   useEffect(() => {
    if (usuario) {
      obtenerInventario();
      obtenerHistorial();
    }
  }, [usuario]);

  useEffect(() => {
    const ubicaciones = [...new Set(inventario.map(item => normalizarNombre(item.ubicacion)))];
    setUbicacionesRegistradas(ubicaciones);
  }, [inventario]);
  
  const [formSalida, setFormSalida] = useState({  nombre: "",  cantidad: "",  responsable: "",  observacion: "",  ubicacion: "" });


  // formulario de paneles y combiner
  const [formCombiner, setFormCombiner] = useState({
  planta: "",     
  combiner: "",
  strings: "",
  potencia: "",
  mesas: "",
  paneles: 0
});
    
  // Cierra sesión
  const cerrarSesion = () => setUsuario(null);

  // Obtiene datos al iniciar sesión
  useEffect(() => {
    if (usuario) {
      obtenerInventario();
      obtenerHistorial();
    }
  }, [usuario]);

  const [nuevaVerificacion, setNuevaVerificacion] = useState({
    fecha: "",
    planta: "",
    combiner: "",
    string: "",
    voltaje: "",
    amp: "",
    fusible: "No", // valor por defecto
});
    const handleAgregarVerificacion = async () => {
  if (
    !nuevaVerificacion.fecha ||
    !nuevaVerificacion.planta ||
    !nuevaVerificacion.combiner ||
    !nuevaVerificacion.string ||
    !nuevaVerificacion.voltaje ||
    !nuevaVerificacion.amp
  ) {
    alert("Completa todos los campos");
    return;
  }

  const { error } = await supabase.from("verificacion").insert([
    {
      fecha: nuevaVerificacion.fecha,
      planta: nuevaVerificacion.planta,
      combiner: nuevaVerificacion.combiner,
      string: parseInt(nuevaVerificacion.string),
      voltaje: parseFloat(nuevaVerificacion.voltaje),
      amp: parseFloat(nuevaVerificacion.amp)
    }
  ]);

  if (error) {
    alert("Error al guardar: " + error.message);
  } else {
    alert("Verificación agregada");
    setFechaSeleccionada(nuevaVerificacion.fecha);
    setNuevaVerificacion(prev => ({
    ...prev,
    string: "",
    voltaje: "",
    amp: "",
    fusible: "No"
}));

    // Recargar registros
    const { data } = await supabase
      .from("verificacion")
      .select("*")
      .order("fecha", { ascending: false });

    setVerificaciones(data);
    setFechasUnicas([...new Set(data.map((v) => v.fecha))]);
  }
};



    useEffect(() => {
  const cargarVerificaciones = async () => {
    const { data, error } = await supabase
      .from("verificacion")
      .select("*")
      .order("fecha", { ascending: false });

      
    if (!error) {
      setVerificaciones(data);

      const fechas = Array.from(new Set(data.map(v => v.fecha)));
      setFechasUnicas(fechas);
    } else {
      console.error("Error al cargar verificaciones", error);
    }
  };

  cargarVerificaciones();
}, []);
  useEffect(() => {
  const filtradas = verificaciones.filter((v) => {
    const coincideFecha = v.fecha === fechaSeleccionada;
    const coincidePlanta = filtroVerifPlanta ? v.planta === filtroVerifPlanta : true;
    const coincideCombiner = filtroVerifCombiner ? v.combiner === filtroVerifCombiner : true;
    return coincideFecha && coincidePlanta && coincideCombiner;
  });

  setVerificacionesFiltradas(filtradas);
}, [fechaSeleccionada, verificaciones, filtroVerifPlanta, filtroVerifCombiner]);

  const normalizarNombre = (nombre) => nombre.trim().toLowerCase();

  // Obtiene inventario de Supabase
 const obtenerInventario = async () => {
  const { data, error } = await supabase.from("inventario").select("*");
  if (!error) {
    setMateriales(data);
    setInventario(data); 
    const nombres = [...new Set(data.map(item => normalizarNombre(item.nombre)))];
    setNombresMateriales(nombres);
  } else {
    console.error("Error al cargar inventario:", error);
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
  

  const handleChangeIngreso = (e) => {
  const { name, value } = e.target;
  setFormIngreso(prev => ({ ...prev, [name]: value }));
};


  // Manejo de formulario de salida
  const handleChangeSalida = (e) => setFormSalida({ ...formSalida, [e.target.name]: e.target.value });

  // Envío de formulario ingreso
  const handleSubmitIngreso = async (e) => {
  e.preventDefault();

  const { nombre, cantidad, ubicacion, descripcion } = formIngreso;

  if (!nombre || !cantidad || !ubicacion || !descripcion) {
    alert("Completa todos los campos obligatorios");
    return;
  }

  const cantidadNum = parseInt(cantidad);
  if (isNaN(cantidadNum)) {
    alert("Cantidad debe ser un número válido");
    return;
  }

  const nombreNormalizado = normalizarNombre(nombre);
  const ubicacionNormalizada = normalizarNombre(ubicacion);

  const existente = inventario.find(
    (item) =>
      normalizarNombre(item.nombre) === nombreNormalizado &&
      normalizarNombre(item.ubicacion) === ubicacionNormalizada
  );

  let fotoUrl = "";
  if (fotoIngreso) {
    const nombreArchivo = `${Date.now()}_${fotoIngreso.name}`;
    const { data: archivoSubido, error: errorSubida } = await supabase.storage
      .from("fotos-ingreso")
      .upload(nombreArchivo, fotoIngreso);

    if (!errorSubida) {
      const { data: publicUrl } = supabase.storage
        .from("fotos-ingreso")
        .getPublicUrl(nombreArchivo);
      fotoUrl = publicUrl.publicUrl;
    } else {
      alert("Error al subir la imagen");
      console.error(errorSubida);
      return;
    }
  }

  if (existente) {
    const nuevaCantidad = parseInt(existente.cantidad) + cantidadNum;
    await supabase
      .from("inventario")
      .update({ cantidad: nuevaCantidad })
      .eq("id", existente.id);
  } else {
    await supabase.from("inventario").insert([{
      nombre: nombreNormalizado,
      cantidad: cantidadNum,
      ubicacion: ubicacionNormalizada,
      descripcion,
    }]);
  }

  const datosHistorial = {
    tipo: "Ingreso",
    nombre: nombreNormalizado,
    cantidad: cantidadNum,
    ubicacion: ubicacionNormalizada,
    descripcion,
    fecha: new Date().toISOString(),
    responsable: usuario?.nombre || "Desconocido",
    foto_url: fotoUrl,
  };

  console.log("➜ Datos a insertar en historial (Ingreso):", datosHistorial);

  const { error } = await supabase.from("historial").insert([datosHistorial]);
  if (error) {
    alert("Error al guardar en historial");
    console.error(error);
    return;
  }
   
  setFormIngreso({ nombre: "", cantidad: "", ubicacion: "", descripcion: "" });
  setFotoIngreso(null);
  obtenerInventario();
  obtenerHistorial();
};


  // Envío de formulario salida
  const handleSubmitSalida = async (e) => {
  e.preventDefault();

  const { nombre, cantidad, responsable, observacion, ubicacion } = formSalida;

  if (!nombre || !cantidad || !responsable || !ubicacion) {
    alert("Completa todos los campos obligatorios");
    return;
  }

  const cantidadNum = parseInt(cantidad);
  if (isNaN(cantidadNum)) {
    alert("Cantidad debe ser un número");
    return;
  }

  const nombreNormalizado = normalizarNombre(nombre);
  const ubicacionNormalizada = normalizarNombre(ubicacion);

  const existente = inventario.find(
    (item) =>
      normalizarNombre(item.nombre) === nombreNormalizado &&
      normalizarNombre(item.ubicacion) === ubicacionNormalizada
  );

  if (!existente || existente.cantidad < cantidadNum) {
    alert("No hay suficiente stock");
    return;
  }

  let fotoUrl = "";
  if (fotoSalida) {
    const nombreArchivo = `${Date.now()}_${fotoSalida.name}`;
    const { data: archivoSubido, error: errorSubida } = await supabase.storage
      .from("fotos-salidas")
      .upload(nombreArchivo, fotoSalida);

    if (!errorSubida) {
      const { data: publicUrl } = supabase.storage
        .from("fotos-salidas")
        .getPublicUrl(nombreArchivo);
      fotoUrl = publicUrl.publicUrl;
    } else {
      alert("Error al subir la imagen");
      console.error(errorSubida);
      return;
    }
  }

  const nuevaCantidad = parseInt(existente.cantidad) - cantidadNum;
  await supabase
    .from("inventario")
    .update({ cantidad: nuevaCantidad })
    .eq("id", existente.id);

  const datosHistorial = {
    tipo: "Salida",
    nombre: nombreNormalizado,
    cantidad: cantidadNum,
    ubicacion: ubicacionNormalizada,
    observacion,
    fecha: new Date().toISOString(),
    responsable: usuario?.nombre || responsable,
    foto_url: fotoUrl,
  };

  console.log("➜ Datos a insertar en historial (Salida):", datosHistorial);

  const { error } = await supabase.from("historial").insert([datosHistorial]);
  if (error) {
    alert("Error al guardar en historial");
    console.error(error);
    return;
  }

  setFormSalida({ nombre: "", cantidad: "", responsable: "", observacion: "", ubicacion: "" });
  setFotoSalida(null);
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
 const pestañasPermitidas = usuario?.rol === "lectura"
  ? ["inventario", "historial", "paneles", "maquinaria"]
  : ["inventario", "ingresos", "salidas", "historial", "verificacion", "paneles", "maquinaria"];


  // Vista principal del sistema
 return (
  <div
    className="relative min-h-screen bg-cover bg-center"
    style={{
      backgroundImage: "url('/img/FONDOLASPILASAEREA.jpg')",
      backgroundAttachment: "fixed"
    }}
  >
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

    {/* Contenedor central fijo blanco translúcido */}
   <div
  className="fixed top-0 bottom-0 left-1/2 -translate-x-1/2 px-4 pt-20 w-full max-w-6xl bg-white/90 backdrop-blur-md rounded-2xl shadow-lg overflow-y-scroll scrollbar-hide"
>

      <div className="w-full max-w-6xl bg-white/90 shadow-lg rounded-2xl p-6 mb-10 animate-fadein">
        
        {/* Logo y título */}
        <div className="flex justify-center items-center mb-6 gap-4">
          <img src="/img/LOGOTUNCAJ.png" alt="Logo" className="w-32 h-auto" />
          <h1 className="text-3xl font-bold text-center">🛠️Gestión de Bodega y 🧾Operaciones</h1>
        </div>

        {/* Pestañas */}
        <div className="flex justify-center gap-2 mb-6 bg-white p-2 rounded-full shadow-inner max-w-fit mx-auto">
          {pestañasPermitidas.map((tabName) => (
            <button
              key={tabName}
              onClick={() => setTab(tabName)}
              className={`px-4 py-2 rounded-full font-semibold transition ${
                tab === tabName
                  ? "bg-black text-white shadow-md"
                  : "bg-white text-black hover:bg-gray-200"
              }`}
            >
              {tabName === "paneles"
                ? "Paneles y Combiner"
                : tabName.charAt(0).toUpperCase() + tabName.slice(1)}
            </button>
          ))}
        </div>
        
         {/* tabla del inventario*/}
          {tab === "inventario" && (
  <div>
    <button
      onClick={descargarPDF}
      className="mb-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
    >
      📄 Descargar Inventario Actual
    </button>
    {/*filtro para el inventario*/}
   <h2
    className="text-xl font-semibold mb-4 text-center">📋 Inventario Las Pilas </h2>
        <input
          type="text"
          placeholder="🔍 Buscar en inventario..."
          className="mb-4 px-4 py-2 border rounded w-full"
          value={filtroInventario}
          onChange={(e) => setFiltroInventario(e.target.value.toLowerCase())}
        />

    
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
          {materiales
              .filter((item) =>
                item.nombre.toLowerCase().includes(filtroInventario) ||
                item.descripcion?.toLowerCase().includes(filtroInventario) ||
                item.ubicacion?.toLowerCase().includes(filtroInventario)
              )
              .map((item, i) => (
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
{tab === "maquinaria" && (
  <ReporteMaquinaria
    onSeleccionarVista={(vista) => {
      console.log("Vista seleccionada:", vista);
    }}
  />
)}

        {tab === "ingresos" && usuario.rol === "escritura" && (
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

      {/* Sugerencias si el nombre ya existe */}
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

    {/* Campo cantidad */}
    <input
      className="p-2 border rounded"
      placeholder="cantidad"
      name="cantidad"
      value={formIngreso.cantidad}
      onChange={handleChangeIngreso}
    />

    {/* Campo ubicación dinámico */}
    {modoNuevoArticulo ? (
      <div className="relative">
        <input
          className="p-2 border rounded w-full"
          placeholder="ubicación"
          name="ubicacion"
          value={formIngreso.ubicacion}
          onChange={(e) => {
            handleChangeIngreso(e);
            const texto = e.target.value.toLowerCase();
            const sugerencias = ubicacionesRegistradas.filter((ubi) =>
              ubi.includes(texto)
            );
            setCoincidencias(sugerencias);
          }}
        />
        {coincidencias.length > 0 && (
          <ul className="absolute bg-white border rounded shadow text-sm w-full max-h-32 overflow-y-auto z-10">
            {coincidencias.map((ubi, i) => (
              <li
                key={i}
                className="px-3 py-1 hover:bg-gray-100 cursor-pointer"
                onClick={() => {
                  setFormIngreso((prev) => ({ ...prev, ubicacion: ubi }));
                  setCoincidencias([]);
                }}
              >
                {ubi}
              </li>
            ))}
          </ul>
        )}
      </div>
    ) : (
      <select
        name="ubicacion"
        value={formIngreso.ubicacion}
        onChange={handleChangeIngreso}
        className="p-2 border rounded"
      >
        <option value="">Selecciona una ubicación</option>
        {ubicacionesRegistradas.map((ubi, i) => (
          <option key={i} value={ubi}>{ubi}</option>
        ))}
      </select>
    )}

    {/* Campo descripción */}
    <input
      className="p-2 border rounded"
      placeholder="descripcion"
      name="descripcion"
      value={formIngreso.descripcion}
      onChange={handleChangeIngreso}
    />

    {/* Botón estético para subir imagen */}
    <label className="flex items-center gap-2 cursor-pointer text-blue-600 hover:text-blue-800 transition mb-2">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M4 6h16M4 6v12M4 6L9 9.5M4 18l5-3.5M19 6v12" />
      </svg>
      <span className="underline">Agregar foto</span>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => setFotoIngreso(e.target.files[0])}
        className="hidden"
      />
    </label>

    {/* Vista previa de imagen */}
    {fotoIngreso && (
      <img
        src={URL.createObjectURL(fotoIngreso)}
        alt="Vista previa"
        className="w-32 h-32 object-cover mt-2 rounded shadow"
      />
    )}

    <button type="submit" className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
      Registrar ingreso
    </button>
  </form>
)}

{/* Mensaje para usuario sin permisos */}
{tab === "ingresos" && usuario.rol === "lectura" && (
  <p className="text-red-600 font-semibold">
    No tienes permisos para registrar ingresos.
  </p>
)}


  {/* Sección de salidas: solo visible si el usuario tiene rol de escritura */}
{tab === "salidas" && usuario.rol === "escritura" && (
  <form className="grid gap-3" onSubmit={handleSubmitSalida}>
    {/* Nombre del artículo */}
    <select
      name="nombre"
      value={formSalida.nombre}
      onChange={handleChangeSalida}
      className="p-2 border rounded"
    >
      <option value="">Selecciona un artículo</option>
      {nombresMateriales.map((nombre) => (
        <option key={nombre} value={nombre}>{nombre}</option>
      ))}
    </select>

    {/* Campos: cantidad, responsable y observación */}
    {["cantidad", "responsable", "observacion"].map((field) => (
      <input
        key={field}
        className="p-2 border rounded"
        placeholder={field}
        name={field}
        value={formSalida[field]}
        onChange={handleChangeSalida}
      />
    ))}

    {/* Ubicación del material */}
    <select
      name="ubicacion"
      value={formSalida.ubicacion}
      onChange={handleChangeSalida}
      className="p-2 border rounded"
    >
      <option value="">Selecciona ubicación</option>
      {ubicacionesRegistradas.map((ubic) => (
        <option key={ubic} value={ubic}>{ubic}</option>
      ))}
    </select>

    {/* Subir imagen salida */}
    <input
      type="file"
      accept="image/*"
      onChange={(e) => setFotoSalida(e.target.files[0])}
      className="p-2 border rounded"
    />

    {/* Vista previa de imagen */}
    {fotoSalida && (
      <img
        src={URL.createObjectURL(fotoSalida)}
        alt="Vista previa"
        className="w-32 h-32 object-cover mt-2 rounded shadow"
      />
    )}

    {/* Botón para registrar salida */}
    <button type="submit" className="bg-red-600 text-white py-2 rounded hover:bg-red-700">
      Registrar salida
    </button>
  </form>
)}

{/* Mensaje para usuario sin permisos */}
{tab === "salidas" && usuario.rol === "lectura" && (
  <p className="text-red-600 font-semibold">
    No tienes permisos para registrar salidas.
  </p>
)}

{/* Sección de historial: accesible para todos los roles */}
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
            <th className="px-4 py-2">Ubicación</th>
            <th className="px-4 py-2">Observación</th>
            <th className="px-4 py-2">Foto</th>
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
              <td className="px-4 py-2">{item.ubicacion}</td>
              <td className="px-4 py-2">{item.observacion || item.descripcion || "-"}</td>
              <td className="px-4 py-2">
                {item.foto_url ? (
                  <a href={item.foto_url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={item.foto_url}
                      alt="Foto"
                      className="w-16 h-16 object-cover rounded shadow"
                    />
                  </a>
                ) : (
                  <span className="text-gray-400 italic">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
)}
      


    {/* Sección de verificación: solo visible para usuarios con rol de escritura */}
{tab === "verificacion" && usuario.rol === "escritura" && (
  <div className="p-4">
    <h2 className="text-xl font-bold mb-4">📅 Verificación de Planta</h2>

    {/* Formulario de ingreso */}
    <h3 className="text-lg font-semibold mb-2">📝 Nueva verificación</h3>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
      <input
        type="date"
        className="border p-2 rounded"
        placeholder="Fecha"
        value={nuevaVerificacion.fecha}
        onChange={(e) =>
          setNuevaVerificacion({ ...nuevaVerificacion, fecha: e.target.value })
        }
      />

      {/* Planta */}
      <select
        className="border p-2 rounded"
        value={nuevaVerificacion.planta}
        onChange={(e) =>
          setNuevaVerificacion({ ...nuevaVerificacion, planta: e.target.value })
        }
      >
        <option value="">Selecciona Planta</option>
        <option value="Las Pilas 1">Las Pilas 1</option>
        <option value="Las Pilas 2">Las Pilas 2</option>
      </select>

      {/* Combiner */}
      <select
        className="border p-2 rounded"
        value={nuevaVerificacion.combiner}
        onChange={(e) =>
          setNuevaVerificacion({ ...nuevaVerificacion, combiner: e.target.value })
        }
      >
        <option value="">Selecciona Combiner</option>
        {[...Array(14).keys()].map(i => (
          <option key={`A${i + 1}`} value={`A${i + 1}`}>{`A${i + 1}`}</option>
        ))}
        {[...Array(14).keys()].map(i => (
          <option key={`B${i + 1}`} value={`B${i + 1}`}>{`B${i + 1}`}</option>
        ))}
      </select>

      {/* String */}
      <select
        className="border p-2 rounded"
        value={nuevaVerificacion.string}
        onChange={(e) =>
          setNuevaVerificacion({ ...nuevaVerificacion, string: e.target.value })
        }
      >
        <option value="">Selecciona String</option>
        {[...Array(18).keys()].map(i => (
          <option key={i + 1} value={i + 1}>{i + 1}</option>
        ))}
      </select>

      {/* Voltaje */}
      <input
        type="number"
        className="border p-2 rounded"
        placeholder="Voltaje"
        value={nuevaVerificacion.voltaje}
        onChange={(e) =>
          setNuevaVerificacion({ ...nuevaVerificacion, voltaje: e.target.value })
        }
      />

      {/* Amperaje */}
      <input
        type="number"
        className="border p-2 rounded"
        placeholder="Amperaje"
        value={nuevaVerificacion.amp}
        onChange={(e) =>
          setNuevaVerificacion({ ...nuevaVerificacion, amp: e.target.value })
        }
      />

      {/* Fusible Quemado */}
      <select
        className="border p-2 rounded"
        value={nuevaVerificacion.fusible}
        onChange={(e) =>
          setNuevaVerificacion({ ...nuevaVerificacion, fusible: e.target.value })
        }
      >
        <option value="No">No</option>
        <option value="Sí">Sí</option>
      </select>
    </div>

    {/* Botón para guardar verificación */}
    <button
      className="bg-blue-600 text-white px-4 py-2 rounded mb-6"
      onClick={handleAgregarVerificacion}
    >
      Agregar Verificación
    </button>

    {/* Selector de fecha para ver tabla */}
    <label className="block mb-2 font-semibold">Filtrar por fecha:</label>
    <input
      type="date"
      className="border p-2 rounded mb-4"
      value={fechaSeleccionada}
      onChange={(e) => setFechaSeleccionada(e.target.value)}
    />

          {/* Filtros adicionales por planta y combiner */}
<div className="flex flex-wrap items-center gap-4 mb-4">
  {/* Filtro por planta */}
  <select
    className="p-2 border rounded"
    value={filtroVerifPlanta}
    onChange={(e) => setFiltroVerifPlanta(e.target.value)}
  >
    <option value="">Todas las plantas</option>
    <option value="Las Pilas 1">Las Pilas 1</option>
    <option value="Las Pilas 2">Las Pilas 2</option>
  </select>

  {/* Filtro por combiner */}
  <select
    className="p-2 border rounded"
    value={filtroVerifCombiner}
    onChange={(e) => setFiltroVerifCombiner(e.target.value)}
  >
    <option value="">Todos los combiners</option>
    {[...Array(14).keys()].map(i => (
      <React.Fragment key={i}>
        <option value={`A${i + 1}`}>{`A${i + 1}`}</option>
        <option value={`B${i + 1}`}>{`B${i + 1}`}</option>
      </React.Fragment>
    ))}
  </select>

  {/* Botón para limpiar filtros */}
  <button
    className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400"
    onClick={() => {
      setFiltroVerifPlanta("");
      setFiltroVerifCombiner("");
    }}
  >
    Limpiar filtros
  </button>
</div>

      {/* Botón para descargar la verificación como PDF */}
          <button
            onClick={descargarVerificacionPDF}
            className="mb-4 px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800"
          >
                   📄 Descargar Verificación
          </button>

           



    {/* Tabla de registros */}
    {fechaSeleccionada && (
      <table className="min-w-full border border-gray-600 shadow-lg">
        <thead>
          <tr className="bg-blue-100">
            <th className="border border-gray-600 p-3 text-left">Planta</th>
            <th className="border border-gray-600 p-3 text-left">Combiner</th>
            <th className="border border-gray-600 p-3 text-left">String</th>
            <th className="border border-gray-600 p-3 text-left">Voltaje</th>
            <th className="border border-gray-600 p-3 text-left">Amperaje</th>
            <th className="border border-gray-600 p-3 text-left">Fusible Quemado</th>
          </tr>
        </thead>
        <tbody>
          {verificacionesFiltradas.map((verif, index) => (
            <tr key={index} className="hover:bg-gray-100">
              <td className="border border-gray-600 p-3">{verif.planta || "N/A"}</td>
              <td className="border border-gray-600 p-3">{verif.combiner}</td>
              <td className="border border-gray-600 p-3">{verif.string}</td>
              <td className="border border-gray-600 p-3">{verif.voltaje}</td>
              <td className="border border-gray-600 p-3">{verif.amp}</td>
              <td className="border border-gray-600 p-3">{verif.fusible || "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
)}
  


{tab === "verificacion" && usuario.rol === "lectura" && (
  <p className="text-red-600 font-semibold px-4">
    No tienes permisos para ingresar verificaciones.
  </p>
)}
{/* Fragmento de código para formulario Paneles y Combiner */} 
{tab === "paneles" && (
  <div>
    <h2 className="text-xl font-bold mb-4">☀️ Paneles y Combiner</h2>

    {/* Solo para usuarios con permiso de escritura */}
    {usuario.rol === "escritura" && (
      <form className="grid gap-4 max-w-xl mx-auto bg-white p-4 rounded shadow">
        <label className="block">
          <span className="block font-semibold mb-1">Selecciona Planta</span>
          <select
            className="w-full p-2 border rounded"
            value={formCombiner.planta}
            onChange={(e) =>
              setFormCombiner({ ...formCombiner, planta: e.target.value })
            }
          >
            <option value="">Selecciona una planta</option>
            <option value="Las Pilas 1">Las Pilas 1</option>
            <option value="Las Pilas 2">Las Pilas 2</option>
          </select>
        </label>

        <label className="block">
          <span className="block font-semibold mb-1">Selecciona Combiner</span>
          <select
            className="w-full p-2 border rounded"
            value={formCombiner.combiner}
            onChange={(e) =>
              setFormCombiner({ ...formCombiner, combiner: e.target.value })
            }
            disabled={!formCombiner.planta}
          >
            <option value="">Selecciona</option>
            {formCombiner.planta &&
              [...Array(14).keys()].map(i => {
                const prefijo = formCombiner.planta === "Las Pilas 1" ? "A" : "B";
                return (
                  <option key={`${prefijo}${i + 1}`} value={`${prefijo}${i + 1}`}>
                    {`${prefijo}${i + 1}`}
                  </option>
                );
              })}
          </select>
        </label>

        <label className="block">
          <span className="block font-semibold mb-1">Cantidad de Strings (máx 18)</span>
          <input
            type="number"
            min={1}
            max={18}
            className="w-full p-2 border rounded"
            value={formCombiner.strings}
            onChange={(e) =>
              setFormCombiner({ ...formCombiner, strings: e.target.value })
            }
          />
        </label>

        <label className="block">
          <span className="block font-semibold mb-1">Potencia de los Paneles (W)</span>
          <input
            type="number"
            className="w-full p-2 border rounded"
            value={formCombiner.potencia}
            onChange={(e) =>
              setFormCombiner({ ...formCombiner, potencia: e.target.value })
            }
          />
        </label>

        <label className="block">
          <span className="block font-semibold mb-1">Cantidad de Mesas</span>
          <input
            type="number"
            className="w-full p-2 border rounded"
            value={formCombiner.mesas}
            onChange={(e) => {
              const mesas = parseInt(e.target.value);
              setFormCombiner({
                ...formCombiner,
                mesas,
                paneles: mesas * 56
              });
            }}
          />
        </label>

        <div className="font-semibold text-green-700">
          Total de paneles: {formCombiner.paneles || 0}
        </div>

        <button
          type="button"
          className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
          onClick={guardarDatosCombiner}
        >
          Guardar datos del Combiner
        </button>
      </form>
    )}

    {/* Tabla siempre visible */}
{combinerList.length > 0 && (
  <div className="mt-8">
    <h3 className="text-lg font-semibold mb-2">🔍 Combiners registrados</h3>

    {/* Filtros de búsqueda */}
    <div className="flex flex-wrap items-center gap-4 mb-4">
      {/* Filtro por planta */}
      <select
        className="p-2 border rounded"
        value={filtroPlanta}
        onChange={(e) => setFiltroPlanta(e.target.value)}
      >
        <option value="">Todas las plantas</option>
        <option value="Las Pilas 1">Las Pilas 1</option>
        <option value="Las Pilas 2">Las Pilas 2</option>
      </select>

      {/* Filtro por combiner */}
      <select
        className="p-2 border rounded"
        value={filtroCombiner}
        onChange={(e) => setFiltroCombiner(e.target.value)}
      >
        <option value="">Todos los combiners</option>
        {[...Array(14).keys()].map(i => (
          <React.Fragment key={i}>
            <option value={`A${i + 1}`}>{`A${i + 1}`}</option>
            <option value={`B${i + 1}`}>{`B${i + 1}`}</option>
          </React.Fragment>
        ))}
      </select>

      {/* Botón para limpiar filtros */}
      <button
        className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400"
        onClick={() => {
          setFiltroPlanta("");
          setFiltroCombiner("");
        }}
      >
        Limpiar filtros
      </button>
    </div>

    {/* Tabla filtrada */}
    <table className="w-full text-sm text-left border border-gray-300">
      <thead className="bg-gray-200">
        <tr>
          <th className="px-4 py-2">Planta</th>
          <th className="px-4 py-2">Combiner</th>
          <th className="px-4 py-2">Strings</th>
          <th className="px-4 py-2">Potencia</th>
          <th className="px-4 py-2">Mesas</th>
          <th className="px-4 py-2">Paneles</th>
          <th className="px-4 py-2">Acción</th>
        </tr>
      </thead>
      <tbody>
        {combinerList
          .filter(c =>
            (filtroPlanta ? c.planta === filtroPlanta : true) &&
            (filtroCombiner ? c.combiner === filtroCombiner : true)
          )
          .map((c, index) => (
            <React.Fragment key={index}>
              <tr className="border-t hover:bg-gray-100">
                <td className="px-4 py-2">{c.planta}</td>
                <td className="px-4 py-2">{c.combiner}</td>
                <td className="px-4 py-2">{c.strings}</td>
                <td className="px-4 py-2">{c.potencia}</td>
                <td className="px-4 py-2">{c.mesas}</td>
                <td className="px-4 py-2">{c.paneles}</td>
                <td className="px-4 py-2">
                  <button
                    className="bg-blue-500 text-white px-3 py-1 rounded"
                    onClick={() =>
                      setCombinerExpandido(c.combiner === combinerExpandido ? null : c.combiner)
                    }
                  >
                    {combinerExpandido === c.combiner ? "Ocultar" : "Ver Detalles"}
                  </button>
                </td>
              </tr>

              {/* Historial visible al hacer clic */}
              {combinerExpandido === c.combiner && (
                <tr>
                  <td colSpan={7} className="p-4 bg-gray-50 border-t">
                    <h4 className="font-semibold mb-2">📋 Cambios registrados para {c.combiner}</h4>

                    {cambiosPanel.length === 0 ? (
                      <p className="italic text-gray-500">No hay registros para este combiner.</p>
                    ) : (
                      <table className="w-full text-sm border border-gray-300">
                        <thead className="bg-gray-200">
                          <tr>
                            <th className="px-3 py-2">Fecha</th>
                            <th className="px-3 py-2">Mesa</th>
                            <th className="px-3 py-2">Ubicación</th>
                            <th className="px-3 py-2">No. Panel</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cambiosPanel.map((item, i) => (
                            <tr key={i} className="border-t">
                              <td className="px-3 py-2">{new Date(item.fecha).toLocaleString()}</td>
                              <td className="px-3 py-2">{item.mesa}</td>
                              <td className="px-3 py-2 capitalize">{item.ubicacion}</td>
                              <td className="px-3 py-2">{item.panel}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
      </tbody>
    </table>
  </div>
)}




        {/* Formulario de cambio de panel: solo para escritura */}
{combinerSeleccionado && usuario.rol === "escritura" && (
  <div className="mt-6 border-t pt-4">
    <h3 className="text-lg font-bold mb-4">
      🛠️ Registrar cambio de panel en {combinerSeleccionado}
    </h3>
    <form
      className="grid gap-3 bg-white p-4 rounded shadow max-w-xl mx-auto"
      onSubmit={async (e) => {
        e.preventDefault();

        const nuevaFila = {
          combiner: combinerSeleccionado,
          mesa: parseInt(e.target[0].value),
          ubicacion: e.target[1].value,
          panel: parseInt(e.target[2].value),
          fecha: new Date().toISOString(),
          created_at: new Date().toISOString()
        };

        const { error } = await supabase.from("cambios_panel").insert([nuevaFila]);

        if (error) {
          alert("❌ Error al guardar el cambio.");
          console.error("SUPABASE ERROR:", error);
        } else {
          alert("✅ Panel actualizado correctamente para la combiner " + combinerSeleccionado);
        }
      }}
    >
      <label className="block">
        <span className="font-semibold">No. de Mesa</span>
        <input type="number" className="w-full border p-2 rounded" required />
      </label>

      <label className="block">
        <span className="font-semibold">Ubicación del panel</span>
        <select className="w-full border p-2 rounded" required>
          <option value="">Seleccione</option>
          <option value="superior">Superior</option>
          <option value="inferior">Inferior</option>
        </select>
      </label>

      <label className="block">
        <span className="font-semibold">No. de Panel</span>
        <input type="number" className="w-full border p-2 rounded" required />
        <span className="text-xs text-gray-500 italic">
          Conteo de derecha a izquierda
        </span>
      </label>

      <div className="flex justify-between gap-4">
        <button
          type="submit"
          className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
        >
          Guardar cambio
        </button>
        <button
          type="button"
          className="bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700"
          onClick={() => setCombinerSeleccionado(null)}
        >
          Cerrar
        </button>
      </div>
    </form>
  </div>
)}

{/* Tabla de cambios registrada: visible para todos */}
{combinerSeleccionado && cambiosPanel.length > 0 && (
  <div className="mt-6 border-t pt-4">
    <h3 className="text-lg font-bold mb-4">📋 Cambios registrados para {combinerSeleccionado}</h3>
    <table className="w-full text-sm text-left border border-gray-300">
      <thead className="bg-gray-200">
        <tr>
          <th className="px-3 py-2">Fecha</th>
          <th className="px-3 py-2">Mesa</th>
          <th className="px-3 py-2">Ubicación</th>
          <th className="px-3 py-2">No. Panel</th>
        </tr>
      </thead>
      <tbody>
        {cambiosPanel.map((item, i) => (
          <tr key={i} className="border-t">
            <td className="px-3 py-2">{new Date(item.fecha).toLocaleString()}</td>
            <td className="px-3 py-2">{item.mesa}</td>
            <td className="px-3 py-2 capitalize">{item.ubicacion}</td>
            <td className="px-3 py-2">{item.panel}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
  
)}      
  </div>
     )}
                {/* Modal de historial por material */}
        {detalleMaterial && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl shadow-lg max-w-3xl w-full">
              <h3 className="text-xl font-bold mb-4">Historial de: {detalleMaterial.nombre}</h3>

              {/* Imagen si existe */}
              {imagenMaterial && (
                <div className="flex justify-center mb-4">
                  <img
                    src={imagenMaterial}
                    alt={`Imagen de ${detalleMaterial.nombre}`}
                    className="max-h-48 object-contain rounded shadow"
                  />
                </div>
              )}

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
                <button
                  onClick={() => setDetalleMaterial(null)}
                  className="bg-red-500 text-white px-4 py-2 rounded"
                >
                         Cerrar
            </button>
          </div>
        </div>
      </div>
    )}
    
  </div>
</div>   
</div>  
);
}

export default App;
