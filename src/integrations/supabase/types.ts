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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      assinaturas: {
        Row: {
          assinatura_url: string
          cargo: string | null
          created_at: string
          data_assinatura: string
          id: string
          nome_assinante: string
          relatorio_id: string
          tipo: string
          tipo_assinatura: string
        }
        Insert: {
          assinatura_url: string
          cargo?: string | null
          created_at?: string
          data_assinatura?: string
          id?: string
          nome_assinante: string
          relatorio_id: string
          tipo?: string
          tipo_assinatura?: string
        }
        Update: {
          assinatura_url?: string
          cargo?: string | null
          created_at?: string
          data_assinatura?: string
          id?: string
          nome_assinante?: string
          relatorio_id?: string
          tipo?: string
          tipo_assinatura?: string
        }
        Relationships: [
          {
            foreignKeyName: "assinaturas_relatorio_id_fkey"
            columns: ["relatorio_id"]
            isOneToOne: false
            referencedRelation: "relatorios"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades_obra: {
        Row: {
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          empresa_id: string | null
          id: string
          nome: string
          obra_id: string
          percentual: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          empresa_id?: string | null
          id?: string
          nome: string
          obra_id: string
          percentual?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          empresa_id?: string | null
          id?: string
          nome?: string
          obra_id?: string
          percentual?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "atividades_obra_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_obra_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          administradora: string | null
          cpf_cnpj: string | null
          created_at: string
          email: string | null
          empresa_id: string | null
          endereco: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          administradora?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          empresa_id?: string | null
          endereco?: string | null
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          administradora?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          empresa_id?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      compras_ferramentas: {
        Row: {
          anexo: string | null
          created_at: string
          empresa_id: string | null
          forma_pagamento: string | null
          id: string
          loja: string | null
          numero_nota: string | null
          obra_id: string | null
          updated_at: string
          valor: number
        }
        Insert: {
          anexo?: string | null
          created_at?: string
          empresa_id?: string | null
          forma_pagamento?: string | null
          id?: string
          loja?: string | null
          numero_nota?: string | null
          obra_id?: string | null
          updated_at?: string
          valor: number
        }
        Update: {
          anexo?: string | null
          created_at?: string
          empresa_id?: string | null
          forma_pagamento?: string | null
          id?: string
          loja?: string | null
          numero_nota?: string | null
          obra_id?: string | null
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "compras_ferramentas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_ferramentas_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      compras_materiais: {
        Row: {
          anexo: string | null
          created_at: string
          empresa_id: string | null
          forma_pagamento: string | null
          id: string
          loja: string | null
          numero_nota: string | null
          obra_id: string
          updated_at: string
          valor: number
        }
        Insert: {
          anexo?: string | null
          created_at?: string
          empresa_id?: string | null
          forma_pagamento?: string | null
          id?: string
          loja?: string | null
          numero_nota?: string | null
          obra_id: string
          updated_at?: string
          valor: number
        }
        Update: {
          anexo?: string | null
          created_at?: string
          empresa_id?: string | null
          forma_pagamento?: string | null
          id?: string
          loja?: string | null
          numero_nota?: string | null
          obra_id?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "compras_materiais_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_materiais_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_empresa: {
        Row: {
          cargo_responsavel_legal: string | null
          cnpj: string | null
          cpf_responsavel_legal: string | null
          created_at: string
          email: string | null
          empresa_id: string | null
          endereco: string | null
          id: string
          instagram: string | null
          logo_url: string | null
          nome_empresa: string
          responsavel_legal: string | null
          site: string | null
          telefone: string | null
          texto_rodape: string | null
          updated_at: string
        }
        Insert: {
          cargo_responsavel_legal?: string | null
          cnpj?: string | null
          cpf_responsavel_legal?: string | null
          created_at?: string
          email?: string | null
          empresa_id?: string | null
          endereco?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          nome_empresa?: string
          responsavel_legal?: string | null
          site?: string | null
          telefone?: string | null
          texto_rodape?: string | null
          updated_at?: string
        }
        Update: {
          cargo_responsavel_legal?: string | null
          cnpj?: string | null
          cpf_responsavel_legal?: string | null
          created_at?: string
          email?: string | null
          empresa_id?: string | null
          endereco?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          nome_empresa?: string
          responsavel_legal?: string | null
          site?: string | null
          telefone?: string | null
          texto_rodape?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      cronograma: {
        Row: {
          created_at: string
          data_fim_prevista: string | null
          data_inicio: string | null
          empresa_id: string | null
          id: string
          obra_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_fim_prevista?: string | null
          data_inicio?: string | null
          empresa_id?: string | null
          id?: string
          obra_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_fim_prevista?: string | null
          data_inicio?: string | null
          empresa_id?: string | null
          id?: string
          obra_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cronograma_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      cronograma_atividades: {
        Row: {
          created_at: string
          cronograma_id: string
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          id: string
          nome_atividade: string
          observacoes: string | null
          ordem: number
          percentual_concluido: number
          peso: number
          status: string
          tipo_atividade: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cronograma_id: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          id?: string
          nome_atividade: string
          observacoes?: string | null
          ordem?: number
          percentual_concluido?: number
          peso?: number
          status?: string
          tipo_atividade?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cronograma_id?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          id?: string
          nome_atividade?: string
          observacoes?: string | null
          ordem?: number
          percentual_concluido?: number
          peso?: number
          status?: string
          tipo_atividade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cronograma_atividades_cronograma_id_fkey"
            columns: ["cronograma_id"]
            isOneToOne: false
            referencedRelation: "cronograma"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_layouts: {
        Row: {
          created_at: string
          grid_config: Json
          id: string
          layout_name: string
          updated_at: string
          user_id: string
          widgets: Json
        }
        Insert: {
          created_at?: string
          grid_config?: Json
          id?: string
          layout_name?: string
          updated_at?: string
          user_id: string
          widgets?: Json
        }
        Update: {
          created_at?: string
          grid_config?: Json
          id?: string
          layout_name?: string
          updated_at?: string
          user_id?: string
          widgets?: Json
        }
        Relationships: []
      }
      despesas: {
        Row: {
          anexo: string | null
          created_at: string
          data: string
          data_vencimento: string | null
          descricao: string
          empresa_id: string | null
          forma_pagamento: string | null
          id: string
          manutencao_id: string | null
          obra_id: string
          tipo: string
          tipo_pagamento: string
          updated_at: string
          valor: number
        }
        Insert: {
          anexo?: string | null
          created_at?: string
          data?: string
          data_vencimento?: string | null
          descricao: string
          empresa_id?: string | null
          forma_pagamento?: string | null
          id?: string
          manutencao_id?: string | null
          obra_id: string
          tipo?: string
          tipo_pagamento?: string
          updated_at?: string
          valor: number
        }
        Update: {
          anexo?: string | null
          created_at?: string
          data?: string
          data_vencimento?: string | null
          descricao?: string
          empresa_id?: string | null
          forma_pagamento?: string | null
          id?: string
          manutencao_id?: string | null
          obra_id?: string
          tipo?: string
          tipo_pagamento?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "despesas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despesas_manutencao_id_fkey"
            columns: ["manutencao_id"]
            isOneToOne: false
            referencedRelation: "manutencao_ferramentas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despesas_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      diario_atividades: {
        Row: {
          created_at: string
          cronograma_atividade_id: string | null
          descricao: string
          diario_id: string
          id: string
          percentual: number
          status: string
        }
        Insert: {
          created_at?: string
          cronograma_atividade_id?: string | null
          descricao: string
          diario_id: string
          id?: string
          percentual?: number
          status?: string
        }
        Update: {
          created_at?: string
          cronograma_atividade_id?: string | null
          descricao?: string
          diario_id?: string
          id?: string
          percentual?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "diario_atividades_cronograma_atividade_id_fkey"
            columns: ["cronograma_atividade_id"]
            isOneToOne: false
            referencedRelation: "cronograma_atividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diario_atividades_diario_id_fkey"
            columns: ["diario_id"]
            isOneToOne: false
            referencedRelation: "diario_obra"
            referencedColumns: ["id"]
          },
        ]
      }
      diario_equipe: {
        Row: {
          created_at: string
          diario_id: string
          funcao: string | null
          horas_trabalhadas: number | null
          id: string
          nome_funcionario: string
        }
        Insert: {
          created_at?: string
          diario_id: string
          funcao?: string | null
          horas_trabalhadas?: number | null
          id?: string
          nome_funcionario: string
        }
        Update: {
          created_at?: string
          diario_id?: string
          funcao?: string | null
          horas_trabalhadas?: number | null
          id?: string
          nome_funcionario?: string
        }
        Relationships: [
          {
            foreignKeyName: "diario_equipe_diario_id_fkey"
            columns: ["diario_id"]
            isOneToOne: false
            referencedRelation: "diario_obra"
            referencedColumns: ["id"]
          },
        ]
      }
      diario_imagens: {
        Row: {
          created_at: string
          descricao: string | null
          diario_id: string
          id: string
          url: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          diario_id: string
          id?: string
          url: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          diario_id?: string
          id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "diario_imagens_diario_id_fkey"
            columns: ["diario_id"]
            isOneToOne: false
            referencedRelation: "diario_obra"
            referencedColumns: ["id"]
          },
        ]
      }
      diario_materiais: {
        Row: {
          created_at: string
          diario_id: string
          id: string
          material: string
          quantidade: number | null
          unidade: string | null
        }
        Insert: {
          created_at?: string
          diario_id: string
          id?: string
          material: string
          quantidade?: number | null
          unidade?: string | null
        }
        Update: {
          created_at?: string
          diario_id?: string
          id?: string
          material?: string
          quantidade?: number | null
          unidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diario_materiais_diario_id_fkey"
            columns: ["diario_id"]
            isOneToOne: false
            referencedRelation: "diario_obra"
            referencedColumns: ["id"]
          },
        ]
      }
      diario_obra: {
        Row: {
          clima: string
          created_at: string
          data: string
          empresa_id: string | null
          horario_fim: string | null
          horario_inicio: string | null
          id: string
          obra_id: string
          observacoes_gerais: string | null
          relatorio_id: string | null
          temperatura: string | null
          updated_at: string
        }
        Insert: {
          clima?: string
          created_at?: string
          data?: string
          empresa_id?: string | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          obra_id: string
          observacoes_gerais?: string | null
          relatorio_id?: string | null
          temperatura?: string | null
          updated_at?: string
        }
        Update: {
          clima?: string
          created_at?: string
          data?: string
          empresa_id?: string | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          obra_id?: string
          observacoes_gerais?: string | null
          relatorio_id?: string | null
          temperatura?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "diario_obra_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diario_obra_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diario_obra_relatorio_id_fkey"
            columns: ["relatorio_id"]
            isOneToOne: false
            referencedRelation: "relatorios"
            referencedColumns: ["id"]
          },
        ]
      }
      diario_ocorrencias: {
        Row: {
          created_at: string
          descricao: string
          diario_id: string
          id: string
          impacto: string
        }
        Insert: {
          created_at?: string
          descricao: string
          diario_id: string
          id?: string
          impacto?: string
        }
        Update: {
          created_at?: string
          descricao?: string
          diario_id?: string
          id?: string
          impacto?: string
        }
        Relationships: [
          {
            foreignKeyName: "diario_ocorrencias_diario_id_fkey"
            columns: ["diario_id"]
            isOneToOne: false
            referencedRelation: "diario_obra"
            referencedColumns: ["id"]
          },
        ]
      }
      diario_paralisacoes: {
        Row: {
          created_at: string
          data_fim: string | null
          data_inicio: string
          diario_id: string
          id: string
          motivo: string
          total_dias: number | null
        }
        Insert: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          diario_id: string
          id?: string
          motivo: string
          total_dias?: number | null
        }
        Update: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          diario_id?: string
          id?: string
          motivo?: string
          total_dias?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "diario_paralisacoes_diario_id_fkey"
            columns: ["diario_id"]
            isOneToOne: false
            referencedRelation: "diario_obra"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_arquivos: {
        Row: {
          created_at: string
          id: string
          nome_arquivo: string
          pasta_id: string
          tamanho: number | null
          tipo: string
          url_arquivo: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome_arquivo: string
          pasta_id: string
          tamanho?: number | null
          tipo?: string
          url_arquivo: string
        }
        Update: {
          created_at?: string
          id?: string
          nome_arquivo?: string
          pasta_id?: string
          tamanho?: number | null
          tipo?: string
          url_arquivo?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_arquivos_pasta_id_fkey"
            columns: ["pasta_id"]
            isOneToOne: false
            referencedRelation: "documentos_pastas"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_pastas: {
        Row: {
          created_at: string
          empresa_id: string | null
          id: string
          nome_pasta: string
          obra_id: string
        }
        Insert: {
          created_at?: string
          empresa_id?: string | null
          id?: string
          nome_pasta: string
          obra_id: string
        }
        Update: {
          created_at?: string
          empresa_id?: string | null
          id?: string
          nome_pasta?: string
          obra_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_pastas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_pastas_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          cnpj: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          plano: string
          status: string
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          plano?: string
          status?: string
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          plano?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      ferramentas: {
        Row: {
          created_at: string
          empresa_id: string | null
          id: string
          nome: string
          numero_cadastro: string
          obra_id: string | null
          status: string
          tipo: string
          ultima_manutencao: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          empresa_id?: string | null
          id?: string
          nome: string
          numero_cadastro: string
          obra_id?: string | null
          status?: string
          tipo?: string
          ultima_manutencao?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          empresa_id?: string | null
          id?: string
          nome?: string
          numero_cadastro?: string
          obra_id?: string | null
          status?: string
          tipo?: string
          ultima_manutencao?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ferramentas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferramentas_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      ferramentas_historico: {
        Row: {
          created_at: string
          descricao: string
          empresa_id: string | null
          ferramenta_id: string
          id: string
          obra_id: string | null
          tipo_evento: string
        }
        Insert: {
          created_at?: string
          descricao: string
          empresa_id?: string | null
          ferramenta_id: string
          id?: string
          obra_id?: string | null
          tipo_evento?: string
        }
        Update: {
          created_at?: string
          descricao?: string
          empresa_id?: string | null
          ferramenta_id?: string
          id?: string
          obra_id?: string | null
          tipo_evento?: string
        }
        Relationships: [
          {
            foreignKeyName: "ferramentas_historico_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferramentas_historico_ferramenta_id_fkey"
            columns: ["ferramenta_id"]
            isOneToOne: false
            referencedRelation: "ferramentas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferramentas_historico_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_anexos: {
        Row: {
          created_at: string
          empresa_id: string | null
          id: string
          nome_arquivo: string
          registro_id: string
          tipo_anexo: string
          tipo_registro: string
          url_arquivo: string
        }
        Insert: {
          created_at?: string
          empresa_id?: string | null
          id?: string
          nome_arquivo: string
          registro_id: string
          tipo_anexo?: string
          tipo_registro?: string
          url_arquivo: string
        }
        Update: {
          created_at?: string
          empresa_id?: string | null
          id?: string
          nome_arquivo?: string
          registro_id?: string
          tipo_anexo?: string
          tipo_registro?: string
          url_arquivo?: string
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_anexos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_tokens: {
        Row: {
          access_token: string
          created_at: string
          google_email: string | null
          id: string
          refresh_token: string
          scope: string | null
          token_expires_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          google_email?: string | null
          id?: string
          refresh_token: string
          scope?: string | null
          token_expires_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          google_email?: string | null
          id?: string
          refresh_token?: string
          scope?: string | null
          token_expires_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      imagens: {
        Row: {
          created_at: string
          descricao: string | null
          empresa_id: string | null
          id: string
          obra_id: string
          tipo: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          obra_id: string
          tipo?: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          obra_id?: string
          tipo?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "imagens_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imagens_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      manutencao_ferramentas: {
        Row: {
          created_at: string
          data: string
          descricao: string
          despesa_id: string | null
          empresa_id: string | null
          forma_pagamento: string | null
          id: string
          loja: string | null
          numero_nota: string | null
          obra_id: string | null
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          data?: string
          descricao: string
          despesa_id?: string | null
          empresa_id?: string | null
          forma_pagamento?: string | null
          id?: string
          loja?: string | null
          numero_nota?: string | null
          obra_id?: string | null
          updated_at?: string
          valor: number
        }
        Update: {
          created_at?: string
          data?: string
          descricao?: string
          despesa_id?: string | null
          empresa_id?: string | null
          forma_pagamento?: string | null
          id?: string
          loja?: string | null
          numero_nota?: string | null
          obra_id?: string | null
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "manutencao_ferramentas_despesa_id_fkey"
            columns: ["despesa_id"]
            isOneToOne: false
            referencedRelation: "despesas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencao_ferramentas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencao_ferramentas_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      mao_de_obra: {
        Row: {
          created_at: string
          dias: number
          empresa_id: string | null
          funcao: string | null
          funcionario: string
          id: string
          obra_id: string
          status: string
          updated_at: string
          valor_diaria: number
          valor_total: number | null
        }
        Insert: {
          created_at?: string
          dias?: number
          empresa_id?: string | null
          funcao?: string | null
          funcionario: string
          id?: string
          obra_id: string
          status?: string
          updated_at?: string
          valor_diaria?: number
          valor_total?: number | null
        }
        Update: {
          created_at?: string
          dias?: number
          empresa_id?: string | null
          funcao?: string | null
          funcionario?: string
          id?: string
          obra_id?: string
          status?: string
          updated_at?: string
          valor_diaria?: number
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mao_de_obra_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mao_de_obra_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_aditivos: {
        Row: {
          created_at: string
          created_by: string | null
          data_aprovacao: string | null
          descricao: string
          dias_adicionais: number
          documento_url: string | null
          empresa_id: string | null
          id: string
          justificativa: string | null
          obra_id: string
          responsavel_aprovacao: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_aprovacao?: string | null
          descricao: string
          dias_adicionais?: number
          documento_url?: string | null
          empresa_id?: string | null
          id?: string
          justificativa?: string | null
          obra_id: string
          responsavel_aprovacao?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_aprovacao?: string | null
          descricao?: string
          dias_adicionais?: number
          documento_url?: string | null
          empresa_id?: string | null
          id?: string
          justificativa?: string | null
          obra_id?: string
          responsavel_aprovacao?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      obras: {
        Row: {
          anotacoes: string | null
          cliente_id: string | null
          crea_cau: string | null
          created_at: string
          data_fim_prevista: string | null
          data_inicio: string | null
          empresa_id: string | null
          endereco: string | null
          id: string
          nome: string
          prazo_contratual_dias: number | null
          responsavel_tecnico: string | null
          status: string
          updated_at: string
        }
        Insert: {
          anotacoes?: string | null
          cliente_id?: string | null
          crea_cau?: string | null
          created_at?: string
          data_fim_prevista?: string | null
          data_inicio?: string | null
          empresa_id?: string | null
          endereco?: string | null
          id?: string
          nome: string
          prazo_contratual_dias?: number | null
          responsavel_tecnico?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          anotacoes?: string | null
          cliente_id?: string | null
          crea_cau?: string | null
          created_at?: string
          data_fim_prevista?: string | null
          data_inicio?: string | null
          empresa_id?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          prazo_contratual_dias?: number | null
          responsavel_tecnico?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "obras_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obras_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      parcelas: {
        Row: {
          created_at: string
          data_recebimento: string | null
          data_vencimento: string
          empresa_id: string | null
          forma_pagamento: string | null
          id: string
          numero_parcela: number
          receita_id: string
          status: string
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          data_recebimento?: string | null
          data_vencimento: string
          empresa_id?: string | null
          forma_pagamento?: string | null
          id?: string
          numero_parcela: number
          receita_id: string
          status?: string
          updated_at?: string
          valor: number
        }
        Update: {
          created_at?: string
          data_recebimento?: string | null
          data_vencimento?: string
          empresa_id?: string | null
          forma_pagamento?: string | null
          id?: string
          numero_parcela?: number
          receita_id?: string
          status?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "parcelas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcelas_receita_id_fkey"
            columns: ["receita_id"]
            isOneToOne: false
            referencedRelation: "receitas"
            referencedColumns: ["id"]
          },
        ]
      }
      permissoes_usuario: {
        Row: {
          created_at: string
          id: string
          modulo: string
          pode_criar: boolean
          pode_editar: boolean
          pode_excluir: boolean
          pode_visualizar: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          modulo: string
          pode_criar?: boolean
          pode_editar?: boolean
          pode_excluir?: boolean
          pode_visualizar?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          modulo?: string
          pode_criar?: boolean
          pode_editar?: boolean
          pode_excluir?: boolean
          pode_visualizar?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          empresa_id: string | null
          id: string
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          empresa_id?: string | null
          id?: string
          nome?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          empresa_id?: string | null
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      receitas: {
        Row: {
          anexo: string | null
          created_at: string
          descricao: string
          empresa_id: string | null
          forma_pagamento: string
          id: string
          numero_parcelas: number | null
          obra_id: string
          observacoes: string | null
          updated_at: string
          valor_total: number
        }
        Insert: {
          anexo?: string | null
          created_at?: string
          descricao: string
          empresa_id?: string | null
          forma_pagamento?: string
          id?: string
          numero_parcelas?: number | null
          obra_id: string
          observacoes?: string | null
          updated_at?: string
          valor_total?: number
        }
        Update: {
          anexo?: string | null
          created_at?: string
          descricao?: string
          empresa_id?: string | null
          forma_pagamento?: string
          id?: string
          numero_parcelas?: number | null
          obra_id?: string
          observacoes?: string | null
          updated_at?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "receitas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receitas_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      relatorio_logs: {
        Row: {
          acao: string
          data: string
          id: string
          relatorio_id: string
          usuario_id: string
          versao_id: string | null
        }
        Insert: {
          acao?: string
          data?: string
          id?: string
          relatorio_id: string
          usuario_id: string
          versao_id?: string | null
        }
        Update: {
          acao?: string
          data?: string
          id?: string
          relatorio_id?: string
          usuario_id?: string
          versao_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "relatorio_logs_relatorio_id_fkey"
            columns: ["relatorio_id"]
            isOneToOne: false
            referencedRelation: "relatorios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relatorio_logs_versao_id_fkey"
            columns: ["versao_id"]
            isOneToOne: false
            referencedRelation: "relatorio_versoes"
            referencedColumns: ["id"]
          },
        ]
      }
      relatorio_versoes: {
        Row: {
          criado_por: string
          data_criacao: string
          descricao_alteracao: string | null
          id: string
          numero_versao: number
          relatorio_id: string
          snapshot_dados: Json | null
          status: string
        }
        Insert: {
          criado_por: string
          data_criacao?: string
          descricao_alteracao?: string | null
          id?: string
          numero_versao?: number
          relatorio_id: string
          snapshot_dados?: Json | null
          status?: string
        }
        Update: {
          criado_por?: string
          data_criacao?: string
          descricao_alteracao?: string | null
          id?: string
          numero_versao?: number
          relatorio_id?: string
          snapshot_dados?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "relatorio_versoes_relatorio_id_fkey"
            columns: ["relatorio_id"]
            isOneToOne: false
            referencedRelation: "relatorios"
            referencedColumns: ["id"]
          },
        ]
      }
      relatorios: {
        Row: {
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          dias_parados: number | null
          dias_trabalhados: number | null
          empresa_id: string | null
          id: string
          obra_id: string
          observacoes: string | null
          prazo_ajustado: number | null
          prazo_contratual_dias_uteis: number | null
          revisao_pdf: number | null
          saldo_prazo: number | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          dias_parados?: number | null
          dias_trabalhados?: number | null
          empresa_id?: string | null
          id?: string
          obra_id: string
          observacoes?: string | null
          prazo_ajustado?: number | null
          prazo_contratual_dias_uteis?: number | null
          revisao_pdf?: number | null
          saldo_prazo?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          dias_parados?: number | null
          dias_trabalhados?: number | null
          empresa_id?: string | null
          id?: string
          obra_id?: string
          observacoes?: string | null
          prazo_ajustado?: number | null
          prazo_contratual_dias_uteis?: number | null
          revisao_pdf?: number | null
          saldo_prazo?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relatorios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relatorios_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      usuario_obras: {
        Row: {
          created_at: string
          id: string
          obra_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          obra_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          obra_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_obras_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_obra: { Args: { _obra_id: string }; Returns: boolean }
      can_manage_usuario_obra: {
        Args: { _obra_id: string; _target_user_id: string }
        Returns: boolean
      }
      create_empresa_and_link: {
        Args: { _cnpj?: string; _nome: string }
        Returns: string
      }
      get_user_empresa_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      set_default_permissions: {
        Args: { _role: string; _user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "trabalhador" | "sindico" | "cliente" | "super_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "trabalhador", "sindico", "cliente", "super_admin"],
    },
  },
} as const
