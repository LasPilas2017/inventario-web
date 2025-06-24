import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import Login from "./Login";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import React from "react";
import ReporteMaquinaria from "./ReporteMaquinaria";
import { FiDownload } from "react-icons/fi";

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
  const [filtroPlanta, setFiltroPlanta] = useState("");
  const [filtroCombiner, setFiltroCombiner] = useState("");
  const [stringsRegistrados, setStringsRegistrados] = useState([]);

useEffect(() => {
  const obtenerStringsRegistrados = async () => {
    const { data, error } = await supabase.from("registro_strings").select("*");

    if (error) {
      console.error("Error al cargar datos:", error);
    } else {
      setStringsRegistrados(data);
    }
  };

  obtenerStringsRegistrados();
}, []);


  useEffect(() => {
  const obtenerDatos = async () => {
    const { data, error } = await supabase.from("registro_strings").select("*");
    if (error) {
      console.error("Error cargando datos:", error);
    } else {
      setStringsRegistrados(data);
    }
  };
  obtenerDatos();
}, []);


useEffect(() => {
  const cargarStrings = async () => {
    const { data, error } = await supabase.from("registro_strings").select("*");
    if (error) {
      console.error("Error al cargar strings:", error);
    } else {
      setStringsRegistrados(data);
    }
  };

  cargarStrings();
}, []);


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

  const [form, setForm] = useState({
    planta: "",
    combiner: "",
    potencia: "",
    strings: [{ numero: "", fila: "", mesa: "" }]
  });

