const { uploadDocumentToS3, downloadDocumentFromS3, deleteDocumentFromS3 } = require('../services/s3Service');
const db = require('../../config/db'); // Importa el objeto de conexión a la base de datos PostgreSQL



// Controlador para agregar un nuevo documento
exports.addDocument = async (req, res) => {
    // Lógica para guardar el documento en PostgreSQL
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

        res.status(201).json({ message: 'Documento añadido correctamente', fileUrl });
    } catch (error) {
        console.error('Error adding document:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Controlador para obtener (descargar) un documento
exports.downloadDocument = async (req, res) => {
    const { documentUrl } = req.body;
    try {
        const documentData = await downloadDocumentFromS3(documentUrl);

        // Registra la descarga en la base de datos
        await db.query('UPDATE Documentos SET Descargas = Descargas + 1, FechaDescarga = CURRENT_TIMESTAMP WHERE URL = $1', [documentUrl]);

        // Establece los encabezados de respuesta y envía el documento
        res.setHeader('Content-Disposition', `attachment; filename="${documentUrl.split('/').pop()}"`);
        res.setHeader('Content-Type', documentData.contentType);
        res.send(documentData.data);
        console.log('Descarga exitosa');
    } catch (error) {
        console.error('Error al obtener el documento:', error);
        if (error.message === 'Archivo no encontrado') {
            res.status(404).json({ message: error.message });
        } else {
            res.status(500).json({ message: 'Error del servidor' });
        }
    }
};


// Controlador para obtener la lista de documentos con búsqueda avanzada
exports.getDocumentList = async (req, res) => {
    try {
        // Parámetros de búsqueda (pueden venir de req.query)
        const { titulo, descripcion, usuarioId, tipoDocumentoId, fechaInicio, fechaFin } = req.query;

        // Construir la consulta SQL basada en los parámetros de búsqueda proporcionados
        let query = 'SELECT * FROM Documentos WHERE 1=1'; // 1=1 es simplemente para iniciar la cadena SQL

        const values = [];

        // Agregar condiciones a la consulta SQL según los parámetros de búsqueda proporcionados
        if (titulo) {
            query += ' AND Titulo ILIKE $1'; // ILIKE para búsqueda insensible a mayúsculas/minúsculas
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

        // Ejecutar la consulta SQL con los valores proporcionados
        const result = await db.query(query, values);

        res.status(200).json(result);
    } catch (error) {
        console.error('Error obteniendo la lista de documentos:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};


// Controlador para eliminar un documento
exports.deleteDocument = async (req, res) => {
    const { documentUrl } = req.body; // Acceder a la URL del documento desde el cuerpo de la solicitud

    try {
        console.log('Documento a eliminar:', documentUrl);
        // Elimina el documento de Amazon S3
        await deleteDocumentFromS3(documentUrl);

        // Elimina la entrada correspondiente en la base de datos
        const deleteQuery = `
            DELETE FROM Documentos
            WHERE URL = $1;
        `;
        await db.query(deleteQuery, [documentUrl]);

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
        // Consulta para obtener el documento por su ID
        const query = `
            SELECT * 
            FROM Documentos 
            WHERE DocumentoID = $1;
        `;

        const result = await db.query(query, [documentId]);

        if (!result || result.length === 0) {
            return res.status(404).json({ message: 'Documento no encontrado' });
        }

        const documento = result;

        // Consulta para obtener las versiones anteriores relacionadas
        const versionsQuery = `
            SELECT versiondocumentoid, documentoid, url_s3, fechacreacion
            FROM VersionesDocumentos
            WHERE documentoid = $1;
        `;

        const versionsResult = await db.query(versionsQuery, [documentId]);
        let versionesAnteriores = []; // Inicializamos como un array vacío

        if (versionsResult && versionsResult.length > 0) {
            versionesAnteriores = versionsResult;
        }

        res.status(200).json({ documento, versionesAnteriores });
    } catch (error) {
        console.error('Error al obtener el documento por ID:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};

// Controlador para actualizar un documento
exports.updateDocument = async (req, res) => {
    const { documentId } = req.params;

    try {
        // Lógica para actualizar el documento en PostgreSQL y subir la nueva versión a S3
        const { titulo, descripcion, usuarioId, tipoDocumentoId } = req.body;
        const { originalname, buffer } = req.file;

        // Subir el documento actualizado a Amazon S3 y obtener la URL
        const updatedFileUrl = await uploadDocumentToS3(originalname, buffer);

        // Guardar la URL del documento actualizado en PostgreSQL
        const updateQuery = `
            UPDATE Documentos 
            SET Titulo = $1, Descripcion = $2, URL = $3, FechaModificacion = NOW(), UsuarioID = $4, TipoDocumentoID = $5
            WHERE DocumentoID = $6
            RETURNING *;
        `;

        const updateValues = [titulo, descripcion, updatedFileUrl, usuarioId, tipoDocumentoId, documentId];
        const updatedResult = await db.query(updateQuery, updateValues);

        // Insertar el documento anterior como una versión anterior
        const insertVersionQuery = `
            INSERT INTO VersionesAnteriores (VersionDocumentoID, DocumentoID, URL_S3, FechaCreacion)
            VALUES ($1, $2, $3, $4);
        `;

        const insertVersionValues = [updatedResult.DocumentoID, documentId, updatedResult.URL];
        await db.query(insertVersionQuery, insertVersionValues);

        res.status(200).json({ message: 'Documento actualizado correctamente', updatedFileUrl });
    } catch (error) {
        console.error('Error al actualizar el documento:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};
