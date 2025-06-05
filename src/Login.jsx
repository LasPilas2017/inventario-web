
import { useState } from "react";

const usuarios = [
  { nombre: "ErickF", password: "Tuncaj2017!", rol: "escritura" },
  { nombre: "JoseSup", password: "Tuncaj2017!", rol: "lectura" },
  { nombre: "AngieC", password: "Tuncaj2017!", rol: "lectura" },
  { nombre: "admin", password: "admin", rol: "lectura" },
];

export default function Login({ onLogin }) {
  const [nombre, setNombre] = useState("");
  const [password, setPassword] = useState("");

  const manejarLogin = () => {
    if (!nombre || !password) {
      alert("Por favor completa ambos campos.");
      return;
    }

    const usuario = usuarios.find(
      (u) =>
        u.nombre.toLowerCase() === nombre.toLowerCase() &&
        u.password === password
    );

    if (usuario) {
      onLogin(usuario);
    } else {
      alert("Usuario o contraseña incorrectos.");
    }
  };

  const manejarKeyPress = (e) => {
    if (e.key === "Enter") manejarLogin();
  };

  return (
    <div
      className="flex items-center justify-center min-h-screen bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/img/FondoLASPILAS.jpg')" }}
    >
      <div className="bg-white bg-opacity-90 p-6 rounded shadow-md w-80 text-center">
        {/* Logo de la planta */}
        <img
          src="/img/LOGOTUNCAJ.png"
          alt="Logo Tuncaj"
          className="w-24 h-auto mx-auto mb-4"
        />

        <h2 className="text-xl font-bold mb-4">Iniciar sesión</h2>

        <input
          type="text"
          placeholder="Usuario"
          className="w-full p-2 mb-3 border rounded"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onKeyDown={manejarKeyPress}
        />
        <input
          type="password"
          placeholder="Contraseña"
          className="w-full p-2 mb-4 border rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={manejarKeyPress}
        />
        <button
          onClick={manejarLogin}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Entrar
        </button>
      </div>
    </div>
  );
}
