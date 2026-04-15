  function ejecutarLogin() {
            const usuario = document.getElementById('usu').value.trim();
            const password = document.getElementById('pass').value.trim();

            if (!usuario || !password) {
                return Swal.fire('Atención', 'Ingresa tu usuario y contraseña.', 'warning');
            }

            fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario, password })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        document.getElementById('vista-login').style.display = 'none';
                        document.getElementById('vista-principal').style.display = 'block';
                        document.getElementById('saludoUser').innerText = '👤 ' + data.nombre;
                        cambiarSeccion('inicio', null);
                    } else {
                        Swal.fire('Error', 'Documento o contraseña incorrectos', 'error');
                    }
                })
                .catch(() => Swal.fire('Error', 'No se pudo conectar con el servidor', 'error'));
        }

        // Enter en los campos de login
        document.addEventListener('DOMContentLoaded', () => {
            document.getElementById('pass').addEventListener('keydown', e => {
                if (e.key === 'Enter') ejecutarLogin();
            });
            document.getElementById('usu').addEventListener('keydown', e => {
                if (e.key === 'Enter') document.getElementById('pass').focus();
            });
            modalTercero = new bootstrap.Modal(document.getElementById('modalTercero'));
        });


        // ══════════════════════════════════════════════════════
        //  NAVEGACIÓN
        // ══════════════════════════════════════════════════════
        function cambiarSeccion(seccion, elemento) {
            // Oculta todas las secciones
            document.querySelectorAll('.seccion-web').forEach(s => s.style.display = 'none');
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

            // Muestra la sección correcta
            const target = document.getElementById('sec-' + seccion);
            if (target) target.style.display = 'block';
            if (elemento) elemento.classList.add('active');

            // FIX: disparadores de carga para TODAS las secciones
            if (seccion === 'datos') { cambiarVistaTabla('terceros', document.querySelector('#pills-tab .nav-link')); }
            if (seccion === 'auditoria') { cargarDatosAuditoria(); }
            if (seccion === 'promedios') { cargarPromedios(); }
            // FIX: carga de estudiantes al entrar a "Asignar Pensum"
            if (seccion === 'asignar') {
                listaCompletaEstudiantes = []; // limpia caché para siempre tener datos frescos
                estudianteSeleccionadoID = null;
                document.getElementById('busc_id').value = '';
                document.getElementById('lista_estudiantes').style.display = 'none';
                document.getElementById('resultado_busqueda').style.display = 'none';
                document.getElementById('resultado_consulta_profe').style.display = 'none';
                document.getElementById('sel_programa').disabled = true;
            }
        }


        // ══════════════════════════════════════════════════════
        //  AUDITORÍA
        // ══════════════════════════════════════════════════════
        function cargarDatosAuditoria() {
            fetch('/auditoria-notas')
                .then(res => res.json())
                .then(data => {
                    const cuerpo = document.getElementById('cuerpoTabla');
                    const registros = Array.isArray(data) ? data : (data.datos || []);
                    pintarTablaAuditoria(registros, cuerpo);
                })
                .catch(() => {
                    document.getElementById('cuerpoTabla').innerHTML =
                        '<tr><td colspan="7" class="text-center text-danger py-4">Error de conexión</td></tr>';
                });
        }

        function filtrarAuditoria() {
            const valor = document.getElementById('inputBuscarAuditoria').value.trim();
            const url = valor === '' ? '/auditoria-notas' : `/auditoria-notas/${encodeURIComponent(valor)}`;

            fetch(url)
                .then(res => res.json())
                .then(data => {
                    const registros = Array.isArray(data) ? data : (data.datos || []);
                    pintarTablaAuditoria(registros, document.getElementById('cuerpoTabla'));
                })
                .catch(err => console.error('Error filtrando auditoría:', err));
        }

        function pintarTablaAuditoria(registros, cuerpo) {
            cuerpo.innerHTML = '';
            if (!registros.length) {
                cuerpo.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No se encontraron datos</td></tr>';
                return;
            }
            registros.forEach(fila => {
                const fecha = fila[0] ? new Date(fila[0]).toLocaleString('es-CO') : '---';
                cuerpo.innerHTML += `
        <tr>
            <td class="small text-muted">${fecha}</td>
            <td><span class="badge bg-light text-dark border">${fila[1] ?? '---'}</span></td>
            <td><strong>${fila[2] ?? '---'}</strong></td>
            <td>${(fila[3] ?? '')} ${(fila[4] ?? '')}</td>
            <td><small>${fila[6] ?? '---'}</small></td>
            <td class="text-center text-danger">${fila[7] ?? '0.0'}</td>
            <td class="text-center fw-bold text-primary">${fila[8] ?? '0.0'}</td>
        </tr>`;
            });
        }


        // ══════════════════════════════════════════════════════
        //  ASIGNAR PENSUM
        // ══════════════════════════════════════════════════════
        let estudianteSeleccionadoID = null;
        let listaCompletaEstudiantes = [];

        function filtrarEstudiantesLista() {
            const texto = document.getElementById('busc_id').value.toUpperCase().trim();
            const listaContenedor = document.getElementById('lista_estudiantes');

            if (texto.length < 1) { listaContenedor.style.display = 'none'; return; }

            if (listaCompletaEstudiantes.length === 0) {
                fetch('/terceros')
                    .then(res => res.json())
                    .then(data => { listaCompletaEstudiantes = data; renderizarResultados(texto); })
                    .catch(() => Swal.fire('Error', 'No se pudo cargar la lista de terceros', 'error'));
            } else {
                renderizarResultados(texto);
            }
        }

        function renderizarResultados(filtro) {
            const listaContenedor = document.getElementById('lista_estudiantes');
            const sugerencias = listaCompletaEstudiantes.filter(est =>
                String(est.TERC_ID).includes(filtro) ||
                (est.TERC_NOMBRES || '').toUpperCase().includes(filtro) ||
                (est.TERC_APELLIDOS || '').toUpperCase().includes(filtro)
            );

            if (sugerencias.length > 0) {
                listaContenedor.innerHTML = sugerencias.map(est => {
                    const badgeColor = est.TERC_ROL === 'DOCENTE' ? 'bg-danger' :
                        est.TERC_ROL === 'ADMINISTRATIVO' ? 'bg-warning' : 'bg-info';
                    return `
            <button type="button"
                class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                onclick="validarYSeleccionar('${est.TERC_ID}', '${est.TERC_NOMBRES} ${est.TERC_APELLIDOS}', '${est.TERC_ROL}')">
                <div><strong>${est.TERC_ID}</strong> — ${est.TERC_NOMBRES} ${est.TERC_APELLIDOS}</div>
                <span class="badge ${badgeColor}">${est.TERC_ROL}</span>
            </button>`;
                }).join('');
                listaContenedor.style.display = 'block';
            } else {
                listaContenedor.innerHTML = '<div class="list-group-item text-muted text-center">Sin resultados</div>';
                listaContenedor.style.display = 'block';
            }
        }

        function validarYSeleccionar(id, nombreCompleto, rol) {
            if (rol !== 'ESTUDIANTE') {
                return Swal.fire({
                    icon: 'error', title: 'Acción no permitida',
                    text: `${nombreCompleto} tiene el rol de ${rol}. Solo se pueden asignar pensums a ESTUDIANTES.`,
                    confirmButtonColor: '#003d94'
                });
            }
            seleccionarEstudiante(id, nombreCompleto);
        }

        function seleccionarEstudiante(id, nombre) {
            estudianteSeleccionadoID = id;
            document.getElementById('busc_id').value = nombre + ' (ID: ' + id + ')';
            const res = document.getElementById('resultado_busqueda');
            res.innerHTML = `✅ Seleccionado: <strong>${nombre}</strong> — ID: ${id}`;
            res.style.display = 'block';
            document.getElementById('lista_estudiantes').style.display = 'none';
            document.getElementById('sel_programa').disabled = false;
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Estudiante seleccionado', showConfirmButton: false, timer: 1500 });
        }

        function procesarAsignacionFinal() {
            const pensId = Number(document.getElementById('sel_pensum').value);
            const tercId = Number(estudianteSeleccionadoID);

            if (!tercId) return Swal.fire('Atención', 'Selecciona un estudiante primero.', 'warning');
            if (!pensId) return Swal.fire('Atención', 'Selecciona un plan de estudios primero.', 'warning');

            fetch('/asignar-pensum', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ TERC_ID: tercId, PENS_ID: pensId })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        Swal.fire('¡Éxito!', 'Asignación registrada en Oracle.', 'success');
                        mostrarMateriasAsignadas(tercId);
                    } else {
                        Swal.fire('Error en Oracle', data.error, 'error');
                    }
                })
                .catch(() => Swal.fire('Error', 'No se pudo conectar con el servidor', 'error'));
        }

        function mostrarMateriasAsignadas(id) {
            fetch(`/obtener-pensum-estudiante/${id}`)
                .then(res => res.json())
                .then(res => {
                    const contenedor = document.getElementById('resultado_consulta_profe');
                    if (res.success && res.datos.length > 0) {
                        let tabla = `
            <div class="card mt-3 shadow-sm">
                <div class="card-body">
                    <h6 class="fw-bold mb-3">📋 Materias del Estudiante</h6>
                    <table class="table table-hover table-sm">
                        <thead class="table-light">
                            <tr><th>Periodo</th><th>Cod. Curso</th><th>Asignatura</th></tr>
                        </thead>
                        <tbody>`;
                        res.datos.forEach(fila => {
                            tabla += `<tr><td>${fila[0]}</td><td>${fila[1]}</td><td>${fila[2]}</td></tr>`;
                        });
                        tabla += `</tbody></table></div></div>`;
                        contenedor.innerHTML = tabla;
                        contenedor.style.display = 'block';
                    } else {
                        contenedor.innerHTML = '<div class="alert alert-info mt-3">No se encontraron materias asignadas para este estudiante.</div>';
                        contenedor.style.display = 'block';
                    }
                })
                .catch(() => {
                    const contenedor = document.getElementById('resultado_consulta_profe');
                    contenedor.innerHTML = '<div class="alert alert-danger mt-3">Error al consultar las materias.</div>';
                    contenedor.style.display = 'block';
                });
        }


        // ══════════════════════════════════════════════════════
        //  TERCEROS CRUD
        // ══════════════════════════════════════════════════════
        let modalTercero;

        function cargarTablaTerceros() {
            fetch('/terceros')
                .then(res => res.json())
                .then(data => {
                    const body = document.getElementById('tabla_terceros_body');
                    if (!data.length) {
                        body.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">No hay registros</td></tr>';
                        return;
                    }
                    body.innerHTML = data.map(t => `
        <tr>
            <td><strong>${t.TERC_ID}</strong></td>
            <td>
                <div class="d-flex align-items-center">
                    <div class="icon-circle">👤</div>
                    <span>${t.TERC_NOMBRES}</span>
                </div>
            </td>
            <td>${t.TERC_APELLIDOS}</td>
            <td><span class="badge ${t.TERC_ROL === 'DOCENTE' ? 'bg-danger' : t.TERC_ROL === 'ADMINISTRATIVO' ? 'bg-warning' : 'bg-info'}">${t.TERC_ROL}</span></td>
            <td>
                <button class="btn btn-sm btn-warning me-1" onclick="editarTercero('${t.TERC_ID}','${t.TERC_NOMBRES.replace(/'/g, "\\'")}','${t.TERC_APELLIDOS.replace(/'/g, "\\'")}','${t.TERC_ROL}')">✏️</button>
                <button class="btn btn-sm btn-danger"  onclick="eliminarTercero(${t.TERC_ID})">🗑️</button>
            </td>
        </tr>`).join('');
                })
                .catch(() => Swal.fire('Error', 'No se pudo cargar la tabla de terceros', 'error'));
        }

        function abrirModalTercero() {
            document.getElementById('tituloModal').innerText = 'Nuevo Tercero';
            document.getElementById('form_accion').value = 'INSERT';
            document.getElementById('terc_id').value = '';
            document.getElementById('terc_id').readOnly = true;   // FIX: readonly, no disabled
            document.getElementById('terc_nombres').value = '';
            document.getElementById('terc_apellidos').value = '';
            document.getElementById('terc_rol').value = 'ESTUDIANTE';
            modalTercero.show();
        }

        function editarTercero(id, nombres, apellidos, rol) {
            document.getElementById('tituloModal').innerText = 'Editar Tercero';
            document.getElementById('form_accion').value = 'UPDATE';
            document.getElementById('terc_id').value = id;
            document.getElementById('terc_id').readOnly = true;   // FIX: readonly, no disabled
            document.getElementById('terc_nombres').value = nombres;
            document.getElementById('terc_apellidos').value = apellidos;
            document.getElementById('terc_rol').value = rol;
            modalTercero.show();
        }

        function guardarTercero() {
            const accion = document.getElementById('form_accion').value;
            const datos = {
                p_accion: accion,
                p_id: document.getElementById('terc_id').value,
                p_nom: document.getElementById('terc_nombres').value.trim(),
                p_ape: document.getElementById('terc_apellidos').value.trim(),
                p_rol: document.getElementById('terc_rol').value
            };

            if (!datos.p_nom) return Swal.fire('Error', 'El nombre es obligatorio', 'error');
            if (accion === 'UPDATE' && !datos.p_id) return Swal.fire('Error', 'No hay un ID seleccionado para actualizar', 'error');

            fetch('/gestionar-terceros', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            })
                .then(res => res.json())
                .then(res => {
                    if (res.success) {
                        Swal.fire({ title: '¡Listo!', text: `Registro ${accion === 'INSERT' ? 'creado' : 'actualizado'} con éxito`, icon: 'success' });
                        modalTercero.hide();
                        cargarTablaTerceros();
                        listaCompletaEstudiantes = [];
                    } else {
                        Swal.fire('Error en Oracle', res.error, 'error');
                    }
                })
                .catch(() => Swal.fire('Error', 'No se pudo conectar con el servidor', 'error'));
        }

        function eliminarTercero(id) {
            Swal.fire({
                title: '¿Eliminar tercero?',
                text: 'Esta acción no se puede deshacer',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc2626',
                confirmButtonText: 'Sí, borrar',
                cancelButtonText: 'Cancelar'
            }).then(result => {
                if (result.isConfirmed) {
                    fetch(`/terceros/${id}`, { method: 'DELETE' })
                        .then(res => res.json())
                        .then(data => {
                            if (data.success) {
                                Swal.fire('¡Borrado!', 'El registro fue eliminado.', 'success');
                                cargarTablaTerceros();
                            } else {
                                Swal.fire('Error', 'No se pudo eliminar (posiblemente tiene pensum asignado)', 'error');
                            }
                        })
                        .catch(() => Swal.fire('Error', 'No se pudo conectar con el servidor', 'error'));
                }
            });
        }

        function importarDesdeExcel(event) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();

            reader.onload = async (e) => {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const hoja = workbook.Sheets[workbook.SheetNames[0]];
                const registros = XLSX.utils.sheet_to_json(hoja);

                if (!registros.length) return Swal.fire('Error', 'El archivo está vacío', 'error');

                Swal.fire({ title: 'Importando...', text: `Procesando ${registros.length} registros`, allowOutsideClick: false, didOpen: () => Swal.showLoading() });

                let errores = 0;
                for (const fila of registros) {
                    try {
                        const r = await fetch('/gestionar-terceros', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ p_id: fila.ID, p_nom: fila.NOMBRES, p_ape: fila.APELLIDOS, p_rol: fila.ROL || 'ESTUDIANTE', p_accion: 'INSERT' })
                        });
                        const d = await r.json();
                        if (!d.success) errores++;
                    } catch { errores++; }
                }

                // Limpia el input para que se pueda volver a usar
                event.target.value = '';
                Swal.close();
                Swal.fire('Proceso terminado', `Se importaron los datos. Errores: ${errores}`, errores > 0 ? 'warning' : 'success');
                cargarTablaTerceros();
                listaCompletaEstudiantes = [];
            };

            reader.readAsArrayBuffer(file);
        }


        // ══════════════════════════════════════════════════════
        //  CAMBIAR VISTA DE TABLA (DATOS)
        // ══════════════════════════════════════════════════════
        function cambiarVistaTabla(tabla, btn) {
            ['terceros', 'asignaturas', 'programas', 'cursos', 'pensums', 'historias'].forEach(v => {
                document.getElementById('vista-' + v).style.display = 'none';
            });
            document.querySelectorAll('#pills-tab .nav-link').forEach(b => b.classList.remove('active'));
            if (btn) btn.classList.add('active');

            const mapaFunciones = {
                terceros: cargarTablaTerceros,
                asignaturas: cargarTablaAsignaturas,
                programas: cargarProgramas,
                cursos: cargarCursos,
                pensums: cargarPensums,
                historias: cargarHistorias
            };

            const vista = document.getElementById('vista-' + tabla);
            if (vista) vista.style.display = 'block';
            if (mapaFunciones[tabla]) mapaFunciones[tabla]();
        }


        // ══════════════════════════════════════════════════════
        //  CARGA DE TABLAS
        // ══════════════════════════════════════════════════════
        function cargarTablaAsignaturas() {
            const body = document.getElementById('tabla_asignaturas_body');
            body.innerHTML = '<tr><td colspan="4" class="text-center">Cargando...</td></tr>';
            fetch('/api/asignaturas')
                .then(res => res.json())
                .then(data => {
                    if (!Array.isArray(data)) { body.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Error: ${data.error || 'Formato inválido'}</td></tr>`; return; }
                    body.innerHTML = data.length === 0
                        ? '<tr><td colspan="4" class="text-center text-muted">No hay asignaturas</td></tr>'
                        : data.map(f => `<tr><td class="fw-bold">${f[0]}</td><td>${f[1]}</td><td><span class="badge bg-info">${f[2]}</span></td><td><code>${f[3]}</code></td></tr>`).join('');
                })
                .catch(() => { body.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error de conexión</td></tr>'; });
        }

        function cargarCursos() {
            const body = document.getElementById('tabla_cursos_body');
            body.innerHTML = '<tr><td colspan="4" class="text-center">Cargando...</td></tr>';
            fetch('/api/cursos')
                .then(res => res.json())
                .then(data => {
                    if (!Array.isArray(data)) { body.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Error: ${data.error}</td></tr>`; return; }
                    body.innerHTML = data.length === 0
                        ? '<tr><td colspan="4" class="text-center text-muted">No hay cursos</td></tr>'
                        : data.map(f => `<tr><td class="fw-bold text-primary">${f[0]}</td><td>${f[1]}</td><td>${f[2]}</td><td><span class="badge bg-info">${f[3]}</span></td></tr>`).join('');
                })
                .catch(() => { body.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error de conexión</td></tr>'; });
        }

        function cargarProgramas() {
            const body = document.getElementById('tabla_programas_body');
            body.innerHTML = '<tr><td colspan="2" class="text-center">Cargando...</td></tr>';
            fetch('/api/programas')
                .then(res => res.json())
                .then(data => {
                    body.innerHTML = !data || data.length === 0
                        ? '<tr><td colspan="2" class="text-center text-muted">No hay programas</td></tr>'
                        : data.map(f => `<tr><td class="fw-bold" style="width:20%">${f[0]}</td><td>${f[1]}</td></tr>`).join('');
                })
                .catch(() => { body.innerHTML = '<tr><td colspan="2" class="text-center text-danger">Error de conexión</td></tr>'; });
        }

        function cargarPensums() {
            const body = document.getElementById('tabla_pensums_body');
            body.innerHTML = '<tr><td colspan="3" class="text-center">Cargando...</td></tr>';
            fetch('/api/pensums')
                .then(res => res.json())
                .then(data => {
                    if (!Array.isArray(data)) { body.innerHTML = `<tr><td colspan="3" class="text-center text-danger">Error: ${data.error}</td></tr>`; return; }
                    body.innerHTML = data.length === 0
                        ? '<tr><td colspan="3" class="text-center text-muted">No hay pensums</td></tr>'
                        : data.map(f => `<tr><td class="fw-bold text-success">${f[0]}</td><td>${f[1]}</td><td><span class="badge bg-dark">${f[2]}</span></td></tr>`).join('');
                })
                .catch(() => { body.innerHTML = '<tr><td colspan="3" class="text-center text-danger">Error de conexión</td></tr>'; });
        }

        function cargarHistorias() {
            const body = document.getElementById('tabla_historias_body');
            body.innerHTML = '<tr><td colspan="4" class="text-center">Cargando...</td></tr>';
            fetch('/api/historias')
                .then(res => res.json())
                .then(data => {
                    if (!Array.isArray(data)) { body.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Error: ${data.error}</td></tr>`; return; }
                    body.innerHTML = data.length === 0
                        ? '<tr><td colspan="4" class="text-center text-muted">No hay historias</td></tr>'
                        : data.map(f => {
                            const nota = parseFloat(f[3]);
                            return `<tr><td><span class="badge bg-secondary">${f[0]}</span></td><td>${f[1]}</td><td>${f[2]}</td><td class="fw-bold ${nota >= 3.0 ? 'text-success' : 'text-danger'}">${nota.toFixed(1)}</td></tr>`;
                        }).join('');
                })
                .catch(() => { body.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error de conexión</td></tr>'; });
        }


        // ══════════════════════════════════════════════════════
        //  PROMEDIOS
        // ══════════════════════════════════════════════════════
        function cargarPromedios() {
            document.getElementById('inputBuscarPromedio').value = '';
            filtrarPromedios();
        }

        function filtrarPromedios() {
            const valor = document.getElementById('inputBuscarPromedio').value.trim();
            const url = valor === '' ? '/obtener-promedios' : `/obtener-promedios/${encodeURIComponent(valor)}`;

            fetch(url)
                .then(res => res.json())
                .then(data => actualizarTablaPromedios(data))
                .catch(err => console.error('Error filtrando promedios:', err));
        }

        function actualizarTablaPromedios(data) {
            const contenedor = document.getElementById('container-promedios');
            if (!data || data.length === 0) {
                contenedor.innerHTML = '<p class="text-center py-3 text-muted">No se encontraron estudiantes.</p>';
                return;
            }
            let tabla = `
    <table class="table table-hover align-middle">
        <thead class="table-light">
            <tr><th>ID</th><th>Estudiante</th><th class="text-center">Promedio</th><th>Estado</th></tr>
        </thead>
        <tbody>`;
            data.forEach(fila => {
                const prom = Number(fila[3] || 0);
                const badge = prom >= 3.0 ? 'bg-success' : 'bg-danger';
                tabla += `
        <tr>
            <td>${fila[0]}</td>
            <td>${fila[1]} ${fila[2]}</td>
            <td class="text-center fw-bold ${prom >= 3.0 ? 'text-success' : 'text-danger'}">${prom.toFixed(2)}</td>
            <td><span class="badge ${badge}">${prom >= 3.0 ? 'Aprobado' : 'Reprobado'}</span></td>
        </tr>`;
            });
            tabla += '</tbody></table>';
            contenedor.innerHTML = tabla;
        }