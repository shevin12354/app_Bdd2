const express = require('express');
const oracledb = require('oracledb');
const path = require('path');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(__dirname));

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
// Ruta inicial de promedios
app.get('/obtener-promedios', async (req, res) => {
  await consultarPromedios('', res);
});

// Ruta con buscador
app.get('/obtener-promedios/:busqueda', async (req, res) => {
  await consultarPromedios(req.params.busqueda, res);
});

async function consultarPromedios(filtro, res) {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    let sql = `SELECT * FROM v_promedios`;
    let binds = {};

    if (filtro) {
      // Filtramos por ID, Nombres o Apellidos
      sql += ` WHERE ID LIKE :f 
                     OR UPPER(NOMBRES) LIKE UPPER(:f) 
                     OR UPPER(APELLIDOS) LIKE UPPER(:f)`;
      binds = { f: `%${filtro}%` };
    }

    // CAMBIO AQUÍ: Cambiamos el orden de nota (DESC) a nombres (ASC)
    sql += ` ORDER BY UPPER(NOMBRES) ASC, UPPER(APELLIDOS) ASC`;

    const result = await connection.execute(sql, binds);
    res.json(result.rows);
  } catch (err) {
    console.error("Error en consulta de promedios:", err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.close();
  }
}

app.get('/api/historias', async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);
    // Columnas: HIST_PERIODO, TERC_ID, CURS_ID, HIST_NOTA
    const sql = `SELECT HIST_PERIODO, TERC_ID, CURS_ID, HIST_NOTA FROM HISTORIAS ORDER BY HIST_PERIODO DESC`;
    const result = await conn.execute(sql);
    res.json(result.rows);
  } catch (err) {
    console.error("Error en Oracle HISTORIAS:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

app.get('/api/pensums', async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);
    // SQL corregido para apuntar a la tabla maestra PENSUMS
    const sql = `SELECT PENS_ID, PROG_ID, PENS_PERIODO FROM PENSUMS ORDER BY PENS_ID`;
    const result = await conn.execute(sql);
    res.json(result.rows);
  } catch (err) {
    console.error("Error en Oracle PENSUMS:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

app.get('/api/cursos', async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);
    // SQL con tus 4 columnas: CURS_ID, TERC_ID, ASIG_ID, CURS_PERIODO
    const sql = `SELECT CURS_ID, TERC_ID, ASIG_ID, CURS_PERIODO FROM CURSOS ORDER BY CURS_ID`;
    const result = await conn.execute(sql);
    res.json(result.rows);
  } catch (err) {
    console.error("Error en Oracle CURSOS:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

app.get('/api/programas', async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);
    const sql = `SELECT PROG_ID, PROG_PROGRAMA FROM PROGRAMAS ORDER BY PROG_ID`;
    const result = await conn.execute(sql);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});



// --- RUTA: AUDITORÍA DE NOTAS ---
// 1. Ruta para cuando el buscador está VACÍO
app.get('/auditoria-notas', async (req, res) => {
  await ejecutarConsultaAuditoria('', res);
});

// 2. Ruta para cuando el usuario escribe algo (ID o Nombre)
app.get('/auditoria-notas/:busqueda', async (req, res) => {
  await ejecutarConsultaAuditoria(req.params.busqueda, res);
});


// 3. Función auxiliar para no repetir el código de Oracle
async function ejecutarConsultaAuditoria(filtro, res) {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    // Si no hay filtro, traemos todo. Si hay, aplicamos el LIKE.
    let sql = `SELECT * FROM V_AUDITORIAS`;
    let binds = {};

    if (filtro) {
      sql += ` WHERE TERC_ID LIKE :f 
                     OR UPPER(TERC_NOMBRES) LIKE UPPER(:f) 
                     OR UPPER(TERC_APELLIDOS) LIKE UPPER(:f)`;
      binds = { f: `%${filtro}%` };
    }

    sql += ` ORDER BY FECHA DESC`;

    const result = await connection.execute(sql, binds);
    res.json(result.rows);

  } catch (err) {
    console.error("Error en Auditoría:", err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.close();
  }
}

// --- RUTA: LISTAR TERCEROS (DATOS/TABLAS) ---
app.get('/terceros', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    // Añadimos ORDER BY para el orden alfabético por nombres
    const sql = `
            SELECT TERC_ID, TERC_NOMBRES, TERC_APELLIDOS, TERC_ROL 
            FROM TERCEROS 
            ORDER BY UPPER(TERC_NOMBRES) ASC
        `;

    const result = await connection.execute(
      sql,
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

app.get('/auditoria-notas', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    // Usamos el nombre exacto de tu vista
    const sql = `SELECT * FROM V_AUDITORIAS ORDER BY FECHA DESC`;
    const result = await connection.execute(sql);

    // Enviamos el array de filas (result.rows)
    res.json(result.rows);
  } catch (err) {
    console.error("Error en Oracle:", err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// --- RUTA: GUARDAR ASIGNACIÓN DE PENSUM (BOTÓN VERDE) ---
app.post('/asignar-pensum', async (req, res) => {
  const { TERC_ID, PENS_ID } = req.body; // Solo necesitamos estos dos
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    // Llamada al procedimiento con solo 2 argumentos como lo definiste
    const sql = `
            BEGIN 
                SP_ING_TERC_PENSUMS(:terc, :pens); 
            END;
        `;

    await connection.execute(sql, {
      terc: TERC_ID, // Corresponde a T_ID
      pens: PENS_ID  // Corresponde a P_ID
    }, { autoCommit: true });

    res.json({ success: true });

  } catch (err) {
    console.error("Error al ejecutar SP_ING_TERC_PENSUMS:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  } finally {
    if (connection) await connection.close();
  }
});

app.post('/gestionar-terceros', async (req, res) => {
  const { p_id, p_nom, p_ape, p_rol, p_accion } = req.body;
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    await connection.execute(
      `BEGIN PRC_GESTIONAR_TERCEROS(:id, :nom, :ape, :rol, :accion); END;`,
      { id: p_id, nom: p_nom, ape: p_ape, rol: p_rol, accion: p_accion },
      { autoCommit: true }
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.delete('/terceros/:id', async (req, res) => {
  const id = req.params.id;
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    await connection.execute(
      `DELETE FROM TERCEROS WHERE TERC_ID = :id`,
      { id },
      { autoCommit: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});
app.get('/api/asignaturas', async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(dbConfig);
    const sql = `SELECT ASIG_ID, ASIG_ASIGNATURA, ASIG_CREDITOS, ASIG_CODIGO FROM ASIGNATURAS ORDER BY ASIG_ID`;
    const result = await conn.execute(sql);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

app.get('/obtener-pensum-estudiante/:id', async (req, res) => {
  const tercId = req.params.id;
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    // Tu consulta SQL adaptada para Node.js
    const sql = `
            SELECT H.HIST_PERIODO, H.CURS_ID, A.ASIG_ASIGNATURA
            FROM HISTORIAS H, CURSOS C, ASIGNATURAS A
            WHERE H.CURS_ID = C.CURS_ID 
              AND C.ASIG_ID = A.ASIG_ID 
              AND H.TERC_ID = :id
        `;

    const result = await connection.execute(sql, { id: tercId });

    // Enviamos las filas encontradas
    res.json({ success: true, datos: result.rows });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.get('/obtener-promedios', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    // Usamos UPPER para que el orden alfabético sea perfecto (A-Z)
    const sql = `SELECT * FROM v_promedios ORDER BY UPPER(TERC_NOMBRE) ASC`;
    const result = await connection.execute(sql);
    res.json(result.rows);
  } catch (err) {
    console.error("Error en Promedios:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.listen(port, () => {
  console.log(`🚀 Servidor Uniremington corriendo en http://localhost:${port}`);
  console.log(`💡 Todo listo para la revisión del profe.`);
});