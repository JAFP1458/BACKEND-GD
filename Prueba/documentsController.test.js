// Importa las funciones del controlador y las funciones de simulación (mocks)
const { addDocument, downloadDocument, getDocumentList, deleteDocument } = require('../src/api/controllers/documentsController');
const { uploadDocumentToS3, downloadDocumentFromS3, deleteDocumentFromS3 } = require('../src/api/services/s3Service');
const db = require('../src/config/db');

// Mock para req y res
const req = {};
const res = {
  status: jest.fn(() => res),
  json: jest.fn(),
  send: jest.fn(),
  setHeader: jest.fn()
};

// Mockea las funciones del servicio de S3 y la función de consulta de la base de datos
jest.mock('../src/api/services/s3Service', () => ({
  uploadDocumentToS3: jest.fn().mockResolvedValueOnce('https://jafpbucket.s3.us-east-2.amazonaws.com/BASE+DE+DATOS+2-28.docx'),
  downloadDocumentFromS3: jest.fn().mockResolvedValueOnce({ Body: Buffer.from('contenido del documento'), ContentType: 'BASE+DE+DATOS+2-28.docx' }),
  deleteDocumentFromS3: jest.fn(),
}));


jest.mock('../src/config/db', () => ({
  query: jest.fn().mockResolvedValueOnce({ rows: [{ id: 1, titulo: 'Documento 1' }, { id: 2, titulo: 'Documento 2' }] }),
}));





// Prueba para el controlador addDocument
describe('addDocument', () => {
  it('debería agregar un nuevo documento correctamente', async () => {
    // Simula el req.body y req.file
    req.body = { titulo: 'Documento de prueba', descripcion: 'Descripción de prueba', usuarioId: 1, tipoDocumentoId: 1 };
    req.file = { originalname: 'documento.pdf', buffer: Buffer.from('contenido del documento') };

    // Ejecuta el controlador
    await addDocument(req, res);

    // Verifica que se haya enviado la respuesta correcta
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ message: 'Documento añadido correctamente', fileUrl: 'https://jafpbucket.s3.us-east-2.amazonaws.com/BASE+DE+DATOS+2-28.docx' });
  });

  // Puedes agregar más pruebas para otros casos, como errores y casos límite
});

// Prueba para el controlador downloadDocument
describe('downloadDocument', () => {
  it('debería descargar un documento correctamente', async () => {
    // Simula el req.params
    req.params = { documentUrl: 'https://jafpbucket.s3.us-east-2.amazonaws.com/BASE+DE+DATOS+2-28.docx' };

    // Ejecuta el controlador
    await downloadDocument(req, res);

    // Verifica que se haya enviado la respuesta correcta
    expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="BASE+DE+DATOS+2-28.docx"');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'BASE+DE+DATOS+2-28.docx');
    expect(res.send).toHaveBeenCalledWith(Buffer.from('contenido del documento'));
  });

  // Puedes agregar más pruebas para otros casos, como errores y casos límite
});

// Prueba para el controlador getDocumentList
describe('getDocumentList', () => {
  it('debería obtener la lista de documentos correctamente', async () => {
    // Ejecuta el controlador
    await getDocumentList(req, res);

    //console.log('Respuesta del controlador:', res.status.mock.calls); // Agrega este registro de depuración

    // Verifica que se haya enviado la respuesta correcta
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([{ id: 1, titulo: 'Documento 1' }, { id: 2, titulo: 'Documento 2' }]);
  });

  // Puedes agregar más pruebas para otros casos, como errores y casos límite
});

// Prueba para el controlador deleteDocument
describe('deleteDocument', () => {
  it('debería eliminar un documento correctamente', async () => {
    // Simula el req.params
    req.params = { documentUrl: 'https://jafpbucket.s3.us-east-2.amazonaws.com/BASE+DE+DATOS+2-28.docx' };

    // Ejecuta el controlador
    await deleteDocument(req, res);

    // Verifica que se haya enviado la respuesta correcta
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Documento eliminado correctamente' });
  });

  // Puedes agregar más pruebas para otros casos, como errores y casos límite
});
