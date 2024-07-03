const {
  uploadDocumentToS3,
  downloadDocumentFromS3,
  deleteDocumentFromS3,
} = require("../services/s3Service");
const db = require("../../config/db");

// Función para registrar una acción en la auditoría
const registrarAccion = async (usuarioId, documentoId, accion, detalles) => {
  const query = `
    INSERT INTO RegistrosAuditoria (UsuarioID, DocumentoID, Accion, Detalles, FechaHora)
    VALUES ($1, $2, $3, $4, NOW());
  `;
  const values = [usuarioId, documentoId, accion, detalles];
  await db.query(query, values);
};

// Controlador para obtener notificaciones
exports.getNotifications = async (req, res) => {
  const usuarioId = req.user.usuarioID;

  try {
    const notificationsQuery =
      "SELECT * FROM Notificaciones WHERE UsuarioID = $1 ORDER BY FechaHora DESC";
    const notificationsResult = await db.query(notificationsQuery, [usuarioId]);

    res.status(200).json(notificationsResult);
  } catch (error) {
    console.error("Error al obtener las notificaciones:", error);
    res.status(500).json({ message: "Error del servidor" });
  }
};

// Controlador para eliminar una notificación
exports.deleteNotification = async (req, res) => {
  const { notificationId } = req.params;
  const usuarioId = req.user.usuarioID;

  try {
    const deleteQuery = `
      DELETE FROM Notificaciones
      WHERE NotificacionID = $1 AND UsuarioID = $2
      RETURNING *;
    `;
    const result = await db.query(deleteQuery, [notificationId, usuarioId]);

    if (!result.length) {
      return res.status(404).json({ message: "Notificación no encontrada" });
    }

    res.status(200).json({ message: "Notificación eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar la notificación:", error);
    res.status(500).json({ message: "Error del servidor" });
  }
};

// Controlador para compartir un documento
exports.shareDocument = async (req, res) => {
  const { documentId, recipientUserId, permissions } = req.body;
  const senderUserId = req.user.usuarioID;

  try {
    // Verificar si el documento existe
    const documentQuery = "SELECT * FROM Documentos WHERE DocumentoID = $1";
    const documentResult = await db.query(documentQuery, [documentId]);

    if (!documentResult.length) {
      return res.status(404).json({ message: "Documento no encontrado" });
    }

    // Obtener el correo del remitente
    const userQuery = "SELECT CorreoElectronico FROM Usuarios WHERE UsuarioID = $1";
    const userResult = await db.query(userQuery, [senderUserId]);
    const senderEmail = userResult[0].correoelectronico;

    // Insertar el registro de compartir documento
    const shareQuery = `
      INSERT INTO DocumentosCompartidos (DocumentoID, RemitenteID, DestinatarioID, Permisos, FechaEnvio)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *;
    `;
    const shareResult = await db.query(shareQuery, [
      documentId,
      senderUserId,
      recipientUserId,
      permissions,
    ]);

    // Registrar la acción en la auditoría
    await registrarAccion(
      senderUserId,
      documentId,
      "Compartir Documento",
      `Documento compartido con el usuario ${recipientUserId} con permisos ${permissions} por ${senderEmail} el ${new Date().toLocaleString()}`
    );

    // Enviar notificación al destinatario
    await sendNotification(req.io, recipientUserId, {
      title: "Nuevo Documento Compartido",
      message: `El usuario ${senderEmail} ha compartido un documento contigo con los permisos ${permissions}.`,
      documentId: documentId,
    });

    res.status(201).json({
      message: "Documento compartido correctamente",
      shareResult: shareResult[0],
    });
  } catch (error) {
    console.error("Error al compartir el documento:", error);
    res.status(500).json({ message: "Error del servidor" });
  }
};

// Función para enviar notificaciones
const sendNotification = async (io, userId, notification) => {
  const notificationQuery = `
    INSERT INTO Notificaciones (UsuarioID, Titulo, Mensaje, DocumentoID, FechaHora)
    VALUES ($1, $2, $3, $4, NOW());
  `;
  const values = [
    userId,
    notification.title,
    notification.message,
    notification.documentId,
  ];
  await db.query(notificationQuery, values);

  // Emitir notificación a través de Socket.io
  io.to(userId).emit("notification", notification);
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
      RETURNING DocumentoID;
    `;

    const values = [titulo, descripcion, fileUrl, usuarioId, tipoDocumentoId];
    const result = await db.query(insertQuery, values);
    const documentId = result[0].documentoid;

    // Obtener el correo del usuario
    const userQuery = "SELECT CorreoElectronico FROM Usuarios WHERE UsuarioID = $1";
    const userResult = await db.query(userQuery, [usuarioId]);
    const userEmail = userResult[0].correoelectronico;

    await registrarAccion(
      usuarioId,
      documentId,
      "Agregar Documento",
      `Documento agregado por ${userEmail} el ${new Date().toLocaleString()}`
    );

    res
      .status(201)
      .json({ message: "Documento añadido correctamente", fileUrl });
  } catch (error) {
    console.error("Error adding document:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Controlador para obtener (descargar) un documento
exports.downloadDocument = async (req, res) => {
  const { documentUrl } = req.body;
  const usuarioId = req.user.usuarioID;

  try {
    const documentQuery = "SELECT DocumentoID FROM Documentos WHERE URL = $1";
    const documentResult = await db.query(documentQuery, [documentUrl]);

    

    const documentId = documentResult[0].documentoid;

    const documentData = await downloadDocumentFromS3(documentUrl);

    // Obtener el correo del usuario
    const userQuery = "SELECT CorreoElectronico FROM Usuarios WHERE UsuarioID = $1";
    const userResult = await db.query(userQuery, [usuarioId]);
    const userEmail = userResult[0].correoelectronico;

    // Registra la descarga en la base de datos
    await db.query(
      "UPDATE Documentos SET Descargas = Descargas + 1, FechaDescarga = CURRENT_TIMESTAMP WHERE URL = $1",
      [documentUrl]
    );

    // Registrar la acción en la auditoría
    await registrarAccion(
      usuarioId,
      documentId,
      "Descargar Documento",
      `Documento descargado por ${userEmail} el ${new Date().toLocaleString()}`
    );

    // Establece los encabezados de respuesta y envía el documento
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${decodeURIComponent(
        documentUrl.split("/").pop()
      )}"`
    );
    res.setHeader("Content-Type", documentData.contentType);
    res.send(documentData.data);
    console.log("Descarga exitosa");
  } catch (error) {
    console.error("Error al obtener el documento:", error);
    if (error.message === "File not found") {
      res.status(404).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Server error" });
    }
  }
};

