const express = require('express');
const oracledb = require('oracledb');
const path = require('path');
const app = express();
const port = 3000;

app.use(express.json());

// Inicialización de Oracle
try {
  oracledb.initOracleClient({ libDir: 'C:\\oracle_client' });
} catch (err) {
  console.error(' Error crítico al cargar Oracle:', err);
}

const dbConfig = {
  user: "BASE2",
  password: "312",
  connectString: "localhost/xe"
};

// --- RUTAS DE NAVEGACIÓN ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- RUTA: LOGIN ---
app.post('/login', async (req, res) => {
    const { usuario, password } = req.body;
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
            `SELECT TERC_NOMBRES FROM TERCEROS WHERE TERC_ID = :u AND TERC_ID = :p`,
            { u: usuario, p: password },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        if (result.rows.length > 0) {
            res.json({ success: true, nombre: result.rows[0].TERC_NOMBRES });
        } else {
            res.json({ success: false });
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
    finally { if (connection) await connection.close(); }
});

// --- RUTA: AUDITORÍA (PROCESOS) ---
app.get('/datos', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(`SELECT * FROM V_AUDITORIAS`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
  finally { if (connection) await connection.close(); }
});

// --- RUTA: LISTAR TERCEROS (DATOS/TABLAS) ---
app.get('/terceros', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        // Traemos ID, Nombres y Apellidos de la tabla TERCEROS
        const result = await connection.execute(
            `SELECT TERC_ID, TERC_NOMBRES, TERC_APELLIDOS FROM TERCEROS`,
            [], 
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al consultar TERCEROS" });
    } finally {
        if (connection) {
            await connection.close();
        }
    }
});

// --- RUTA: GUARDAR ASIGNACIÓN DE PENSUM (BOTÓN VERDE) ---
app.post('/asignar-pensum', async (req, res) => {
    const { PENS_ID, TERC_ID, PERIODO } = req.body;
    let connection;

    try {
        connection = await oracledb.getConnection(dbConfig);
        
        // INSERT exacto con los 3 campos que necesitas
        const sql = `INSERT INTO TERC_PENSUMS (PENS_ID, TERC_ID, TEPE_PERIODO) 
                     VALUES (:pens, :terc, :peri)`;
        
        await connection.execute(sql, {
            pens: PENS_ID,  // Aquí llegará el 1000
            terc: TERC_ID,  // El ID del estudiante que buscaste
            peri: PERIODO   // Ejemplo: 202601 como se ve en tu captura
        }, { autoCommit: true });

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});

app.listen(port, () => { 
    console.log(`🚀 Servidor Uniremington corriendo en http://localhost:${port}`);
    console.log(`💡 Todo listo para la revisión del profe.`);
});