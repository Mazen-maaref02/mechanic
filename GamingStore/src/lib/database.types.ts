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
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      AdminUser: {
        Row: {
          createdAt: string
          email: string
          failedLoginCount: number
          id: string
          isActive: boolean
          lastLoginAt: string | null
          lockedUntil: string | null
          name: string
          passwordHash: string
          role: Database["public"]["Enums"]["AdminRole"]
          totpEnabled: boolean
          totpSecret: string | null
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          email: string
          failedLoginCount?: number
          id: string
          isActive?: boolean
          lastLoginAt?: string | null
          lockedUntil?: string | null
          name: string
          passwordHash: string
          role?: Database["public"]["Enums"]["AdminRole"]
          totpEnabled?: boolean
          totpSecret?: string | null
          updatedAt: string
        }
        Update: {
          createdAt?: string
          email?: string
          failedLoginCount?: number
          id?: string
          isActive?: boolean
          lastLoginAt?: string | null
          lockedUntil?: string | null
          name?: string
          passwordHash?: string
          role?: Database["public"]["Enums"]["AdminRole"]
          totpEnabled?: boolean
          totpSecret?: string | null
          updatedAt?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      AuditLog: {
        Row: {
          action: string
          actorEmail: string | null
          actorId: string | null
          actorType: string
          createdAt: string
          entityId: string | null
          entityType: string | null
          id: string
          ipHash: string | null
          meta: Json | null
        }
        Insert: {
          action: string
          actorEmail?: string | null
          actorId?: string | null
          actorType: string
          createdAt?: string
          entityId?: string | null
          entityType?: string | null
          id: string
          ipHash?: string | null
          meta?: Json | null
        }
        Update: {
          action?: string
          actorEmail?: string | null
          actorId?: string | null
          actorType?: string
          createdAt?: string
          entityId?: string | null
          entityType?: string | null
          id?: string
          ipHash?: string | null
          meta?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "AuditLog_actorId_fkey"
            columns: ["actorId"]
            isOneToOne: false
            referencedRelation: "AdminUser"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      Category: {
        Row: {
          active: boolean
          createdAt: string
          description: string | null
          displayOrder: number
          icon: string | null
          id: string
          name: string
          slug: string
          updatedAt: string
        }
        Insert: {
          active?: boolean
          createdAt?: string
          description?: string | null
          displayOrder?: number
          icon?: string | null
          id: string
          name: string
          slug: string
          updatedAt: string
        }
        Update: {
          active?: boolean
          createdAt?: string
          description?: string | null
          displayOrder?: number
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          updatedAt?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"] | null
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          min_order_amount: number | null
          starts_at: string | null
          type: Database["public"]["Enums"]["coupon_type"]
          used_count: number
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"] | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number | null
          starts_at?: string | null
          type: Database["public"]["Enums"]["coupon_type"]
          used_count?: number
          value: number
        }
        Update: {
          code?: string
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"] | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number | null
          starts_at?: string | null
          type?: Database["public"]["Enums"]["coupon_type"]
          used_count?: number
          value?: number
        }
        Relationships: []
      }
      deliveries: {
        Row: {
          content: string | null
          created_at: string
          delivered_by: string | null
          id: string
          key_id: string | null
          method: Database["public"]["Enums"]["delivery_method"]
          order_item_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          delivered_by?: string | null
          id?: string
          key_id?: string | null
          method: Database["public"]["Enums"]["delivery_method"]
          order_item_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          delivered_by?: string | null
          id?: string
          key_id?: string | null
          method?: Database["public"]["Enums"]["delivery_method"]
          order_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_delivered_by_fkey"
            columns: ["delivered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "digital_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_keys: {
        Row: {
          batch: string | null
          created_at: string
          id: string
          key_ciphertext: string
          order_item_id: string | null
          reserved_at: string | null
          sold_at: string | null
          status: Database["public"]["Enums"]["key_status"]
          updated_at: string
          variant_id: string
        }
        Insert: {
          batch?: string | null
          created_at?: string
          id?: string
          key_ciphertext: string
          order_item_id?: string | null
          reserved_at?: string | null
          sold_at?: string | null
          status?: Database["public"]["Enums"]["key_status"]
          updated_at?: string
          variant_id: string
        }
        Update: {
          batch?: string | null
          created_at?: string
          id?: string
          key_ciphertext?: string
          order_item_id?: string | null
          reserved_at?: string | null
          sold_at?: string | null
          status?: Database["public"]["Enums"]["key_status"]
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_keys_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_keys_order_item"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      DiscountTier: {
        Row: {
          active: boolean
          createdAt: string
          displayOrder: number
          id: string
          minAmountDT: number
          percentOff: number
          updatedAt: string
        }
        Insert: {
          active?: boolean
          createdAt?: string
          displayOrder?: number
          id: string
          minAmountDT: number
          percentOff: number
          updatedAt: string
        }
        Update: {
          active?: boolean
          createdAt?: string
          displayOrder?: number
          id?: string
          minAmountDT?: number
          percentOff?: number
          updatedAt?: string
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          base: Database["public"]["Enums"]["currency_code"]
          created_at: string
          created_by: string | null
          effective_from: string
          id: string
          quote: Database["public"]["Enums"]["currency_code"]
          rate: number
        }
        Insert: {
          base: Database["public"]["Enums"]["currency_code"]
          created_at?: string
          created_by?: string | null
          effective_from?: string
          id?: string
          quote: Database["public"]["Enums"]["currency_code"]
          rate: number
        }
        Update: {
          base?: Database["public"]["Enums"]["currency_code"]
          created_at?: string
          created_by?: string | null
          effective_from?: string
          id?: string
          quote?: Database["public"]["Enums"]["currency_code"]
          rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      Order: {
        Row: {
          categoryId: string
          createdAt: string
          customerId: string
          description: string
          finalPriceDT: number | null
          id: string
          internalNotes: string | null
          notes: string | null
          packageLabel: string | null
          paymentStatus: Database["public"]["Enums"]["PaymentStatus"]
          platform: string | null
          preferredContact: Database["public"]["Enums"]["ContactMethod"]
          publicRef: string
          quantity: number
          serviceId: string | null
          status: Database["public"]["Enums"]["OrderStatus"]
          updatedAt: string
        }
        Insert: {
          categoryId: string
          createdAt?: string
          customerId: string
          description: string
          finalPriceDT?: number | null
          id: string
          internalNotes?: string | null
          notes?: string | null
          packageLabel?: string | null
          paymentStatus?: Database["public"]["Enums"]["PaymentStatus"]
          platform?: string | null
          preferredContact?: Database["public"]["Enums"]["ContactMethod"]
          publicRef: string
          quantity?: number
          serviceId?: string | null
          status?: Database["public"]["Enums"]["OrderStatus"]
          updatedAt: string
        }
        Update: {
          categoryId?: string
          createdAt?: string
          customerId?: string
          description?: string
          finalPriceDT?: number | null
          id?: string
          internalNotes?: string | null
          notes?: string | null
          packageLabel?: string | null
          paymentStatus?: Database["public"]["Enums"]["PaymentStatus"]
          platform?: string | null
          preferredContact?: Database["public"]["Enums"]["ContactMethod"]
          publicRef?: string
          quantity?: number
          serviceId?: string | null
          status?: Database["public"]["Enums"]["OrderStatus"]
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Order_categoryId_fkey"
            columns: ["categoryId"]
            isOneToOne: false
            referencedRelation: "Category"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Order_customerId_fkey"
            columns: ["customerId"]
            isOneToOne: false
            referencedRelation: "OrderCustomer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Order_serviceId_fkey"
            columns: ["serviceId"]
            isOneToOne: false
            referencedRelation: "Service"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          delivered_at: string | null
          delivery_status: Database["public"]["Enums"]["item_delivery_status"]
          id: string
          line_total: number
          order_id: string
          platform: string | null
          product_title: string
          quantity: number
          region: string | null
          requires_key: boolean
          unit_price: number
          variant_id: string | null
          variant_label: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          delivery_status?: Database["public"]["Enums"]["item_delivery_status"]
          id?: string
          line_total: number
          order_id: string
          platform?: string | null
          product_title: string
          quantity: number
          region?: string | null
          requires_key?: boolean
          unit_price: number
          variant_id?: string | null
          variant_label: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          delivery_status?: Database["public"]["Enums"]["item_delivery_status"]
          id?: string
          line_total?: number
          order_id?: string
          platform?: string | null
          product_title?: string
          quantity?: number
          region?: string | null
          requires_key?: boolean
          unit_price?: number
          variant_id?: string | null
          variant_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      OrderCustomer: {
        Row: {
          createdAt: string
          id: string
          instagram: string | null
          name: string
          phone: string
          preferredContact: Database["public"]["Enums"]["ContactMethod"]
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          id: string
          instagram?: string | null
          name: string
          phone: string
          preferredContact?: Database["public"]["Enums"]["ContactMethod"]
          updatedAt: string
        }
        Update: {
          createdAt?: string
          id?: string
          instagram?: string | null
          name?: string
          phone?: string
          preferredContact?: Database["public"]["Enums"]["ContactMethod"]
          updatedAt?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          admin_notes: string | null
          coupon_id: string | null
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          customer_email: string
          customer_name: string
          customer_note: string | null
          customer_phone: string | null
          delivery_email: string
          discount_amount: number
          exchange_rate: number | null
          id: string
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          profile_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          coupon_id?: string | null
          created_at?: string
          currency: Database["public"]["Enums"]["currency_code"]
          customer_email: string
          customer_name: string
          customer_note?: string | null
          customer_phone?: string | null
          delivery_email?: string
          discount_amount?: number
          exchange_rate?: number | null
          id?: string
          order_number: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          profile_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_amount: number
          total_amount: number
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          coupon_id?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          customer_email?: string
          customer_name?: string
          customer_note?: string | null
          customer_phone?: string | null
          delivery_email?: string
          discount_amount?: number
          exchange_rate?: number | null
          id?: string
          order_number?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          profile_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_proofs: {
        Row: {
          checksum: string | null
          created_at: string
          id: string
          mime_type: string
          payment_id: string
          size_bytes: number
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          checksum?: string | null
          created_at?: string
          id?: string
          mime_type: string
          payment_id: string
          size_bytes: number
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          checksum?: string | null
          created_at?: string
          id?: string
          mime_type?: string
          payment_id?: string
          size_bytes?: number
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_proofs_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_proofs_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          order_id: string
          reference: string | null
          rejected_reason: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency: Database["public"]["Enums"]["currency_code"]
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          order_id: string
          reference?: string | null
          rejected_reason?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          order_id?: string
          reference?: string | null
          rejected_reason?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string
          price_tnd: number
          price_usd: number
          product_id: string
          sku: string
          sort_order: number
          stock: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          price_tnd: number
          price_usd: number
          product_id: string
          sku: string
          sort_order?: number
          stock?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          price_tnd?: number
          price_usd?: number
          product_id?: string
          sku?: string
          sort_order?: number
          stock?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string
          created_at: string
          delivery_type: Database["public"]["Enums"]["delivery_type"]
          description: string | null
          id: string
          image_url: string | null
          is_featured: boolean
          name: string
          platform: string | null
          region: string | null
          slug: string
          status: Database["public"]["Enums"]["product_status"]
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          delivery_type?: Database["public"]["Enums"]["delivery_type"]
          description?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          name: string
          platform?: string | null
          region?: string | null
          slug: string
          status?: Database["public"]["Enums"]["product_status"]
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          delivery_type?: Database["public"]["Enums"]["delivery_type"]
          description?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          name?: string
          platform?: string | null
          region?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["product_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          mfa_enforced: boolean
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          mfa_enforced?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          mfa_enforced?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      Service: {
        Row: {
          active: boolean
          brandSlug: string | null
          categoryId: string
          createdAt: string
          description: string | null
          displayOrder: number
          featured: boolean
          icon: string | null
          id: string
          imageUrl: string | null
          isNew: boolean
          name: string
          orderCount: number
          popular: boolean
          slug: string | null
          startingPriceDT: number | null
          subcategory: string | null
          unitLabel: string | null
          updatedAt: string
        }
        Insert: {
          active?: boolean
          brandSlug?: string | null
          categoryId: string
          createdAt?: string
          description?: string | null
          displayOrder?: number
          featured?: boolean
          icon?: string | null
          id: string
          imageUrl?: string | null
          isNew?: boolean
          name: string
          orderCount?: number
          popular?: boolean
          slug?: string | null
          startingPriceDT?: number | null
          subcategory?: string | null
          unitLabel?: string | null
          updatedAt: string
        }
        Update: {
          active?: boolean
          brandSlug?: string | null
          categoryId?: string
          createdAt?: string
          description?: string | null
          displayOrder?: number
          featured?: boolean
          icon?: string | null
          id?: string
          imageUrl?: string | null
          isNew?: boolean
          name?: string
          orderCount?: number
          popular?: boolean
          slug?: string | null
          startingPriceDT?: number | null
          subcategory?: string | null
          unitLabel?: string | null
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Service_categoryId_fkey"
            columns: ["categoryId"]
            isOneToOne: false
            referencedRelation: "Category"
            referencedColumns: ["id"]
          },
        ]
      }
      ServicePackage: {
        Row: {
          active: boolean
          amountLabel: string
          createdAt: string
          displayOrder: number
          id: string
          priceDT: number
          serviceId: string
          updatedAt: string
        }
        Insert: {
          active?: boolean
          amountLabel: string
          createdAt?: string
          displayOrder?: number
          id: string
          priceDT: number
          serviceId: string
          updatedAt: string
        }
        Update: {
          active?: boolean
          amountLabel?: string
          createdAt?: string
          displayOrder?: number
          id?: string
          priceDT?: number
          serviceId?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "ServicePackage_serviceId_fkey"
            columns: ["serviceId"]
            isOneToOne: false
            referencedRelation: "Service"
            referencedColumns: ["id"]
          },
        ]
      }
      Session: {
        Row: {
          adminUserId: string
          clientHash: string
          createdAt: string
          expiresAt: string
          id: string
          lastSeenAt: string
          tokenHash: string
        }
        Insert: {
          adminUserId: string
          clientHash: string
          createdAt?: string
          expiresAt: string
          id: string
          lastSeenAt?: string
          tokenHash: string
        }
        Update: {
          adminUserId?: string
          clientHash?: string
          createdAt?: string
          expiresAt?: string
          id?: string
          lastSeenAt?: string
          tokenHash?: string
        }
        Relationships: [
          {
            foreignKeyName: "Session_adminUserId_fkey"
            columns: ["adminUserId"]
            isOneToOne: false
            referencedRelation: "AdminUser"
            referencedColumns: ["id"]
          },
        ]
      }
      Settings: {
        Row: {
          automaticDiscounts: boolean
          businessName: string
          contactEmail: string | null
          createdAt: string
          id: number
          instagramUsername: string
          maintenanceMode: boolean
          tagline: string
          updatedAt: string
          usdRate: number
          usdtRate: number
          whatsappNumber: string
        }
        Insert: {
          automaticDiscounts?: boolean
          businessName?: string
          contactEmail?: string | null
          createdAt?: string
          id?: number
          instagramUsername: string
          maintenanceMode?: boolean
          tagline?: string
          updatedAt: string
          usdRate: number
          usdtRate: number
          whatsappNumber: string
        }
        Update: {
          automaticDiscounts?: boolean
          businessName?: string
          contactEmail?: string | null
          createdAt?: string
          id?: number
          instagramUsername?: string
          maintenanceMode?: boolean
          tagline?: string
          updatedAt?: string
          usdRate?: number
          usdtRate?: number
          whatsappNumber?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      topup_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          customer_name: string | null
          fee_amount: number
          id: string
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          profile_id: string | null
          recipient_ref: string
          reference: string | null
          service: Database["public"]["Enums"]["topup_service"]
          status: Database["public"]["Enums"]["topup_status"]
          total_amount: number
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          currency: Database["public"]["Enums"]["currency_code"]
          customer_name?: string | null
          fee_amount?: number
          id?: string
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          profile_id?: string | null
          recipient_ref: string
          reference?: string | null
          service: Database["public"]["Enums"]["topup_service"]
          status?: Database["public"]["Enums"]["topup_status"]
          total_amount: number
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          customer_name?: string | null
          fee_amount?: number
          id?: string
          order_number?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          profile_id?: string | null
          recipient_ref?: string
          reference?: string | null
          service?: Database["public"]["Enums"]["topup_service"]
          status?: Database["public"]["Enums"]["topup_status"]
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "topup_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allocate_keys_for_order: { Args: { p_order_id: string }; Returns: number }
      audit: {
        Args: {
          p_action: string
          p_entity_id?: string
          p_entity_type?: string
          p_metadata?: Json
        }
        Returns: undefined
      }
      available_stock: {
        Args: { variant_ids: string[] }
        Returns: {
          key_stock: number
          stock: number
          variant_id: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_staff_if_admin: { Args: never; Returns: boolean }
      place_order:
        | {
            Args: {
              p_coupon_code: string
              p_currency: Database["public"]["Enums"]["currency_code"]
              p_email: string
              p_items: Json
              p_name: string
              p_note: string
              p_phone: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_coupon_code: string
              p_currency: Database["public"]["Enums"]["currency_code"]
              p_delivery_email?: string
              p_email: string
              p_items: Json
              p_name: string
              p_note: string
              p_phone: string
            }
            Returns: Json
          }
      profile_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      AdminRole: "ADMIN" | "OPERATOR"
      ContactMethod: "WHATSAPP" | "INSTAGRAM"
      coupon_type: "percentage" | "fixed"
      currency_code: "TND" | "USD"
      delivery_method: "automatic" | "manual"
      delivery_type: "manual" | "automatic"
      item_delivery_status: "pending" | "processing" | "delivered" | "failed"
      key_status: "available" | "reserved" | "sold" | "revoked"
      order_status:
        | "pending_payment"
        | "payment_submitted"
        | "payment_verified"
        | "processing"
        | "completed"
        | "cancelled"
        | "refunded"
        | "delivery_failed"
      OrderStatus:
        | "NEW"
        | "CONTACTED"
        | "PAYMENT_PENDING"
        | "PAYMENT_RECEIVED"
        | "PROCESSING"
        | "COMPLETED"
        | "CANCELLED"
      payment_method:
        | "redotpay"
        | "binance"
        | "d17_edinar"
        | "flouci"
        | "cash"
        | "wafacash"
        | "other"
      payment_status:
        | "pending"
        | "submitted"
        | "verified"
        | "rejected"
        | "refunded"
      PaymentStatus: "NONE" | "PENDING" | "PARTIAL" | "RECEIVED" | "REFUNDED"
      product_status: "draft" | "active" | "inactive"
      topup_service: "redotpay" | "binance" | "rizon" | "other"
      topup_status: "submitted" | "processing" | "completed" | "rejected"
      user_role: "customer" | "staff" | "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      AdminRole: ["ADMIN", "OPERATOR"],
      ContactMethod: ["WHATSAPP", "INSTAGRAM"],
      coupon_type: ["percentage", "fixed"],
      currency_code: ["TND", "USD"],
      delivery_method: ["automatic", "manual"],
      delivery_type: ["manual", "automatic"],
      item_delivery_status: ["pending", "processing", "delivered", "failed"],
      key_status: ["available", "reserved", "sold", "revoked"],
      order_status: [
        "pending_payment",
        "payment_submitted",
        "payment_verified",
        "processing",
        "completed",
        "cancelled",
        "refunded",
        "delivery_failed",
      ],
      OrderStatus: [
        "NEW",
        "CONTACTED",
        "PAYMENT_PENDING",
        "PAYMENT_RECEIVED",
        "PROCESSING",
        "COMPLETED",
        "CANCELLED",
      ],
      payment_method: [
        "redotpay",
        "binance",
        "d17_edinar",
        "flouci",
        "cash",
        "wafacash",
        "other",
      ],
      payment_status: [
        "pending",
        "submitted",
        "verified",
        "rejected",
        "refunded",
      ],
      PaymentStatus: ["NONE", "PENDING", "PARTIAL", "RECEIVED", "REFUNDED"],
      product_status: ["draft", "active", "inactive"],
      topup_service: ["redotpay", "binance", "rizon", "other"],
      topup_status: ["submitted", "processing", "completed", "rejected"],
      user_role: ["customer", "staff", "admin"],
    },
  },
} as const
