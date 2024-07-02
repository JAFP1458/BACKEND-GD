const express = require("express");
const multer = require("multer");
const router = express.Router();
const {
  addDocument,
  downloadDocument,
  getDocuments,
  deleteDocument,
  getDocumentById,
  updateDocument,
  getDocumentTypes,
  shareDocument,
  getAuditLogs,
  getNotifications,
  deleteVersion,
} = require("../api/controllers/documentsController");



/**
 * @swagger
 * tags:
 *   name: Documentos
 *   description: Endpoints relacionados con los documentos
 */
// Ruta para iniciar sesión (pública)
/**
 * @swagger
 * /documents:
 *   post:
 *     summary: Agregar un nuevo documento.
 *     description: Permite a los operadores agregar un nuevo documento.
 *     tags: [Documentos]
 *     parameters:
 *       - in: body
 *         name: document
 *         description: Datos del documento a agregar.
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             titulo:
 *               type: string
 *             descripcion:
 *               type: string
 *             usuarioId:
 *               type: integer
 *             tipoDocumentoId:
 *               type: integer
 *     responses:
 *       '201':
 *         description: Documento agregado correctamente.
 *       '500':
 *         description: Error del servidor.
 */
/**
 * @swagger
 * /documents/{documentUrl}:
 *   get:
 *     summary: Descargar un documento.
 *     description: Permite a los visualizadores y operadores descargar un documento.
 *     tags: [Documentos]
 *     parameters:
 *       - in: path
 *         name: documentUrl
 *         description: URL del documento a descargar.
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Descarga del documento exitosa.
 *       '500':
 *         description: Error del servidor.
 */
/**
 * @swagger
 * /documents:
 *   get:
 *     summary: Obtener la lista de documentos.
 *     description: Permite a los visualizadores y operadores obtener la lista de documentos.
 *     tags: [Documentos]
 *     responses:
 *       '200':
 *         description: Lista de documentos obtenida correctamente.
 *       '500':
 *         description: Error del servidor.
 */
/**
 * @swagger
 * /documents/{documentUrl}:
 *   delete:
 *     summary: Eliminar un documento.
 *     description: Permite a los operadores eliminar un documento.
 *     tags: [Documentos]
 *     parameters:
 *       - in: path
 *         name: documentUrl
 *         description: URL del documento a eliminar.
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Documento eliminado correctamente.
 *       '500':
 *         description: Error del servidor.
 */
/**
 * @swagger
 * /documents/byId/{documentId}:
 *   get:
 *     summary: Obtener un documento por su ID.
 *     description: Permite a los visualizadores y operadores obtener un documento por su ID.
 *     tags: [Documentos]
 *     parameters:
 *       - in: path
 *         name: documentId
 *         description: ID del documento a obtener.
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Documento obtenido correctamente.
 *       '404':
 *         description: Documento no encontrado.
 *       '500':
 *         description: Error del servidor.
 */
/**
 * @swagger
 * /documents:
 *   get:
 *     summary: Obtener la lista de documentos.
 *     description: Permite a los visualizadores y operadores obtener la lista de documentos con búsqueda avanzada.
 *     tags: [Documentos]
 *     parameters:
 *       - in: query
 *         name: titulo
 *         description: Título del documento para filtrar la lista.
 *         schema:
 *           type: string
 *       - in: query
 *         name: descripcion
 *         description: Descripción del documento para filtrar la lista.
 *         schema:
 *           type: string
 *       - in: query
 *         name: usuarioId
 *         description: ID del usuario que creó el documento para filtrar la lista.
 *         schema:
 *           type: integer
 *       - in: query
 *         name: tipoDocumentoId
 *         description: ID del tipo de documento para filtrar la lista.
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Lista de documentos obtenida correctamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Documento'
 *       '500':
 *         description: Error del servidor.
 */
