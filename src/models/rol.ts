export class Rol {
    id?: number;
    nombre: string;
    descripcion: string;
  
    constructor(id?: number, nombre?: string, descripcion?: string) {
        this.id = id ?? 0;
        this.nombre = nombre ?? ''; // Asignar una cadena vacía como valor por defecto
        this.descripcion = descripcion ?? ''; // Asignar una cadena vacía como valor por defecto
      }
      
  }
  