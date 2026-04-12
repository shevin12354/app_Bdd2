const express = require('express');
const oracledb = require('oracledb');
const path = require('path');
const app = express();
const port = 3000;


try {
  oracledb.initOracleClient({ libDir: 'C:\\oracle_client' });
} catch (err) {
  console.error(' Error crítico al cargar librerías de Oracle:', err);
}

// Configuración de conexión para el usuario de la Uniremington
const dbConfig = {
  user: "BASE2",
  password: "312",
  connectString: "localhost/xe"
};


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

//  RUTA DE DATOS (API): Entrega los datos de la vista V_AUDITORIAS en formato JSON
app.get('/datos', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(
      `SELECT * FROM V_AUDITORIAS`,
      [], 
      { outFormat: oracledb.OUT_FORMAT_OBJECT } // Entrega los datos como objetos { columna: valor }
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error en la base de datos: " + err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {
        console.error("Error al cerrar la conexión:", e);
      }
    }
  }
});

// Lanzamiento del servidor
app.listen(port, () => {
  console.log(`\n ¡PROYECTO LISTO!`);
  console.log(`-------------------------------------------`);
  console.log(` Ver Interfaz (Tabla): http://localhost:${port}`);
  console.log(` Ver Datos Puros (JSON): http://localhost:${port}/datos`);
  console.log(`-------------------------------------------\n`);
  console.log(`papoche`);
});