// Controlador para descargar una versión anterior
exports.downloadVersion = async (req, res) => {
  const { versionUrl } = req.body;
  const usuarioId = req.user.usuarioID;

  try {
    const versionQuery = "SELECT DocumentoID FROM VersionesDocumentos WHERE URL_S3 = $1";
    const versionResult = await db.query(versionQuery, [versionUrl]);

    if (versionResult.length === 0) {
      return res.status(404).json({ message: "Versión no encontrada" });
    }

    const documentId = versionResult[0].documentoid;

    const versionData = await downloadDocumentFromS3(versionUrl);

    // Obtener el correo del usuario
    const userQuery = "SELECT CorreoElectronico FROM Usuarios WHERE UsuarioID = $1";
    const userResult = await db.query(userQuery, [usuarioId]);
    const userEmail = userResult[0].correoelectronico;

    // Registrar la acción en la auditoría
    await registrarAccion(
      usuarioId,
      documentId,
      "Descargar Versión",
      `Versión descargada por ${userEmail} el ${new Date().toLocaleString()}`
    );

    // Establece los encabezados de respuesta y envía la versión del documento
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${decodeURIComponent(
        versionUrl.split("/").pop()
      )}"`
    );
    res.setHeader("Content-Type", versionData.contentType);
    res.send(versionData.data);
    console.log("Descarga de versión exitosa");
  } catch (error) {
    console.error("Error al obtener la versión del documento:", error);
    if (error.message === "File not found") {
      res.status(404).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Server error" });
    }
  }
};

// Controlador para obtener la lista de documentos con búsqueda avanzada
exports.getDocuments = async (req, res) => {
  try {
    const { titulo, usuarioCorreo, tipoDocumentoId, fechaInicio, fechaFin } =
      req.query;

    let query = `
      SELECT 
        d.*, 
        u.CorreoElectronico AS UsuarioCorreo,
        td.Descripcion AS TipoDocumentoNombre
      FROM Documentos d
      JOIN Usuarios u ON d.UsuarioID = u.UsuarioID
      JOIN TiposDocumentos td ON d.TipoDocumentoID = td.TipoDocumentoID
      WHERE 1=1
    `;
    const values = [];

    if (titulo) {
      query += ` AND d.Titulo ILIKE $${values.length + 1}`;
      values.push(`%${titulo}%`);
    }
    if (usuarioCorreo) {
      query += ` AND u.CorreoElectronico ILIKE $${values.length + 1}`;
      values.push(`%${usuarioCorreo}%`);
    }
    if (tipoDocumentoId) {
      query += ` AND d.TipoDocumentoID = $${values.length + 1}`;
      values.push(tipoDocumentoId);
    }
    if (fechaInicio && fechaFin) {
      query += ` AND d.FechaCreacion BETWEEN $${values.length + 1} AND $${
        values.length + 2
      }`;
      values.push(fechaInicio, fechaFin);
    }

    const result = await db.query(query, values);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({ message: "Error fetching documents" });
  }
};