// formulario para guardar los datos de la página paneles y combiner
const guardarDatosCombiner = async () => {
  const { planta, combiner, strings, potencia, mesas, paneles } = formCombiner;

  if (!planta || !combiner || !strings || !potencia || !mesas) {
    alert("Por favor completa todos los campos.");
    return;
  }

  const { error } = await supabase.from("registro_strings").insert([
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

const exportarPDF = () => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const titulo = "Registro y localización de strings";

  doc.setFontSize(18);
  const textWidth = doc.getTextWidth(titulo);
  const x = (pageWidth - textWidth) / 2;
  doc.text(titulo, x, 20);

  const columnas = ["Planta", "Combiner", "String", "Fila", "Mesa", "Paneles", "Potencia(W)"];
  const filas = stringsRegistrados
    .filter(s =>
      (!filtroPlanta || s.planta === filtroPlanta) &&
      (!filtroCombiner || s.combiner === filtroCombiner)
    )
    .map(s => [s.planta, s.combiner, s.numero, s.fila, s.mesa, s.paneles, s.potencia]);

  autoTable(doc, {
    head: [columnas],
    body: filas,
    startY: 30,
    theme: "grid",
    styles: {
      lineWidth: 0.5, // 👈 Aquí se marca el grosor de las líneas
      lineColor: [0, 0, 0], // Negro puro
      halign: "center",
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center"
    },
    margin: { top: 10 }
  });

  doc.save("registro_strings.pdf");
};



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
      .from("registro_strings")
      .select("*")
      .order("planta", { ascending: true })      
      .order("combiner", { ascending: true });   
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

const guardarStrings = async () => {
  if (!form.planta || !form.combiner || !form.potencia) {
    alert("Por favor, completa todos los campos antes de guardar.");
    return;
  }

  const registros = form.strings.map((s) => ({
    planta: form.planta,
    combiner: form.combiner,
    potencia: parseInt(form.potencia),
    numero: s.numero,
    fila: s.fila,
    mesa: s.mesa,
    paneles: 28,
  }));

  const { error } = await supabase.from("registro_strings").insert(registros);
  if (error) {
    console.error("Error al guardar:", error);
  } else {
    alert("Datos guardados correctamente.");

    // Limpiar formulario
    setForm({
      planta: "",
      combiner: "",
      potencia: "",
      strings: [],
    });

    // Recargar registros
    const { data, error: errorFetch } = await supabase.from("registro_strings").select("*");
    if (errorFetch) console.error("Error al recargar:", errorFetch);
    else setStringsRegistrados(data);
  }
};




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

{tab === "paneles" && (
  <div>
    <h2 className="text-xl font-bold mb-4 text-center">☀️ Registro de Strings por Combiner</h2>

    {/* Formulario de ingreso */}
    <div className="bg-white p-4 rounded shadow max-w-4xl mx-auto grid gap-4 mb-10">
      <label className="font-semibold">Planta</label>
      <select
        className="p-2 border rounded text-center"
        value={form.planta}
        onChange={(e) => setForm({ ...form, planta: e.target.value })}
      >
        <option value="">Selecciona Planta</option>
        <option value="Las Pilas 1">Las Pilas 1</option>
        <option value="Las Pilas 2">Las Pilas 2</option>
      </select>

      <label className="font-semibold">Combiner</label>
      <select
        className="p-2 border rounded text-center"
        value={form.combiner}
        onChange={(e) => setForm({ ...form, combiner: e.target.value })}
        disabled={!form.planta}
      >
        <option value="">Selecciona Combiner</option>
        {["A", "B"].flatMap(prefijo =>
          [...Array(14).keys()].map(i => (
            <option key={`${prefijo}${i + 1}`} value={`${prefijo}${i + 1}`}>
              {`${prefijo}${i + 1}`}
            </option>
          ))
        )}

      </select>

      <input
        type="number"
        className="p-2 border rounded text-center"
        placeholder="Potencia de los paneles (W)"
        value={form.potencia}
        onChange={(e) => setForm({ ...form, potencia: e.target.value })}
      />

      {/* Etiquetas arriba de los campos solo en el primero */}
      {form.strings.map((s, idx) => (
        <div key={idx} className="grid grid-cols-5 gap-2 items-center">
          {idx === 0 && (
            <>
              <label className="col-span-1 text-center font-medium">String</label>
              <label className="col-span-1 text-center font-medium">Fila origen</label>
              <label className="col-span-1 text-center font-medium">Mesa</label>
              <span className="col-span-1"></span>
              <span className="col-span-1"></span>
            </>
          )}

          <select
            className="p-2 border rounded text-center"
            value={s.numero}
            onChange={(e) => {
              const updated = [...form.strings];
              updated[idx].numero = parseInt(e.target.value);
              setForm({ ...form, strings: updated });
            }}
          >
            <option value="">String</option>
            {[...Array(18).keys()].map(i => (
              <option key={i} value={i + 1}>{i + 1}</option>
            ))}
          </select>

          <input
            className="p-2 border rounded text-center"
            placeholder="Fila origen"
            value={s.fila}
            onChange={(e) => {
              const updated = [...form.strings];
              updated[idx].fila = e.target.value;
              setForm({ ...form, strings: updated });
            }}
          />

          <select
            className="p-2 border rounded text-center"
            value={s.mesa}
            onChange={(e) => {
              const updated = [...form.strings];
              updated[idx].mesa = e.target.value;
              setForm({ ...form, strings: updated });
            }}
          >
            <option value="">Mesa</option>
            {[...Array(8).keys()].map(i => (
              <option key={i} value={i + 1}>{i + 1}</option>
            ))}
          </select>

          <span className="text-gray-600 text-center">→ 28 paneles</span>

          <button
            type="button"
            onClick={() => {
              const updated = [...form.strings];
              updated.splice(idx, 1);
              setForm({ ...form, strings: updated });
            }}
            className="text-red-500 hover:text-red-700 text-lg"
            title="Quitar"
          >
            ❌
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() =>
          setForm({
            ...form,
            strings: [...form.strings, { numero: "", fila: "", mesa: "" }]
          })
        }
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 w-full text-center"
      >
        ➕ Agregar String
      </button>

      <div className="font-semibold text-blue-700 text-center">
        Total de paneles: {form.strings.length * 28}
      </div>

      <button
        onClick={guardarStrings}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
      >
        Guardar datos del Combiner
      </button>
    </div>

    {/* Tabla de registros */}
    <div className="max-w-6xl mx-auto bg-white p-4 rounded shadow">
      <div className="flex flex-col sm:flex-row gap-2 justify-center mb-4">
        <select
          className="p-2 border rounded"
          value={filtroPlanta}
          onChange={(e) => setFiltroPlanta(e.target.value)}
        >
          <option value="">Todas las plantas</option>
          <option value="Las Pilas 1">Las Pilas 1</option>
          <option value="Las Pilas 2">Las Pilas 2</option>
        </select>

        <select
          className="p-2 border rounded"
          value={filtroCombiner}
          onChange={(e) => setFiltroCombiner(e.target.value)}
        >
          <option value="">Todos los combiners</option>
          {[...Array(14).keys()].map(i => (
            <option key={i} value={`A${i + 1}`}>A{i + 1}</option>
          ))}
          {[...Array(14).keys()].map(i => (
            <option key={i} value={`B${i + 1}`}>B{i + 1}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto max-h-[400px] overflow-y-scroll">
        <div className="flex justify-end mb-4">
           <button
            onClick={exportarPDF}
            className="text-blue-600 hover:text-blue-800 text-2xl"
            title="Descargar PDF"
          >
            <FiDownload />
          </button>
        </div>

        <table className="min-w-full table-auto border border-gray-300">
          <thead className="bg-gray-200">
            <tr>
              <th className="border p-2">Planta</th>
              <th className="border p-2">Combiner</th>
              <th className="border p-2">String</th>
              <th className="border p-2">Fila origen</th>
              <th className="border p-2">Mesa</th>
              <th className="border p-2">Paneles</th>
              <th className="border p-2">Potencia(W)</th>
            </tr>
          </thead>
          <tbody>
            {stringsRegistrados
              .filter(s =>
                (!filtroPlanta || s.planta === filtroPlanta) &&
                (!filtroCombiner || s.combiner === filtroCombiner)
              )
              .map((s, idx) => (
                <tr key={idx}>
                  <td className="border p-2">{s.planta}</td>
                  <td className="border p-2">{s.combiner}</td>
                  <td className="border p-2">{s.numero}</td>
                  <td className="border p-2">{s.fila}</td>
                  <td className="border p-2">{s.mesa}</td>
                  <td className="border p-2">{s.paneles}</td>
                  <td className="border p-2">{s.potencia}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
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
