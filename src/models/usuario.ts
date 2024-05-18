import { Rol } from './rol'; // Importar la clase Rol

export class Usuario {
  id?: number;
  nombre: string;
  correoElectronico: string;
  contrasena: string;
  rol: Rol;

  constructor(nombre?: string, correoElectronico?: string, contrasena?: string, rol?: Rol) {
    this.nombre = nombre ?? ''; // Asignar una cadena vacía si es undefined
    this.correoElectronico = correoElectronico ?? ''; // Asignar una cadena vacía si es undefined
    this.contrasena = contrasena ?? ''; // Asignar una cadena vacía si es undefined
    this.rol = rol || new Rol(); // Asignar un nuevo Rol si no se proporciona
  }
}
