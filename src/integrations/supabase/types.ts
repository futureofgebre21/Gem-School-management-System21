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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      academic_years: {
        Row: {
          created_at: string
          end_date: string
          id: string
          is_current: boolean | null
          name: string
          school_id: string
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          is_current?: boolean | null
          name: string
          school_id: string
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          is_current?: boolean | null
          name?: string
          school_id?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_years_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          school_id: string
          target_audience: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          school_id: string
          target_audience?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          school_id?: string
          target_audience?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          changed_at: string | null
          changed_by: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      class_subjects: {
        Row: {
          class_id: string
          created_at: string
          id: string
          school_id: string
          subject_id: string
          teacher_id: string | null
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          school_id: string
          subject_id: string
          teacher_id?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          school_id?: string
          subject_id?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_subjects_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_subjects_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          school_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          school_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      entrollments: {
        Row: {
          academic_year_id: string | null
          class_id: string | null
          created_at: string | null
          grade_level: string
          id: string
          promotion_status: string | null
          school_id: string | null
          school_year: string
          section: string | null
          section_id: string | null
          status: string | null
          student_id: string | null
          teacher_id: string | null
        }
        Insert: {
          academic_year_id?: string | null
          class_id?: string | null
          created_at?: string | null
          grade_level: string
          id?: string
          promotion_status?: string | null
          school_id?: string | null
          school_year: string
          section?: string | null
          section_id?: string | null
          status?: string | null
          student_id?: string | null
          teacher_id?: string | null
        }
        Update: {
          academic_year_id?: string | null
          class_id?: string | null
          created_at?: string | null
          grade_level?: string
          id?: string
          promotion_status?: string | null
          school_id?: string | null
          school_year?: string
          section?: string | null
          section_id?: string | null
          status?: string | null
          student_id?: string | null
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entrollments_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrollments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrollments_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrollments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_attempts: {
        Row: {
          completed_at: string | null
          created_at: string
          exam_id: string
          id: string
          percentage: number | null
          school_id: string
          score: number | null
          started_at: string
          status: string
          student_id: string
          total_questions: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          exam_id: string
          id?: string
          percentage?: number | null
          school_id: string
          score?: number | null
          started_at?: string
          status?: string
          student_id: string
          total_questions?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          exam_id?: string
          id?: string
          percentage?: number | null
          school_id?: string
          score?: number | null
          started_at?: string
          status?: string
          student_id?: string
          total_questions?: number
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_attempts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_question_links: {
        Row: {
          exam_id: string
          id: string
          question_id: string
          question_order: number | null
        }
        Insert: {
          exam_id: string
          id?: string
          question_id: string
          question_order?: number | null
        }
        Update: {
          exam_id?: string
          id?: string
          question_id?: string
          question_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_question_links_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_question_links_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "exam_questions_bank"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_questions_bank: {
        Row: {
          correct_answer: string
          created_at: string
          created_by: string | null
          difficulty_level: string
          explanation: string | null
          grade_level: string
          id: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_text: string
          school_id: string
          subject_id: string
          updated_at: string
        }
        Insert: {
          correct_answer: string
          created_at?: string
          created_by?: string | null
          difficulty_level?: string
          explanation?: string | null
          grade_level: string
          id?: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_text: string
          school_id: string
          subject_id: string
          updated_at?: string
        }
        Update: {
          correct_answer?: string
          created_at?: string
          created_by?: string | null
          difficulty_level?: string
          explanation?: string | null
          grade_level?: string
          id?: string
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          question_text?: string
          school_id?: string
          subject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_questions_bank_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_questions_bank_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_results_summary: {
        Row: {
          created_at: string
          exam_id: string
          id: string
          percentage: number
          rank: number | null
          school_id: string
          student_id: string
          total_correct: number
          total_wrong: number
        }
        Insert: {
          created_at?: string
          exam_id: string
          id?: string
          percentage?: number
          rank?: number | null
          school_id: string
          student_id: string
          total_correct?: number
          total_wrong?: number
        }
        Update: {
          created_at?: string
          exam_id?: string
          id?: string
          percentage?: number
          rank?: number | null
          school_id?: string
          student_id?: string
          total_correct?: number
          total_wrong?: number
        }
        Relationships: [
          {
            foreignKeyName: "exam_results_summary_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_results_summary_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_results_summary_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_student_answers: {
        Row: {
          answered_at: string | null
          attempt_id: string
          id: string
          is_correct: boolean | null
          question_id: string
          selected_answer: string | null
        }
        Insert: {
          answered_at?: string | null
          attempt_id: string
          id?: string
          is_correct?: boolean | null
          question_id: string
          selected_answer?: string | null
        }
        Update: {
          answered_at?: string | null
          attempt_id?: string
          id?: string
          is_correct?: boolean | null
          question_id?: string
          selected_answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_student_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_student_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "exam_questions_bank"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          created_at: string
          created_by: string | null
          exam_title: string
          exam_type: string
          grade_id: number
          id: string
          is_published: boolean
          school_id: string
          subject_id: string
          time_limit_minutes: number
          total_questions: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          exam_title: string
          exam_type?: string
          grade_id: number
          id?: string
          is_published?: boolean
          school_id: string
          subject_id: string
          time_limit_minutes?: number
          total_questions?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          exam_title?: string
          exam_type?: string
          grade_id?: number
          id?: string
          is_published?: boolean
          school_id?: string
          subject_id?: string
          time_limit_minutes?: number
          total_questions?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "grade_level"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_payments: {
        Row: {
          amount_paid: number
          created_at: string
          fee_structure_id: string
          id: string
          payment_date: string | null
          payment_method: string | null
          receipt_number: string | null
          recorded_by: string | null
          remarks: string | null
          school_id: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          fee_structure_id: string
          id?: string
          payment_date?: string | null
          payment_method?: string | null
          receipt_number?: string | null
          recorded_by?: string | null
          remarks?: string | null
          school_id: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          fee_structure_id?: string
          id?: string
          payment_date?: string | null
          payment_method?: string | null
          receipt_number?: string | null
          recorded_by?: string | null
          remarks?: string | null
          school_id?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_payments_fee_structure_id_fkey"
            columns: ["fee_structure_id"]
            isOneToOne: false
            referencedRelation: "fee_structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_structures: {
        Row: {
          academic_year_id: string | null
          amount: number
          class_id: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          school_id: string
          term: string | null
          updated_at: string
        }
        Insert: {
          academic_year_id?: string | null
          amount?: number
          class_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          school_id: string
          term?: string | null
          updated_at?: string
        }
        Update: {
          academic_year_id?: string | null
          amount?: number
          class_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          school_id?: string
          term?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_structures_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_structures_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_structures_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_level: {
        Row: {
          created_at: string
          description: string | null
          id: number
          level_name: string | null
          level_number: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: number
          level_name?: string | null
          level_number?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: number
          level_name?: string | null
          level_number?: number | null
        }
        Relationships: []
      }
      grades: {
        Row: {
          academic_year_id: string
          activity: number | null
          assignment_1: number | null
          assignment_2: number | null
          class_id: string
          created_at: string
          entrollment_id: string
          final_exam: number | null
          grade: string | null
          homework: number | null
          id: string
          mid_exam: number | null
          project_lab: number | null
          quiz_1: number | null
          quiz_2: number | null
          recorded_by: string | null
          remarks: string | null
          school_id: string
          score: number | null
          student_id: string
          subject_id: string
          term: string
          total_score: number | null
          updated_at: string
        }
        Insert: {
          academic_year_id: string
          activity?: number | null
          assignment_1?: number | null
          assignment_2?: number | null
          class_id: string
          created_at?: string
          entrollment_id: string
          final_exam?: number | null
          grade?: string | null
          homework?: number | null
          id?: string
          mid_exam?: number | null
          project_lab?: number | null
          quiz_1?: number | null
          quiz_2?: number | null
          recorded_by?: string | null
          remarks?: string | null
          school_id: string
          score?: number | null
          student_id: string
          subject_id: string
          term: string
          total_score?: number | null
          updated_at?: string
        }
        Update: {
          academic_year_id?: string
          activity?: number | null
          assignment_1?: number | null
          assignment_2?: number | null
          class_id?: string
          created_at?: string
          entrollment_id?: string
          final_exam?: number | null
          grade?: string | null
          homework?: number | null
          id?: string
          mid_exam?: number | null
          project_lab?: number | null
          quiz_1?: number | null
          quiz_2?: number | null
          recorded_by?: string | null
          remarks?: string | null
          school_id?: string
          score?: number | null
          student_id?: string
          subject_id?: string
          term?: string
          total_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grades_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_entrollment_id_fkey"
            columns: ["entrollment_id"]
            isOneToOne: false
            referencedRelation: "entrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          school_id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          school_id: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          school_id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_students: {
        Row: {
          created_at: string
          id: string
          parent_id: string
          relationship: string | null
          school_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parent_id: string
          relationship?: string | null
          school_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parent_id?: string
          relationship?: string | null
          school_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          linked_student_id: string | null
          parent_name_locked: string | null
          parent_phone_locked: string | null
          parent_search_count: number
          phone: string | null
          role_id: string | null
          school_id: string | null
          staff_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          linked_student_id?: string | null
          parent_name_locked?: string | null
          parent_phone_locked?: string | null
          parent_search_count?: number
          phone?: string | null
          role_id?: string | null
          school_id?: string | null
          staff_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          linked_student_id?: string | null
          parent_name_locked?: string | null
          parent_phone_locked?: string | null
          parent_search_count?: number
          phone?: string | null
          role_id?: string | null
          school_id?: string | null
          staff_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_linked_student_id_fkey"
            columns: ["linked_student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      role_codes: {
        Row: {
          code: string
          created_by: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          role_name: string
          school_id: string | null
          status: string | null
          year: string | null
        }
        Insert: {
          code: string
          created_by?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role_name: string
          school_id?: string | null
          status?: string | null
          year?: string | null
        }
        Update: {
          code?: string
          created_by?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role_name?: string
          school_id?: string | null
          status?: string | null
          year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_codes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          school_code: string | null
          school_type: string | null
          type: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          school_code?: string | null
          school_type?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          school_code?: string | null
          school_type?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      sections: {
        Row: {
          class_id: string
          created_at: string
          id: string
          name: string
          school_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          name: string
          school_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          name?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sections_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_invites: {
        Row: {
          created_at: string | null
          created_by: string | null
          email: string | null
          first_name: string | null
          id: string
          invite_code: string | null
          last_name: string | null
          phone: string | null
          school_id: string | null
          target_role: string | null
          year: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          invite_code?: string | null
          last_name?: string | null
          phone?: string | null
          school_id?: string | null
          target_role?: string | null
          year?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          invite_code?: string | null
          last_name?: string | null
          phone?: string | null
          school_id?: string | null
          target_role?: string | null
          year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_invites_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      student_attendance: {
        Row: {
          class_id: string
          created_at: string
          date: string
          entrollment_id: string
          id: string
          recorded_by: string | null
          remarks: string | null
          school_id: string
          school_year: string
          section_id: string | null
          status: string
          student_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          date: string
          entrollment_id: string
          id?: string
          recorded_by?: string | null
          remarks?: string | null
          school_id: string
          school_year: string
          section_id?: string | null
          status?: string
          student_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          date?: string
          entrollment_id?: string
          id?: string
          recorded_by?: string | null
          remarks?: string | null
          school_id?: string
          school_year?: string
          section_id?: string | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_attendance_entrollment_id_fkey"
            columns: ["entrollment_id"]
            isOneToOne: false
            referencedRelation: "entrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_attendance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_attendance_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_classes: {
        Row: {
          academic_year_id: string
          class_id: string
          created_at: string
          id: string
          school_id: string
          section_id: string | null
          student_id: string
        }
        Insert: {
          academic_year_id: string
          class_id: string
          created_at?: string
          id?: string
          school_id: string
          section_id?: string | null
          student_id: string
        }
        Update: {
          academic_year_id?: string
          class_id?: string
          created_at?: string
          id?: string
          school_id?: string
          section_id?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_classes_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_classes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_classes_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_classes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          class: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          first_name: string
          gender: string | null
          id: string
          last_name: string
          parent_email: string | null
          parent_id: string | null
          parent_name: string | null
          parent_phone: string | null
          photo_url: string | null
          school_id: string
          section: string | null
          status: string
          student_id_number: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          class?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          first_name: string
          gender?: string | null
          id?: string
          last_name: string
          parent_email?: string | null
          parent_id?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          photo_url?: string | null
          school_id: string
          section?: string | null
          status?: string
          student_id_number: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          class?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          last_name?: string
          parent_email?: string | null
          parent_id?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          photo_url?: string | null
          school_id?: string
          section?: string | null
          status?: string
          student_id_number?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          school_id: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          school_id: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_attendance: {
        Row: {
          created_at: string
          date: string
          entrollment_id: string
          id: string
          recorded_by: string | null
          remarks: string | null
          school_id: string
          school_year: string
          status: string
          teacher_id: string
        }
        Insert: {
          created_at?: string
          date: string
          entrollment_id: string
          id?: string
          recorded_by?: string | null
          remarks?: string | null
          school_id: string
          school_year: string
          status?: string
          teacher_id: string
        }
        Update: {
          created_at?: string
          date?: string
          entrollment_id?: string
          id?: string
          recorded_by?: string | null
          remarks?: string | null
          school_id?: string
          school_year?: string
          status?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_attendance_entrollment_id_fkey"
            columns: ["entrollment_id"]
            isOneToOne: false
            referencedRelation: "entrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_attendance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_attendance_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          classes: string[] | null
          created_at: string
          department: string | null
          email: string | null
          first_name: string
          grade: string | null
          hire_data: string | null
          id: string
          last_name: string
          phone: string | null
          photo_url: string | null
          qualification: string | null
          salary: number | null
          school_id: string
          status: string
          subjects: string[] | null
          teacher_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          classes?: string[] | null
          created_at?: string
          department?: string | null
          email?: string | null
          first_name: string
          grade?: string | null
          hire_data?: string | null
          id?: string
          last_name: string
          phone?: string | null
          photo_url?: string | null
          qualification?: string | null
          salary?: number | null
          school_id: string
          status?: string
          subjects?: string[] | null
          teacher_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          classes?: string[] | null
          created_at?: string
          department?: string | null
          email?: string | null
          first_name?: string
          grade?: string | null
          hire_data?: string | null
          id?: string
          last_name?: string
          phone?: string | null
          photo_url?: string | null
          qualification?: string | null
          salary?: number | null
          school_id?: string
          status?: string
          subjects?: string[] | null
          teacher_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teachers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      user_assignments: {
        Row: {
          assigned_at: string | null
          id: string
          role: string | null
          role_name: string
          school_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          id?: string
          role?: string | null
          role_name: string
          school_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          id?: string
          role?: string | null
          role_name?: string
          school_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_assignments_role_name_fkey"
            columns: ["role_name"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["role_name"]
          },
          {
            foreignKeyName: "user_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          admin_position: Database["public"]["Enums"]["admin_position"] | null
          id: string
          role_name: string
        }
        Insert: {
          admin_position?: Database["public"]["Enums"]["admin_position"] | null
          id?: string
          role_name: string
        }
        Update: {
          admin_position?: Database["public"]["Enums"]["admin_position"] | null
          id?: string
          role_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_school_with_admin:
        | {
            Args: {
              city: string
              country: string
              email: string
              p_role_name: string
              phone: string
              school_name: string
              school_type: string
            }
            Returns: string
          }
        | {
            Args: {
              city: string
              country: string
              email: string
              p_role_name: string
              p_user_id: string
              phone: string
              school_name: string
              school_type: string
            }
            Returns: string
          }
      generate_role_codes_with_data: {
        Args: {
          p_email: string
          p_first_name: string
          p_last_name: string
          p_phone: string
          p_role: string
          p_school_id: string
          p_year: string
        }
        Returns: string
      }
      generate_staff_invite_with_data: {
        Args: {
          p_email: string
          p_first_name: string
          p_last_name: string
          p_phone: string
          p_role: string
          p_school_id: string
          p_year: string
        }
        Returns: string
      }
      generate_teacher_staff_id: { Args: never; Returns: string }
      get_my_context: {
        Args: never
        Returns: {
          role_name: string
          school_id: string
        }[]
      }
      get_school_by_code: {
        Args: { _code: string }
        Returns: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          school_code: string | null
          school_type: string | null
          type: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "schools"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_user_school_id: { Args: { _user_id: string }; Returns: string }
      verify_teacher_and_link: {
        Args: { input_school_code: string; input_teacher_id: string }
        Returns: Json
      }
    }
    Enums: {
      admin_position:
        | "director"
        | "vice_academic"
        | "vice_admin"
        | "record_office"
        | "human_resource"
        | "cashier"
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
      admin_position: [
        "director",
        "vice_academic",
        "vice_admin",
        "record_office",
        "human_resource",
        "cashier",
      ],
    },
  },
} as const