/**
 * @swagger
 * /documents/{documentId}:
 *   put:
 *     summary: Actualizar un documento.
 *     description: Permite a los operadores actualizar un documento.
 *     tags: [Documentos]
 *     parameters:
 *       - in: path
 *         name: documentId
 *         description: ID del documento a actualizar.
 *         required: true
 *         schema:
 *           type: integer
 *       - in: body
 *         name: document
 *         description: Datos actualizados del documento.
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             titulo:
 *               type: string
 *             descripcion:
 *               type: string
 *             usuarioId:
 *               type: integer
 *             tipoDocumentoId:
 *               type: integer
 *     responses:
 *       '200':
 *         description: Documento actualizado correctamente.
 *       '500':
 *         description: Error del servidor.
 */
/**
 * @swagger
 * /documents/share:
 *   post:
 *     summary: Compartir un documento.
 *     description: Permite a los operadores compartir un documento con otros usuarios.
 *     tags: [Documentos]
 *     parameters:
 *       - in: body
 *         name: share
 *         description: Datos del documento a compartir.
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             documentId:
 *               type: integer
 *             recipientUserId:
 *               type: integer
 *             permissions:
 *               type: string
 *     responses:
 *       '201':
 *         description: Documento compartido correctamente.
 *       '500':
 *         description: Error del servidor.
 */
/**
 * @swagger
 * /audit:
 *   get:
 *     summary: Obtener el historial de acciones.
 *     description: Permite a los operadores obtener el historial de acciones sobre los documentos.
 *     tags: [Documentos]
 *     responses:
 *       '200':
 *         description: Historial de acciones obtenido correctamente.
 *       '500':
 *         description: Error del servidor.
 */

// Importa los middlewares de autorización
const {
  authenticateToken,
  authorizeRole,
} = require("../api/middleware/authMiddleware");

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Middleware para inspeccionar req.user
const inspectUser = (req, res, next) => {
  console.log('Usuario autenticado:', req.user);
  next();
};

// Ruta para agregar un nuevo documento
router.post(
  "/",
  authenticateToken,
  authorizeRole("Operador"),
  upload.single("file"),
  addDocument
); // Los Operadores pueden agregar documentos

// Ruta para obtener (descargar) un documento
router.post(
  "/descargar",
  authenticateToken,
  authorizeRole("Operador"),
  downloadDocument
); // Tanto Visualizadores como Operadores pueden descargar documentos

// Ruta para obtener la lista de documentos
router.get("/", authenticateToken, authorizeRole("Operador"), getDocuments); // Tanto Visualizadores como Operadores pueden obtener la lista de documentos

// Ruta para eliminar un documento
router.delete(
  "/borrar",
  authenticateToken,
  authorizeRole("Operador"),
  deleteDocument
); // Solo los Operadores pueden eliminar documentos

// Ruta para obtener notificaciones con middleware de inspección
router.get(
  "/notifications",
  authenticateToken,
  inspectUser,
  authorizeRole(["Operador", "Gestor", "Visualizador"]),
  getNotifications
);


// Ruta para obtener un documento por su ID
router.get(
  "/byId/:documentId",
  authenticateToken,
  authorizeRole("Operador"),
  getDocumentById
); // Tanto Visualizadores como Operadores pueden obtener un documento por su ID

// Ruta para actualizar un documento
router.put(
  "/:documentId",
  authenticateToken,
  authorizeRole("Operador"),
  upload.single("file"),
  updateDocument
); // Solo los Operadores pueden actualizar documentos

// Ruta para compartir un documento
router.post(
  "/share",
  authenticateToken,
  inspectUser,
  authorizeRole(["Operador", "Gestor", "Visualizador"]),
  shareDocument
); // Los Operadores pueden compartir documentos

// Ruta para obtener los tipos de documentos
router.get(
  "/types",
  authenticateToken,
  authorizeRole("Operador"),
  getDocumentTypes
); // Tanto Visualizadores como Operadores pueden obtener los tipos de documentos

// Ruta para obtener el historial de acciones
router.get(
  "/audit",
  authenticateToken,
  authorizeRole("Operador"),
  getAuditLogs
); // Los Operadores pueden obtener el historial de acciones

// Ruta para eliminar una versión de documento
router.delete(
  "/versions/:versionId",
  authenticateToken,
  authorizeRole("Operador"),
  deleteVersion
); // Solo los Operadores pueden eliminar versiones de documentos

module.exports = router;
