export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      casillas: {
        Row: {
          casilla: string | null
          casilla_id: string
          distrito_local: number | null
          id: number
          municipio: number | null
          rg_id: number | null
          seccion: number | null
          tipo_casilla: string | null
        }
        Insert: {
          casilla?: string | null
          casilla_id: string
          distrito_local?: number | null
          id?: number
          municipio?: number | null
          rg_id?: number | null
          seccion?: number | null
          tipo_casilla?: string | null
        }
        Update: {
          casilla?: string | null
          casilla_id?: string
          distrito_local?: number | null
          id?: number
          municipio?: number | null
          rg_id?: number | null
          seccion?: number | null
          tipo_casilla?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "casillas_municipio_fkey"
            columns: ["municipio"]
            isOneToOne: false
            referencedRelation: "municipios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "casillas_rg_id_fkey"
            columns: ["rg_id"]
            isOneToOne: false
            referencedRelation: "representantes_generales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "casillas_seccion_fkey"
            columns: ["seccion"]
            isOneToOne: false
            referencedRelation: "secciones"
            referencedColumns: ["id"]
          }
        ]
      }
      df: {
        Row: {
          cabecera: string | null
          df: number | null
          id: number
        }
        Insert: {
          cabecera?: string | null
          df?: number | null
          id?: number
        }
        Update: {
          cabecera?: string | null
          df?: number | null
          id?: number
        }
        Relationships: []
      }
      dl: {
        Row: {
          cabecera: string | null
          dl: number | null
          id: number
        }
        Insert: {
          cabecera?: string | null
          dl?: number | null
          id?: number
        }
        Update: {
          cabecera?: string | null
          dl?: number | null
          id?: number
        }
        Relationships: []
      }
      municipios: {
        Row: {
          id: number
          municipio: string | null
        }
        Insert: {
          id?: number
          municipio?: string | null
        }
        Update: {
          id?: number
          municipio?: string | null
        }
        Relationships: []
      }
      rc: {
        Row: {
          apellido_materno: string | null
          apellido_paterno: string | null
          casilla_id: string | null
          clave_elector: string | null
          id: number
          nombre: string | null
          rg_id: number | null
        }
        Insert: {
          apellido_materno?: string | null
          apellido_paterno?: string | null
          casilla_id?: string | null
          clave_elector?: string | null
          id?: number
          nombre?: string | null
          rg_id?: number | null
        }
        Update: {
          apellido_materno?: string | null
          apellido_paterno?: string | null
          casilla_id?: string | null
          clave_elector?: string | null
          id?: number
          nombre?: string | null
          rg_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rc_casilla_id_fkey"
            columns: ["casilla_id"]
            isOneToOne: false
            referencedRelation: "casillas"
            referencedColumns: ["casilla_id"]
          },
          {
            foreignKeyName: "rc_rg_id_fkey"
            columns: ["rg_id"]
            isOneToOne: false
            referencedRelation: "representantes_generales"
            referencedColumns: ["id"]
          }
        ]
      }
      representantes_casilla: {
        Row: {
          apellido_materno: string | null
          apellido_paterno: string
          autoriza_propaganda: boolean | null
          calle: string | null
          casilla_id: string | null
          cic: string | null
          clave_elector: string
          codigo_postal: string | null
          colonia: string | null
          correo_electronico: string | null
          created_at: string
          credencial_vigente: boolean | null
          df_id: number | null
          dl_id: number | null
          es_militante: boolean | null
          firma_capturada: boolean | null
          id: number
          municipio_id: number | null
          nombre: string
          num_ext: string | null
          num_int: string | null
          numero_credencial: string | null
          rg_id: number | null
          seccion_id: number | null
          telefono: string | null
          tipo_nombramiento: Database["public"]["Enums"]["tipo_nombramiento"]
          tipo_propaganda: Database["public"]["Enums"]["tipo_propaganda"] | null
        }
        Insert: {
          apellido_materno?: string | null
          apellido_paterno: string
          autoriza_propaganda?: boolean | null
          calle?: string | null
          casilla_id?: string | null
          cic?: string | null
          clave_elector: string
          codigo_postal?: string | null
          colonia?: string | null
          correo_electronico?: string | null
          created_at?: string
          credencial_vigente?: boolean | null
          df_id?: number | null
          dl_id?: number | null
          es_militante?: boolean | null
          firma_capturada?: boolean | null
          id?: number
          municipio_id?: number | null
          nombre: string
          num_ext?: string | null
          num_int?: string | null
          numero_credencial?: string | null
          rg_id?: number | null
          seccion_id?: number | null
          telefono?: string | null
          tipo_nombramiento?: Database["public"]["Enums"]["tipo_nombramiento"]
          tipo_propaganda?: Database["public"]["Enums"]["tipo_propaganda"] | null
        }
        Update: {
          apellido_materno?: string | null
          apellido_paterno?: string
          autoriza_propaganda?: boolean | null
          calle?: string | null
          casilla_id?: string | null
          cic?: string | null
          clave_elector?: string
          codigo_postal?: string | null
          colonia?: string | null
          correo_electronico?: string | null
          created_at?: string
          credencial_vigente?: boolean | null
          df_id?: number | null
          dl_id?: number | null
          es_militante?: boolean | null
          firma_capturada?: boolean | null
          id?: number
          municipio_id?: number | null
          nombre?: string
          num_ext?: string | null
          num_int?: string | null
          numero_credencial?: string | null
          rg_id?: number | null
          seccion_id?: number | null
          telefono?: string | null
          tipo_nombramiento?: Database["public"]["Enums"]["tipo_nombramiento"]
          tipo_propaganda?: Database["public"]["Enums"]["tipo_propaganda"] | null
        }
        Relationships: [
          {
            foreignKeyName: "representantes_casilla_casilla_id_fkey"
            columns: ["casilla_id"]
            isOneToOne: false
            referencedRelation: "casillas"
            referencedColumns: ["casilla_id"]
          },
          {
            foreignKeyName: "representantes_casilla_df_id_fkey"
            columns: ["df_id"]
            isOneToOne: false
            referencedRelation: "df"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "representantes_casilla_dl_id_fkey"
            columns: ["dl_id"]
            isOneToOne: false
            referencedRelation: "dl"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "representantes_casilla_municipio_id_fkey"
            columns: ["municipio_id"]
            isOneToOne: false
            referencedRelation: "municipios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "representantes_casilla_rg_id_fkey"
            columns: ["rg_id"]
            isOneToOne: false
            referencedRelation: "representantes_generales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "representantes_casilla_seccion_id_fkey"
            columns: ["seccion_id"]
            isOneToOne: false
            referencedRelation: "secciones"
            referencedColumns: ["id"]
          }
        ]
      }
      representantes_generales: {
        Row: {
          apellido_materno: string | null
          apellido_paterno: string
          autoriza_propaganda: boolean | null
          calle: string | null
          cic: string | null
          clave_elector: string
          codigo_postal: string | null
          colonia: string | null
          correo_electronico: string | null
          created_at: string
          credencial_vigente: boolean | null
          df_id: number | null
          dl_id: number | null
          es_militante: boolean | null
          firma_capturada: boolean | null
          id: number
          municipio_id: number | null
          nombre: string
          num_ext: string | null
          num_int: string | null
          numero_credencial: string | null
          seccion_id: number | null
          telefono: string | null
          tipo_propaganda: Database["public"]["Enums"]["tipo_propaganda"] | null
        }
        Insert: {
          apellido_materno?: string | null
          apellido_paterno: string
          autoriza_propaganda?: boolean | null
          calle?: string | null
          cic?: string | null
          clave_elector: string
          codigo_postal?: string | null
          colonia?: string | null
          correo_electronico?: string | null
          created_at?: string
          credencial_vigente?: boolean | null
          df_id?: number | null
          dl_id?: number | null
          es_militante?: boolean | null
          firma_capturada?: boolean | null
          id?: number
          municipio_id?: number | null
          nombre: string
          num_ext?: string | null
          num_int?: string | null
          numero_credencial?: string | null
          seccion_id?: number | null
          telefono?: string | null
          tipo_propaganda?: Database["public"]["Enums"]["tipo_propaganda"] | null
        }
        Update: {
          apellido_materno?: string | null
          apellido_paterno?: string
          autoriza_propaganda?: boolean | null
          calle?: string | null
          cic?: string | null
          clave_elector?: string
          codigo_postal?: string | null
          colonia?: string | null
          correo_electronico?: string | null
          created_at?: string
          credencial_vigente?: boolean | null
          df_id?: number | null
          dl_id?: number | null
          es_militante?: boolean | null
          firma_capturada?: boolean | null
          id?: number
          municipio_id?: number | null
          nombre?: string
          num_ext?: string | null
          num_int?: string | null
          numero_credencial?: string | null
          seccion_id?: number | null
          telefono?: string | null
          tipo_propaganda?: Database["public"]["Enums"]["tipo_propaganda"] | null
        }
        Relationships: [
          {
            foreignKeyName: "representantes_generales_df_id_fkey"
            columns: ["df_id"]
            isOneToOne: false
            referencedRelation: "df"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "representantes_generales_dl_id_fkey"
            columns: ["dl_id"]
            isOneToOne: false
            referencedRelation: "dl"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "representantes_generales_municipio_id_fkey"
            columns: ["municipio_id"]
            isOneToOne: false
            referencedRelation: "municipios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "representantes_generales_seccion_id_fkey"
            columns: ["seccion_id"]
            isOneToOne: false
            referencedRelation: "secciones"
            referencedColumns: ["id"]
          }
        ]
      }
      rg: {
        Row: {
          apellido_materno: string | null
          apellido_paterno: string | null
          clave_elector: string | null
          id: number
          nombre: string | null
        }
        Insert: {
          apellido_materno?: string | null
          apellido_paterno?: string | null
          clave_elector?: string | null
          id?: number
          nombre?: string | null
        }
        Update: {
          apellido_materno?: string | null
          apellido_paterno?: string | null
          clave_elector?: string | null
          id?: number
          nombre?: string | null
        }
        Relationships: []
      }
      rutas: {
        Row: {
          created_at: string
          df_id: number | null
          dl_id: number | null
          id: number
          nombre_ruta: string
          representante_general_id: number | null
          secciones_asignadas: string[] | null
        }
        Insert: {
          created_at?: string
          df_id?: number | null
          dl_id?: number | null
          id?: number
          nombre_ruta: string
          representante_general_id?: number | null
          secciones_asignadas?: string[] | null
        }
        Update: {
          created_at?: string
          df_id?: number | null
          dl_id?: number | null
          id?: number
          nombre_ruta?: string
          representante_general_id?: number | null
          secciones_asignadas?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "rutas_df_id_fkey"
            columns: ["df_id"]
            isOneToOne: false
            referencedRelation: "df"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rutas_dl_id_fkey"
            columns: ["dl_id"]
            isOneToOne: false
            referencedRelation: "dl"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rutas_representante_general_id_fkey"
            columns: ["representante_general_id"]
            isOneToOne: false
            referencedRelation: "representantes_generales"
            referencedColumns: ["id"]
          }
        ]
      }
      secciones: {
        Row: {
          id: number
          municipio_id: number | null
        }
        Insert: {
          id?: number
          municipio_id?: number | null
        }
        Update: {
          id?: number
          municipio_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "secciones_municipio_id_fkey"
            columns: ["municipio_id"]
            isOneToOne: false
            referencedRelation: "municipios"
            referencedColumns: ["id"]
          }
        ]
      }
      usuarios: {
        Row: {
          id: number
          password_hash: string
          rol: string | null
          usuario: string
        }
        Insert: {
          id?: number
          password_hash: string
          rol?: string | null
          usuario: string
        }
        Update: {
          id?: number
          password_hash?: string
          rol?: string | null
          usuario?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      verify_user_password: {
        Args: {
          p_usuario: string
          p_password: string
        }
        Returns: Json
      }
    }
    Enums: {
      tipo_nombramiento: "Propietario" | "Suplente"
      tipo_propaganda: "Ninguno" | "Lona" | "Pintura" | "Vinil"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Municipio = Database['public']['Tables']['municipios']['Row']
export type Seccion = Database['public']['Tables']['secciones']['Row']
export type DistritoFederal = Database['public']['Tables']['df']['Row']
export type DistritoLocal = Database['public']['Tables']['dl']['Row']
export type Casilla = Database['public']['Tables']['casillas']['Row']
export type RepresentanteGeneral = Database['public']['Tables']['representantes_generales']['Row']
export type RepresentanteCasilla = Database['public']['Tables']['representantes_casilla']['Row']
export type Ruta = Database['public']['Tables']['rutas']['Row']
export type UsuarioManual = Database['public']['Tables']['usuarios']['Row']
