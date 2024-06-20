const { uploadDocumentToS3, downloadDocumentFromS3, deleteDocumentFromS3 } = require('../services/s3Service');
const db = require('../../config/db'); // Importa el objeto de conexión a la base de datos PostgreSQL

// Función para registrar una acción en la auditoría
const registrarAccion = async (usuarioId, accion, detalles) => {
  const query = `
    INSERT INTO RegistrosAuditoria (UsuarioID, Accion, Detalles, FechaHora)
    VALUES ($1, $2, $3, NOW());
  `;
  const values = [usuarioId, accion, detalles];
  await db.query(query, values);
};

// Controlador para compartir un documento
exports.shareDocument = async (req, res) => {
  const { documentId, recipientUserId, permissions } = req.body;
  const senderUserId = req.user.usuarioID;

  try {
    // Verificar si el documento existe
    const documentQuery = 'SELECT * FROM Documentos WHERE DocumentoID = $1';
    const documentResult = await db.query(documentQuery, [documentId]);

    if (documentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Documento no encontrado' });
    }

    // Insertar el registro de compartir documento
    const shareQuery = `
      INSERT INTO DocumentosCompartidos (DocumentoID, RemitenteID, DestinatarioID, Permisos, FechaEnvio)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *;
    `;
    const shareResult = await db.query(shareQuery, [documentId, senderUserId, recipientUserId, permissions]);

    // Registrar la acción en la auditoría
    await registrarAccion(senderUserId, 'Compartir Documento', `Documento ${documentId} compartido con el usuario ${recipientUserId} con permisos ${permissions}`);

    res.status(201).json({ message: 'Documento compartido correctamente', shareResult: shareResult.rows[0] });
  } catch (error) {
    console.error('Error al compartir el documento:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// Controlador para agregar un nuevo documento
exports.addDocument = async (req, res) => {
  try {
    const { titulo, descripcion, usuarioId, tipoDocumentoId } = req.body;
    const { originalname, buffer } = req.file;

    // Subir el documento a Amazon S3 y obtener la URL
    const fileUrl = await uploadDocumentToS3(originalname, buffer);

    // Guardar la URL del documento en PostgreSQL
    const insertQuery = `
      INSERT INTO Documentos (Titulo, Descripcion, URL, FechaCreacion, UsuarioID, TipoDocumentoID)
      VALUES ($1, $2, $3, NOW(), $4, $5)
      RETURNING *;
    `;

    const values = [titulo, descripcion, fileUrl, usuarioId, tipoDocumentoId];
    const result = await db.query(insertQuery, values);

    await registrarAccion(usuarioId, 'Agregar Documento', `Documento ${result.rows[0].documentoid} agregado por el usuario ${usuarioId}`);

    res.status(201).json({ message: 'Documento añadido correctamente', fileUrl });
  } catch (error) {
    console.error('Error adding document:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Controlador para obtener (descargar) un documento
exports.downloadDocument = async (req, res) => {
  const { documentUrl } = req.body;
  const usuarioId = req.user.usuarioID; // Asumiendo que el usuario está autenticado y su ID está disponible

  try {
    const documentData = await downloadDocumentFromS3(documentUrl);

    // Registra la descarga en la base de datos
    await db.query('UPDATE Documentos SET Descargas = Descargas + 1, FechaDescarga = CURRENT_TIMESTAMP WHERE URL = $1', [documentUrl]);

    // Registrar la acción en la auditoría
    await registrarAccion(usuarioId, 'Descargar Documento', `Documento con URL ${documentUrl} descargado por el usuario ${usuarioId}`);

    // Establece los encabezados de respuesta y envía el documento
    res.setHeader('Content-Disposition', `attachment; filename="${decodeURIComponent(documentUrl.split('/').pop())}"`);
    res.setHeader('Content-Type', documentData.contentType);
    res.send(documentData.data);
    console.log('Descarga exitosa');
  } catch (error) {
    console.error('Error al obtener el documento:', error);
    if (error.message === 'File not found') {
      res.status(404).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
};

// Controlador para obtener la lista de documentos con búsqueda avanzada
exports.getDocumentList = async (req, res) => {
  try {
    const { titulo, descripcion, usuarioId, tipoDocumentoId, fechaInicio, fechaFin } = req.query;

    let query = 'SELECT * FROM Documentos WHERE 1=1';
    const values = [];

    if (titulo) {
      query += ' AND Titulo ILIKE $1';
      values.push(`%${titulo}%`);
    }
    if (descripcion) {
      query += ' AND Descripcion ILIKE $2';
      values.push(`%${descripcion}%`);
    }
    if (usuarioId) {
      query += ' AND UsuarioID = $3';
      values.push(usuarioId);
    }
    if (tipoDocumentoId) {
      query += ' AND TipoDocumentoID = $4';
      values.push(tipoDocumentoId);
    }
    if (fechaInicio && fechaFin) {
      query += ' AND FechaCreacion BETWEEN $5 AND $6';
      values.push(fechaInicio);
      values.push(fechaFin);
    }

    const result = await db.query(query, values);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error obteniendo la lista de documentos:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// Controlador para eliminar un documento
exports.deleteDocument = async (req, res) => {
  const { documentUrl } = req.body;
  const usuarioId = req.user.usuarioID; // Asumiendo que el usuario está autenticado y su ID está disponible

  try {
    console.log('Documento a eliminar:', documentUrl);

    const s3Result = await deleteDocumentFromS3(documentUrl);
    if (s3Result.error) {
      return res.status(404).json({ message: s3Result.error });
    }

    const deleteQuery = `
      DELETE FROM Documentos
      WHERE URL = $1
      RETURNING *;
    `;
    const result = await db.query(deleteQuery, [documentUrl]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Documento no encontrado en la base de datos' });
    }

    await registrarAccion(usuarioId, 'Eliminar Documento', `Documento con URL ${documentUrl} eliminado por el usuario ${usuarioId}`);

    res.status(200).json({ message: 'Documento eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar el documento:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// Controlador para obtener un documento por su ID
exports.getDocumentById = async (req, res) => {
  const { documentId } = req.params;

  try {
    const query = `
      SELECT * 
      FROM Documentos 
      WHERE DocumentoID = $1;
    `;

    const result = await db.query(query, [documentId]);

    if (!result || result.rows.length === 0) {
      return res.status(404).json({ message: 'Documento no encontrado' });
    }

    const documento = result.rows[0];

    const versionsQuery = `
      SELECT versiondocumentoid, documentoid, url_s3, fechacreacion
      FROM VersionesDocumentos
      WHERE documentoid = $1;
    `;

    const versionsResult = await db.query(versionsQuery, [documentId]);
    const versionesAnteriores = versionsResult.rows;

    res.status(200).json({ documento, versionesAnteriores });
  } catch (error) {
    console.error('Error al obtener el documento por ID:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// Controlador para actualizar un documento
exports.updateDocument = async (req, res) => {
  const { documentId } = req.params;
  const usuarioId = req.user.usuarioID; // Asumiendo que el usuario está autenticado y su ID está disponible

  try {
    const { titulo, descripcion, tipoDocumentoId } = req.body;
    const { originalname, buffer } = req.file;

    const updatedFileUrl = await uploadDocumentToS3(originalname, buffer);

    const updateQuery = `
      UPDATE Documentos 
      SET Titulo = $1, Descripcion = $2, URL = $3, FechaModificacion = NOW(), UsuarioID = $4, TipoDocumentoID = $5
      WHERE DocumentoID = $6
      RETURNING *;
    `;

    const updateValues = [titulo, descripcion, updatedFileUrl, usuarioId, tipoDocumentoId, documentId];
    const updatedResult = await db.query(updateQuery, updateValues);

    const insertVersionQuery = `
      INSERT INTO VersionesAnteriores (VersionDocumentoID, DocumentoID, URL_S3, FechaCreacion)
      VALUES ($1, $2, $3, $4);
    `;

    const insertVersionValues = [updatedResult.rows[0].documentoid, documentId, updatedResult.rows[0].url, new Date()];
    await db.query(insertVersionQuery, insertVersionValues);

    await registrarAccion(usuarioId, 'Actualizar Documento', `Documento ${documentId} actualizado por el usuario ${usuarioId}`);

    res.status(200).json({ message: 'Documento actualizado correctamente', updatedFileUrl });
  } catch (error) {
    console.error('Error al actualizar el documento:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

// Controlador para obtener el historial de acciones de un documento específico
exports.getAuditLogs = async (req, res) => {
  const { documentId } = req.query;

  try {
    const query = `
      SELECT * 
      FROM RegistrosAuditoria
      WHERE Detalles LIKE $1
      ORDER BY FechaHora DESC;
    `;
    const values = [`%Documento ${documentId}%`];

    const result = await db.query(query, values);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error al obtener el historial de acciones:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};
