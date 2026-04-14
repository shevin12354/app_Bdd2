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
app.get('/terceros/:id', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);

        const result = await connection.execute(
            `SELECT * FROM TERCEROS WHERE TERC_ID = :id`,
            { id: req.params.id },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        res.json(result.rows[0] || null);

    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.close();
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

app.post('/terceros', async (req, res) => {
    const data = req.body;
    let connection;

    try {
        connection = await oracledb.getConnection(dbConfig);

        const sql = `INSERT INTO TERCEROS (
            TERC_ID, TERC_TIPO_DOC, TERC_NRO_DOC, TERC_GENERO,
            TERC_NOMBRES, TERC_APELLIDOS, TERC_DIRECC,
            TERC_CORREO, TERC_MOVIL, TERC_TIPO
        ) VALUES (
            :id, :tipoDoc, :nroDoc, :genero,
            :nombres, :apellidos, :direcc,
            :correo, :movil, :tipo
        )`;

        await connection.execute(sql, {
            id: data.TERC_ID,
            tipoDoc: data.TERC_TIPO_DOC,
            nroDoc: data.TERC_NRO_DOC,
            genero: data.TERC_GENERO,
            nombres: data.TERC_NOMBRES,
            apellidos: data.TERC_APELLIDOS,
            direcc: data.TERC_DIRECC,
            correo: data.TERC_CORREO,
            movil: data.TERC_MOVIL,
            tipo: data.TERC_TIPO
        }, { autoCommit: true });

        res.json({ success: true });

    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});

app.put('/terceros/:id', async (req, res) => {
    const data = req.body;
    let connection;

    try {
        connection = await oracledb.getConnection(dbConfig);

        const sql = `UPDATE TERCEROS SET
            TERC_TIPO_DOC = :tipoDoc,
            TERC_NRO_DOC = :nroDoc,
            TERC_GENERO = :genero,
            TERC_NOMBRES = :nombres,
            TERC_APELLIDOS = :apellidos,
            TERC_DIRECC = :direcc,
            TERC_CORREO = :correo,
            TERC_MOVIL = :movil,
            TERC_TIPO = :tipo
        WHERE TERC_ID = :id`;

        await connection.execute(sql, {
            id: req.params.id,
            tipoDoc: data.TERC_TIPO_DOC,
            nroDoc: data.TERC_NRO_DOC,
            genero: data.TERC_GENERO,
            nombres: data.TERC_NOMBRES,
            apellidos: data.TERC_APELLIDOS,
            direcc: data.TERC_DIRECC,
            correo: data.TERC_CORREO,
            movil: data.TERC_MOVIL,
            tipo: data.TERC_TIPO
        }, { autoCommit: true });

        res.json({ success: true });

    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});

app.delete('/terceros/:id', async (req, res) => {
    let connection;

    try {
        connection = await oracledb.getConnection(dbConfig);

        await connection.execute(
            `DELETE FROM TERCEROS WHERE TERC_ID = :id`,
            { id: req.params.id },
            { autoCommit: true }
        );

        res.json({ success: true });

    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});

app.listen(port, () => { 
    console.log(`🚀 Servidor Uniremington corriendo en http://localhost:${port}`);
    console.log(`💡 Todo listo para la revisión del profe.`);
});