// Controlador para eliminar un documento
exports.deleteDocument = async (req, res) => {
  const { documentUrl } = req.body;
  const usuarioId = req.user.usuarioID;

  try {
    console.log("Documento a eliminar:", documentUrl);

    // Obtener el ID del documento
    const documentQuery = "SELECT DocumentoID FROM Documentos WHERE URL = $1";
    const documentResult = await db.query(documentQuery, [documentUrl]);
    if (!documentResult.length) {
      return res
        .status(404)
        .json({ message: "Documento no encontrado en la base de datos" });
    }
    const documentId = documentResult[0].documentoid;

    // Eliminar las versiones del documento
    const deleteVersionsQuery = `
      DELETE FROM VersionesDocumentos WHERE DocumentoID = $1;
    `;
    await db.query(deleteVersionsQuery, [documentId]);

    // Eliminar las notificaciones relacionadas con el documento
    const deleteNotificationsQuery = `
      DELETE FROM Notificaciones WHERE DocumentoID = $1;
    `;
    await db.query(deleteNotificationsQuery, [documentId]);

    // Eliminar las entradas en DocumentosCompartidos
    const deleteSharedDocsQuery = `
      DELETE FROM DocumentosCompartidos WHERE DocumentoID = $1;
    `;
    await db.query(deleteSharedDocsQuery, [documentId]);

    // Eliminar el documento de S3
    const s3Result = await deleteDocumentFromS3(documentUrl);
    if (s3Result.error) {
      return res.status(404).json({ message: s3Result.error });
    }

    // Eliminar el documento de la base de datos
    const deleteQuery = `
      DELETE FROM Documentos WHERE URL = $1 RETURNING *;
    `;
    const result = await db.query(deleteQuery, [documentUrl]);

    if (!result.length) {
      return res
        .status(404)
        .json({ message: "Documento no encontrado en la base de datos" });
    }

    // Obtener el correo del usuario
    const userQuery = "SELECT CorreoElectronico FROM Usuarios WHERE UsuarioID = $1";
    const userResult = await db.query(userQuery, [usuarioId]);
    const userEmail = userResult[0].correoelectronico;

    await registrarAccion(
      usuarioId,
      documentId,
      "Eliminar Documento",
      `Documento con URL ${documentUrl} eliminado por ${userEmail} el ${new Date().toLocaleString()}`
    );

    res.status(200).json({ message: "Documento eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar el documento:", error);
    res.status(500).json({ message: "Error del servidor" });
  }
};

// Controlador para obtener un documento por su ID y sus versiones anteriores
exports.getDocumentById = async (req, res) => {
  const { documentId } = req.params;

  try {
    const query = `
      SELECT 
        d.*, 
        u.CorreoElectronico AS UsuarioCorreo,
        td.Descripcion AS TipoDocumentoNombre
      FROM Documentos d
      JOIN Usuarios u ON d.UsuarioID = u.UsuarioID
      JOIN TiposDocumentos td ON d.TipoDocumentoID = td.TipoDocumentoID
      WHERE d.DocumentoID = $1;
    `;
    const result = await db.query(query, [documentId]);

    if (!result.length) {
      return res.status(404).json({ message: "Documento no encontrado" });
    }

    const documento = result;

    const versionsQuery = `
      SELECT 
        versiondocumentoid, 
        documentoid, 
        url_s3, 
        fechacreacion 
      FROM VersionesDocumentos 
      WHERE documentoid = $1;
    `;
    const versionsResult = await db.query(versionsQuery, [documentId]);
    const versionesAnteriores = versionsResult;

    res.status(200).json({ documento, versionesAnteriores });
  } catch (error) {
    console.error("Error al obtener el documento por ID:", error);
    res.status(500).json({ message: "Error del servidor" });
  }
};

// Controlador para obtener los tipos de documentos
exports.getDocumentTypes = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT TipoDocumentoID, Descripcion FROM TiposDocumentos"
    );
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching document types:", error);
    res.status(500).json({ message: "Error fetching document types" });
  }
};

