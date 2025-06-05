import React, { useEffect, useState } from "react";
import { supabase } from "../supabase"; // Asegúrate de que este path sea correcto

export default function IngresoMaquinaria({ volver }) {
  const [formulario, setFormulario] = useState({
    numero: "",
    marca: "",
    modelo: "",
    anio: "",
    horometro: "",
    combustible: "",
    tipo: "",
    estado: "",
    ubicacion: "",
    observaciones: "",
    foto: null,
  });

  const [maquinarias, setMaquinarias] = useState([]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setFormulario({ ...formulario, [name]: files[0] });
    } else {
      setFormulario({ ...formulario, [name]: value });
    }
  };

  const cargarMaquinarias = async () => {
    const { data, error } = await supabase
      .from("maquinaria")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setMaquinarias(data);
  };

  useEffect(() => {
    cargarMaquinarias();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    let fotoUrl = "";
    if (formulario.foto) {
      const nombreArchivo = `${Date.now()}_${formulario.foto.name}`;
      const { error: errorUpload } = await supabase.storage
        .from("fotos-maquinaria")
        .upload(nombreArchivo, formulario.foto);

      if (!errorUpload) {
        const { data: urlData } = supabase.storage
          .from("fotos-maquinaria")
          .getPublicUrl(nombreArchivo);
        fotoUrl = urlData.publicUrl;
      }
    }

    const { error } = await supabase.from("maquinaria").insert([
      {
        numero: formulario.numero,
        marca: formulario.marca,
        modelo: formulario.modelo,
        anio: parseInt(formulario.anio),
        horometro: parseInt(formulario.horometro),
        combustible: formulario.combustible,
        tipo: formulario.tipo,
        estado: formulario.estado,
        ubicacion: formulario.ubicacion,
        observaciones: formulario.observaciones,
        foto_url: fotoUrl,
      },
    ]);

    if (error) {
      alert("Error al guardar la máquina");
      console.error(error);
      return;
    }

    alert("✅ Máquina registrada correctamente");
    setFormulario({
      numero: "",
      marca: "",
      modelo: "",
      anio: "",
      horometro: "",
      combustible: "",
      tipo: "",
      estado: "",
      ubicacion: "",
      observaciones: "",
      foto: null,
    });
    cargarMaquinarias();
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">📝 Ingreso de Maquinaria</h2>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="grid gap-4 max-w-xl mx-auto bg-white p-4 rounded shadow mb-10">
        <input name="numero" placeholder="No. de Máquina" value={formulario.numero} onChange={handleChange} className="border p-2 rounded" />
        <input name="marca" placeholder="Marca" value={formulario.marca} onChange={handleChange} className="border p-2 rounded" />
        <input name="modelo" placeholder="Modelo" value={formulario.modelo} onChange={handleChange} className="border p-2 rounded" />
        <input name="anio" type="number" placeholder="Año" value={formulario.anio} onChange={handleChange} className="border p-2 rounded" />
        <input name="horometro" type="number" placeholder="Horómetro" value={formulario.horometro} onChange={handleChange} className="border p-2 rounded" />

        <select name="combustible" value={formulario.combustible} onChange={handleChange} className="border p-2 rounded">
          <option value="">Tipo de Combustible</option>
          <option value="Regular">Regular</option>
          <option value="Regular con Mezcla">Regular con Mezcla</option>
        </select>

        <select name="tipo" value={formulario.tipo} onChange={handleChange} className="border p-2 rounded">
          <option value="">Tipo de Máquina</option>
          <option value="Desbrozadora">Desbrozadora</option>
          <option value="Tractor Corta Grama">Tractor Corta Grama</option>
          <option value="Corta Grama tipo carro">Corta Grama tipo carro</option>
        </select>

        <select name="estado" value={formulario.estado} onChange={handleChange} className="border p-2 rounded">
          <option value="">Estado</option>
          <option value="Funcional">Funcional</option>
          <option value="En mantenimiento">En mantenimiento</option>
          <option value="Dañada">Dañada</option>
        </select>

        <input name="ubicacion" placeholder="Ubicación" value={formulario.ubicacion} onChange={handleChange} className="border p-2 rounded" />
        <textarea name="observaciones" placeholder="Observaciones" value={formulario.observaciones} onChange={handleChange} className="border p-2 rounded" />

        <input type="file" name="foto" accept="image/*" onChange={handleChange} className="p-2" />

        <div className="flex justify-between">
          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">Guardar</button>
          <button type="button" onClick={volver} className="bg-blue-600 text-white px-4 py-2 rounded">⬅ Volver</button>
        </div>
      </form>

      {/* Tarjetas de máquinas registradas */}
      <h3 className="text-xl font-semibold mb-4 ml-4 flex items-center gap-2">📋 Maquinaria Registrada</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
        {maquinarias.map((m) => (
          <div key={m.id} className="bg-white rounded shadow p-4">
            {m.foto_url && (
              <img src={m.foto_url} alt={m.marca} className="w-full h-40 object-cover rounded mb-3" />
            )}
            <h4 className="font-bold">#{m.numero} - {m.marca}</h4>
            <p><strong>Modelo:</strong> {m.modelo}</p>
            <p><strong>Año:</strong> {m.anio}</p>
            <p><strong>Tipo:</strong> {m.tipo}</p>
            <p><strong>Combustible:</strong> {m.combustible}</p>
            <p><strong>Estado:</strong> {m.estado}</p>
            <p><strong>Ubicación:</strong> {m.ubicacion}</p>
            <p className="text-sm text-gray-500">{m.observaciones}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
