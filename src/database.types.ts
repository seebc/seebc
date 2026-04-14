export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: \"14.4\"
  }
  public: {
    Tables: {
      casillas: {
        Row: {
          casilla: string | null
          casilla_id: number
          df: number | null
          dl: number | null
          municipio: number | null
        }
        Insert: {
          casilla?: string | null
          casilla_id: number
          df?: number | null
          dl?: number | null
          municipio?: number | null
        }
        Update: {
          casilla?: string | null
          casilla_id?: number
          df?: number | null
          dl?: number | null
          municipio?: number | null
        }
        Relationships: [
          {
            foreignKeyName: \"casillas_df_fkey\"
            columns: [\"df\"]
            isOneToOne: false
            referencedRelation: \"df\"
            referencedColumns: [\"id\"]
          },
          {
            foreignKeyName: \"casillas_dl_fkey\"
            columns: [\"dl\"]
            isOneToOne: false
            referencedRelation: \"dl\"
            referencedColumns: [\"id\"]
          },
          {
            foreignKeyName: \"casillas_municipio_fkey\"
            columns: [\"municipio\"]
            isOneToOne: false
            referencedRelation: \"municipios\"
            referencedColumns: [\"id\"]
          },
        ]
      }
      df: {
        Row: {
          df: number
          id: number
          municipio_id: number | null
        }
        Insert: {
          df: number
          id?: number
          municipio_id?: number | null
        }
        Update: {
          df?: number
          id?: number
          municipio_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: \"fk_df_municipio\"
            columns: [\"municipio_id\"]
            isOneToOne: false
            referencedRelation: \"municipios\"
            referencedColumns: [\"id\"]
          },
        ]
      }
      dl: {
        Row: {
          dl: number
          id: number
          municipio_id: number | null
        }
        Insert: {
          dl: number
          id?: number
          municipio_id?: number | null
        }
        Update: {
          dl?: number
          id?: number
          municipio_id?: number | null
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
          apellido_paterno: string
          autoriza_propaganda: boolean
          calle: string | null
          casilla_id: number | null
          cic: string | null
          clave_elector: string
          codigo_postal: string | null
          colonia: string | null
          correo_electronico: string | null
          credencial_vigente: boolean
          df_id: number
          dl_id: number
          es_militante: boolean
          firma_capturada: boolean
          id: number
          nombre: string
          num_ext: string | null
          num_int: string | null
          numero_credencial: string
          seccion_id: number
          telefono: string | null
          tipo_nombramiento: Database[\"public\"][\"Enums\"][\"tipo_nombramiento\"]
          tipo_propaganda: Database[\"public\"][\"Enums\"][\"tipo_propaganda\"] | null
        }
        Insert: {
          apellido_materno?: string | null
          apellido_paterno: string
          autoriza_propaganda?: boolean
          calle?: string | null
          casilla_id?: number | null
          cic?: string | null
          clave_elector?: string
          codigo_postal?: string | null
          colonia?: string | null
          correo_electronico?: string | null
          credencial_vigente?: boolean
          df_id: number
          dl_id: number
          es_militante?: boolean
          firma_capturada?: boolean
          id?: number
          nombre: string
          num_ext?: string | null
          num_int?: string | null
          numero_credencial?: string
          seccion_id: number
          telefono?: string | null
          tipo_nombramiento: Database[\"public\"][\"Enums\"][\"tipo_nombramiento\"]
          tipo_propaganda?:
            | Database[\"public\"][\"Enums\"][\"tipo_propaganda\"]
            | null
        }
        Update: {
          apellido_materno?: string | null
          apellido_paterno?: string
          autoriza_propaganda?: boolean
          calle?: string | null
          casilla_id?: number | null
          cic?: string | null
          clave_elector?: string
          codigo_postal?: string | null
          colonia?: string | null
          correo_electronico?: string | null
          credencial_vigente?: boolean
          df_id?: number
          dl_id?: number
          es_militante?: boolean
          firma_capturada?: boolean
          id?: number
          nombre?: string
          num_ext?: string | null
          num_int?: string | null
          numero_credencial?: string
          seccion_id?: number
          telefono?: string | null
          tipo_nombramiento?: Database[\"public\"][\"Enums\"][\"tipo_nombramiento\"]
          tipo_propaganda?:
            | Database[\"public\"][\"Enums\"][\"tipo_propaganda\"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: \"fk_rc_fed\"
            columns: [\"df_id\"]
            isOneToOne: false
            referencedRelation: \"df\"
            referencedColumns: [\"id\"]
          },
          {
            foreignKeyName: \"fk_rc_loc\"
            columns: [\"dl_id\"]
            isOneToOne: false
            referencedRelation: \"dl\"
            referencedColumns: [\"id\"]
          },
        ]
      }
      rg: {
        Row: {
          apellido_materno: string | null
          apellido_paterno: string
          autoriza_propaganda: boolean
          calle: string | null
          cic: string | null
          clave_elector: string
          codigo_postal: string | null
          colonia: string | null
          correo_electronico: string | null
          credencial_vigente: boolean
          df_id: number
          dl_id: number
          es_militante: boolean
          firma_capturada: boolean
          id: number
          nombre: string
          num_ext: string | null
          num_int: string | null
          numero_credencial: string
          seccion_id: number
          telefono: string | null
          tipo_propaganda: Database[\"public\"][\"Enums\"][\"tipo_propaganda\"] | null
        }
        Insert: {
          apellido_materno?: string | null
          apellido_paterno: string
          autoriza_propaganda?: boolean
          calle?: string | null
          cic?: string | null
          clave_elector?: string
          codigo_postal?: string | null
          colonia?: string | null
          correo_electronico?: string | null
          credencial_vigente?: boolean
          df_id: number
          dl_id: number
          es_militante?: boolean
          firma_capturada?: boolean
          id?: number
          nombre: string
          num_ext?: string | null
          num_int?: string | null
          numero_credencial?: string
          seccion_id: number
          telefono?: string | null
          tipo_propaganda?:
            | Database[\"public\"][\"Enums\"][\"tipo_propaganda\"]
            | null
        }
        Update: {
          apellido_materno?: string | null
          apellido_paterno?: string
          autoriza_propaganda?: boolean
          calle?: string | null
          cic?: string | null
          clave_elector?: string
          codigo_postal?: string | null
          colonia?: string | null
          correo_electronico?: string | null
          credencial_vigente?: boolean
          df_id?: number
          dl_id?: number
          es_militante?: boolean
          firma_capturada?: boolean
          id?: number
          nombre?: string
          num_ext?: string | null
          num_int?: string | null
          numero_credencial?: string
          seccion_id?: number
          telefono?: string | null
          tipo_propaganda?:
            | Database[\"public\"][\"Enums\"][\"tipo_propaganda\"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: \"fk_rg_fed\"
            columns: [\"df_id\"]
            isOneToOne: false
            referencedRelation: \"df\"
            referencedColumns: [\"id\"]
          },
          {
            foreignKeyName: \"fk_rg_loc\"
            columns: [\"dl_id\"]
            isOneToOne: false
            referencedRelation: \"dl\"
            referencedColumns: [\"id\"]
          },
        ]
      }
      rutas: {
        Row: {
          df_id: number | null
          dl_id: number
          id: number
          nombre_ruta: string
          representante_general_id: number | null
          casillas_asignada: Json
          municipio_id: number | null
        }
        Insert: {
          df_id?: number | null
          dl_id: number
          id?: number
          nombre_ruta: string
          representante_general_id?: number | null
          casillas_asignada: Json
          municipio_id?: number | null
        }
        Update: {
          df_id?: number | null
          dl_id?: number
          id?: number
          nombre_ruta?: string
          representante_general_id?: number | null
          casillas_asignada: Json
          municipio_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: \"fk_distrito_local\"
            columns: [\"dl_id\"]
            isOneToOne: false
            referencedRelation: \"dl\"
            referencedColumns: [\"id\"]
          },
          {
            foreignKeyName: \"rutas_representante_general_id_fkey\"
            columns: [\"representante_general_id\"]
            isOneToOne: false
            referencedRelation: \"rg\"
            referencedColumns: [\"id\"]
          },
        ]
      }
      secciones: {
        Row: {
          df_id: number | null
          dl_id: number | null
          id: number
          municipio_id: number | null
        }
        Insert: {
          df_id?: number | null
          dl_id?: number | null
          id: number
          municipio_id?: number | null
        }
        Update: {
          df_id?: number | null
          dl_id?: number | null
          id?: number
          municipio_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: \"fk_secciones_df\"
            columns: [\"df_id\"]
            isOneToOne: false
            referencedRelation: \"df\"
            referencedColumns: [\"id\"]
          },
          {
            foreignKeyName: \"fk_secciones_dl\"
            columns: [\"dl_id\"]
            isOneToOne: false
            referencedRelation: \"dl\"
            referencedColumns: [\"id\"]
          },
          {
            foreignKeyName: \"fk_secciones_municipio\"
            columns: [\"municipio_id\"]
            isOneToOne: false
            referencedRelation: \"municipios\"
            referencedColumns: [\"id\"]
          },
        ]
      }
      usuarios: {
        Row: {
          contrasena: string | null
          correo: string | null
          id: number
          municipio: number | null
          usuario: string | null
        }
        Insert: {
          contrasena?: string | null
          correo?: string | null
          id?: number
          municipio?: number | null
          usuario?: string | null
        }
        Update: {
          contrasena?: string | null
          correo?: string | null
          id?: number
          municipio?: number | null
          usuario?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      tipo_casilla:
        | \"B\"
        | \"C1\"
        | \"C2\"
        | \"C3\"
        | \"C4\"
        | \"C5\"
        | \"C6\"
        | \"C7\"
        | \"C8\"
        | \"C9\"
        | \"C11\"
        | \"C12\"
        | \"C13\"
        | \"C14\"
        | \"C15\"
        | \"E1\"
        | \"E2\"
        | \"E3\"
        | \"E1C1\"
        | \"E1C2\"
        | \"E1C3\"
        | \"E1C4\"
        | \"E2C1\"
        | \"E2C2\"
        | \"E2C3\"
        | \"E2C4\"
        | \"E3C1\"
        | \"E3C2\"
        | \"S1\"
        | \"S2\"
        | \"S3\"
      tipo_nombramiento: \"Propietario\" | \"Suplente\"
      tipo_propaganda: \"Lona\" | \"Pinta de Barda\" | \"Otro\" | \"Ninguno\"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, \"__InternalSupabase\">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, \"public\">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema[\"Tables\"] & DefaultSchema[\"Views\"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions[\"schema\"]][\"Tables\"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions[\"schema\"]][\"Views\"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions[\"schema\"]][\"Tables\"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions[\"schema\"]][\"Views\"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema[\"Tables\"] &
        DefaultSchema[\"Views\"])
    ? (DefaultSchema[\"Tables\"] &
        DefaultSchema[\"Views\"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema[\"Tables\"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions[\"schema\"]][\"Tables\"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions[\"schema\"]][\"Tables\"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema[\"Tables\"]
    ? DefaultSchema[\"Tables\"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema[\"Tables\"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions[\"schema\"]][\"Tables\"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions[\"schema\"]][\"Tables\"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema[\"Tables\"]
    ? DefaultSchema[\"Tables\"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema[\"Enums\"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions[\"schema\"]][\"Enums\"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions[\"schema\"]][\"Enums\"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema[\"Enums\"]
    ? DefaultSchema[\"Enums\"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema[\"CompositeTypes\"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions[\"schema\"]][\"CompositeTypes\"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions[\"schema\"]][\"CompositeTypes\"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema[\"CompositeTypes\"]
    ? DefaultSchema[\"CompositeTypes\"][PublicCompositeTypeNameOrOptions]
    : never