// Controlador para actualizar un documento y generar una nueva versión
exports.updateDocument = async (req, res) => {
  const { documentId } = req.params;
  const usuarioId = req.user.usuarioID;

  try {
    const { originalname, buffer } = req.file;

    // Obtener la URL actual del documento para guardar como versión anterior
    const currentDocQuery = "SELECT URL FROM Documentos WHERE DocumentoID = $1";
    const currentDocResult = await db.query(currentDocQuery, [documentId]);
    if (!currentDocResult.length) {
      return res.status(404).json({ message: "Documento no encontrado" });
    }
    const currentUrl = currentDocResult[0].url;

    // Subir el nuevo documento a S3
    const updatedFileUrl = await uploadDocumentToS3(originalname, buffer);

    // Actualizar el documento con la nueva URL
    const updateQuery = `
      UPDATE Documentos 
      SET URL = $1, FechaCreacion = NOW(), UsuarioID = $2
      WHERE DocumentoID = $3
      RETURNING *;
    `;
    const updateValues = [updatedFileUrl, usuarioId, documentId];
    const updatedResult = await db.query(updateQuery, updateValues);

    // Guardar la versión anterior en la tabla de versiones
    const insertVersionQuery = `
      INSERT INTO VersionesDocumentos (DocumentoID, URL_S3, FechaCreacion)
      VALUES ($1, $2, NOW());
    `;
    await db.query(insertVersionQuery, [documentId, currentUrl]);

    // Obtener el correo del usuario
    const userQuery = "SELECT CorreoElectronico FROM Usuarios WHERE UsuarioID = $1";
    const userResult = await db.query(userQuery, [usuarioId]);
    const userEmail = userResult[0].correoelectronico;

    await registrarAccion(
      usuarioId,
      documentId,
      "Actualizar Documento",
      `Documento actualizado por ${userEmail} el ${new Date().toLocaleString()}`
    );

    res.status(200).json({
      message: "Documento actualizado correctamente",
      updatedFileUrl,
    });
  } catch (error) {
    console.error("Error al actualizar el documento:", error);
    res.status(500).json({ message: "Error del servidor" });
  }
};

// Controlador para eliminar una versión de documento
exports.deleteVersion = async (req, res) => {
  const { versionId } = req.params;
  const usuarioId = req.user.usuarioID;

  try {
    // Obtener la URL de la versión para eliminarla de S3
    const versionQuery =
      "SELECT URL_S3, DocumentoID FROM VersionesDocumentos WHERE VersionDocumentoID = $1";
    const versionResult = await db.query(versionQuery, [versionId]);
    if (!versionResult.length) {
      return res.status(404).json({ message: "Versión no encontrada" });
    }
    const { url_s3: versionUrl, documentoid: documentId } = versionResult[0];

    // Eliminar la versión de S3
    const s3Result = await deleteDocumentFromS3(versionUrl);
    if (s3Result.error) {
      return res.status(404).json({ message: s3Result.error });
    }

    // Eliminar la versión de la base de datos
    const deleteVersionQuery = `
      DELETE FROM VersionesDocumentos WHERE VersionDocumentoID = $1 RETURNING *;
    `;
    const deleteResult = await db.query(deleteVersionQuery, [versionId]);
    if (!deleteResult.length) {
      return res
        .status(404)
        .json({ message: "Versión no encontrada en la base de datos" });
    }

    // Obtener el correo del usuario
    const userQuery = "SELECT CorreoElectronico FROM Usuarios WHERE UsuarioID = $1";
    const userResult = await db.query(userQuery, [usuarioId]);
    const userEmail = userResult[0].correoelectronico;

    await registrarAccion(
      usuarioId,
      documentId,
      "Eliminar Versión",
      `Versión ${versionId} eliminada por ${userEmail} el ${new Date().toLocaleString()}`
    );

    res.status(200).json({ message: "Versión eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar la versión:", error);
    res.status(500).json({ message: "Error del servidor" });
  }
};

// Controlador para obtener el historial de acciones de un documento específico
exports.getAuditLogs = async (req, res) => {
  const { documentId } = req.query;

  try {
    const query = `
      SELECT ra.FechaHora, ra.Detalles
      FROM RegistrosAuditoria ra
      WHERE ra.DocumentoID = $1
      ORDER BY ra.FechaHora DESC;
    `;
    const values = [documentId];

    const result = await db.query(query, values);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error al obtener el historial de acciones:", error);
    res.status(500).json({ message: "Error del servidor" });
  }
};
