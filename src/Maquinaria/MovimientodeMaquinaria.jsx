// MovimientodeMaquinaria.jsx
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function MovimientodeMaquinaria({ maquinaria, volver }) {
  const [vista, setVista] = useState("registro");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [destino, setDestino] = useState("");
  const [responsableRetiro, setResponsableRetiro] = useState("");
  const [responsableMaquina, setResponsableMaquina] = useState(maquinaria?.responsable || "");
  const [horometroSalida, setHorometroSalida] = useState("");
  const [estado, setEstado] = useState(maquinaria?.estado || "");
  const [herramientas, setHerramientas] = useState([{ nombre: "", cantidad: "" }]);
  const [llevaAceite, setLlevaAceite] = useState(false);
  const [marcaAceite, setMarcaAceite] = useState("");
  const [viscosidad, setViscosidad] = useState("");
  const [cantidadAceite, setCantidadAceite] = useState("");
  const [aceiteAutolu, setAceiteAutolu] = useState("");
  const [fotos, setFotos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);

  const fileInputRef = useRef();

  useEffect(() => {
    if (vista === "ver") cargarMovimientos();
  }, [vista]);

  const cargarMovimientos = async () => {
    const { data } = await supabase
      .from("movimiento_maquinaria")
      .select("*")
      .eq("id_maquinaria", maquinaria.id)
      .order("fecha", { ascending: false });

    setMovimientos(data);
  };

  const agregarHerramienta = () => {
    setHerramientas([...herramientas, { nombre: "", cantidad: "" }]);
  };

  const actualizarHerramienta = (index, campo, valor) => {
    const nuevas = [...herramientas];
    nuevas[index][campo] = valor;
    setHerramientas(nuevas);
  };

  const subirFotos = async (event) => {
    const archivos = event.target.files;
    const urls = [];
    for (let archivo of archivos) {
      const extension = archivo.name.split('.').pop();
      const nombre = `mov_${Date.now()}.${extension}`;
      const { data, error } = await supabase.storage
        .from("fotos-movimientos")
        .upload(nombre, archivo);

      if (!error) {
        const url = supabase.storage.from("fotos-movimientos").getPublicUrl(nombre).data.publicUrl;
        urls.push(url);
      }
    }
    setFotos(urls);
  };

  const guardarMovimiento = async () => {
    const { error } = await supabase.from("movimiento_maquinaria").insert([
      {
        fecha,
        destino,
        id_maquinaria: maquinaria.id,
        responsable_retiro: responsableRetiro,
        responsable_maquina: responsableMaquina,
        horometro_salida: horometroSalida,
        estado_maquina: estado,
        herramientas: herramientas.filter((h) => h.nombre && h.cantidad),
        aceite: maquinaria.tipo === "Tractor Corta Grama" && llevaAceite
          ? { marca: marcaAceite, viscosidad, cantidad: cantidadAceite }
          : null,
        aceite_autolu: maquinaria.tipo === "Desbrozadora" ? aceiteAutolu : null,
        fotos: fotos
      }
    ]);

    if (!error) {
      alert("Movimiento guardado");
      setVista("ver");
      cargarMovimientos();
    }
  };

const generarPDF = async (mov) => {
    const { data: maq, error } = await supabase
      .from("maquinaria")
      .select("*")
      .eq("id", mov.id_maquinaria)
      .single();

    if (error) {
      alert("No se pudo obtener la informaci\u00f3n de la maquinaria");
      return;
    }

    const doc = new jsPDF();
    const logo = new Image();
    logo.src = "/img/LOGOTUNCAJ.png";

    logo.onload = async () => {
      doc.addImage(logo, "PNG", 10, 10, 35, 20);
      doc.setFontSize(14);
      doc.text("Reporte de Movimiento de Maquinaria", 60, 20);

      let y = 35;

    if (maq.foto_url) {
  const img = new Image();
  img.crossOrigin = "Anonymous";
  img.src = maq.foto_url;

  await new Promise((res) => {
    img.onload = () => {
      doc.addImage(img, "JPEG", 10, y, 40, 40);
      res();
    };
  });
}


      const infoY = y + 5;
      doc.setFontSize(10);
      doc.text("Información Maquinaria:", 55, infoY);
      doc.text(`No. Máquina: ${maq.numero || "-"}`, 55, infoY + 6);
      doc.text(`Marca: ${maq.marca || "-"}`, 55, infoY + 12);
      doc.text(`Modelo: ${maq.modelo || "-"}`, 55, infoY + 18);
      doc.text(`Año: ${maq.anio || "-"}`, 55, infoY + 24);
      doc.text(`Tipo: ${maq.tipo || "-"}`, 55, infoY + 30);
      doc.text(`Combustible: ${maq.combustible || "-"}`, 55, infoY + 36);
      doc.text(`Ubicación: ${maq.ubicacion || "-"}`, 55, infoY + 42);
      doc.text(`Responsable: ${maq.responsable || "-"}`, 55, infoY + 48);


      const x3 = 120;
      doc.text("Movimiento:", x3, infoY);
      doc.text(`Fecha: ${mov.fecha}`, x3, infoY + 6);
      doc.text(`Destino: ${mov.destino || "-"}`, x3, infoY + 12);
      doc.text(`Responsable Retiro: ${mov.responsable_retiro}`, x3, infoY + 18);
      doc.text(`Horometro salida: ${mov.horometro_salida}`, x3, infoY + 24);
      doc.text(`Estado: ${mov.estado_maquina}`, x3, infoY + 30);

      let yActual = y + 60;

      if (mov.fotos?.length > 0) {
        doc.setFontSize(11);
        doc.text("Fotos del Movimiento:", 10, yActual + 5);
        yActual += 10;

        let x = 10;
        let count = 0;

        for (let foto of mov.fotos) {
          const img = new Image();
          img.crossOrigin = "Anonymous";
          img.src = foto;
          await new Promise((res) => {
            img.onload = () => {
              doc.addImage(img, "JPEG", x, yActual, 60, 40);
              x += 65;
              count++;
              if (count % 3 === 0) {
                x = 10;
                yActual += 45;
              }
              res();
            };
          });
        }

        if (count % 3 !== 0) yActual += 45;
      }

      autoTable(doc, {
        startY: yActual + 5,
        head: [["Herramienta", "Cantidad"]],
        body: mov.herramientas?.map((h) => [h.nombre, h.cantidad]) || [],
        styles: { fontSize: 9 },
      });

      yActual = doc.lastAutoTable.finalY + 5;

      if (mov.aceite) {
        autoTable(doc, {
          startY: yActual,
          head: [["Marca Aceite", "Viscosidad", "Cantidad"]],
          body: [[mov.aceite.marca, mov.aceite.viscosidad, mov.aceite.cantidad]],
          styles: { fontSize: 9 },
        });
      } else if (mov.aceite_autolu) {
        doc.text(`Aceite Autolu: ${mov.aceite_autolu} galones`, 10, yActual);
      }

      doc.save(`Movimiento_${mov.fecha}.pdf`);
    };
  };


  return (
    <div className="bg-white border rounded-xl p-4">
      <div className="flex gap-2 mb-4">
        <button onClick={() => setVista("registro")} className={`px-4 py-2 rounded ${vista === "registro" ? "bg-blue-200 font-bold" : "bg-gray-100"}`}>Registrar Movimiento</button>
        <button onClick={() => setVista("ver")} className={`px-4 py-2 rounded ${vista === "ver" ? "bg-blue-200 font-bold" : "bg-gray-100"}`}>Ver Movimientos</button>
      </div>

      {vista === "registro" && (
        <div className="space-y-4">
          <label>Fecha:<input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full p-2 border rounded" /></label>
          <label>Destino:
            <select value={destino} onChange={(e) => setDestino(e.target.value)} className="w-full p-2 border rounded">
              <option value="">-- Seleccionar --</option>
              <option value="Planta Taxisco">Planta Taxisco</option>
              <option value="Planta Avellana">Planta Avellana</option>
              <option value="Planta Pedro de Alvarado">Planta Pedro de Alvarado</option>
              <option value="Planta Buena vista">Planta Buena vista</option>
            </select>
          </label>
          <label>Responsable del retiro:<input type="text" value={responsableRetiro} onChange={(e) => setResponsableRetiro(e.target.value)} className="w-full p-2 border rounded" /></label>
          <label>Responsable de la máquina:<input type="text" value={responsableMaquina} onChange={(e) => setResponsableMaquina(e.target.value)} className="w-full p-2 border rounded" /></label>
          <label>Horómetro de salida:<input type="number" value={horometroSalida} onChange={(e) => setHorometroSalida(e.target.value)} className="w-full p-2 border rounded" /></label>
          <label>Estado de la máquina:<input type="text" value={estado} onChange={(e) => setEstado(e.target.value)} className="w-full p-2 border rounded" /></label>

          <div>
            <label>Herramientas:</label>
            {herramientas.map((herr, index) => (
              <div key={index} className="flex gap-2 mt-2">
                <input type="text" placeholder="Herramienta" value={herr.nombre} onChange={(e) => actualizarHerramienta(index, "nombre", e.target.value)} className="w-full p-2 border rounded" />
                <input type="number" placeholder="Cantidad" value={herr.cantidad} onChange={(e) => actualizarHerramienta(index, "cantidad", e.target.value)} className="w-24 p-2 border rounded" />
              </div>
            ))}
            <button onClick={agregarHerramienta} className="mt-2 bg-gray-200 px-3 py-1 rounded">+ Agregar</button>
          </div>

          {maquinaria?.tipo === "Tractor Corta Grama" && (
            <div>
              <label>¿Lleva aceite?</label>
              <select value={llevaAceite ? "Sí" : "No"} onChange={(e) => setLlevaAceite(e.target.value === "Sí")} className="w-full p-2 border rounded">
                <option value="No">No</option>
                <option value="Sí">Sí</option>
              </select>
              {llevaAceite && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                  <input type="text" placeholder="Marca" value={marcaAceite} onChange={(e) => setMarcaAceite(e.target.value)} className="p-2 border rounded" />
                  <input type="text" placeholder="Viscosidad" value={viscosidad} onChange={(e) => setViscosidad(e.target.value)} className="p-2 border rounded" />
                  <select value={cantidadAceite} onChange={(e) => setCantidadAceite(e.target.value)} className="p-2 border rounded">
                    <option value="">Cantidad</option>
                    <option value="1/4">1/4 galón</option>
                    <option value="1/2">1/2 galón</option>
                    <option value="3/4">3/4 galón</option>
                    <option value="1">1 galón</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {maquinaria?.tipo === "Desbrozadora" && (
            <label>Aceite Autolu (galones):<input type="number" value={aceiteAutolu} onChange={(e) => setAceiteAutolu(e.target.value)} className="w-full p-2 border rounded" /></label>
          )}

          <div>
            <label>Fotos del material que salió:</label>
            <input type="file" ref={fileInputRef} multiple accept="image/*" onChange={subirFotos} className="w-full" />
          </div>

          <div className="flex justify-between">
            <button onClick={guardarMovimiento} className="bg-green-600 text-white px-4 py-2 rounded">Guardar Movimiento</button>
            <button onClick={volver} className="bg-gray-500 text-white px-4 py-2 rounded">Cancelar</button>
          </div>
        </div>
      )}

      {vista === "ver" && (
        <div>
          <h3 className="text-lg font-bold">📄 Movimientos Guardados</h3>
          <ul className="mt-2 space-y-2">
            {movimientos.map((mov) => (
              <li key={mov.id} className="border p-3 rounded shadow-sm">
                <div className="flex justify-between">
                  <div>
                    <strong>{mov.fecha}</strong> - {mov.responsable_retiro} - H: {mov.horometro_salida}<br />
                    <span className="text-gray-600 text-sm">Destino: {mov.destino || "-"}</span>
                  </div>
                  <button onClick={() => generarPDF(mov)} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">Descargar PDF</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}