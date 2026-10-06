// supabase/migrations/*.sql ile birebir eşleşen tipler.
// Şema değişirse `npx supabase gen types typescript` ile yeniden üretilebilir.

import type { Asama, FirmaTuru, GorevDurumu, GorevTuru } from "./domain";

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type FK<Name extends string, Col extends string, Ref extends string> = {
  foreignKeyName: Name;
  columns: [Col, "user_id"];
  isOneToOne: false;
  referencedRelation: Ref;
  referencedColumns: ["id", "user_id"];
};

export type CompanyRow = {
  id: string;
  user_id: string;
  ad: string;
  ulke: string | null;
  tur: FirmaTuru;
  segment: string | null;
  aktif: boolean;
  son_temas: string | null;
  notlar: string | null;
  eposta_alanlari: string[];
  created_at: string;
  updated_at: string;
};

export type ContactRow = {
  id: string;
  user_id: string;
  company_id: string;
  ad: string;
  unvan: string | null;
  eposta: string | null;
  telefon: string | null;
  dil: string | null;
  created_at: string;
  updated_at: string;
};

export type DealRow = {
  id: string;
  user_id: string;
  company_id: string;
  urun: string;
  asama: Asama;
  tahmini_miktar_ton: number | null;
  tahmini_tutar: number | null;
  para_birimi: string;
  asama_tarihi: string;
  created_at: string;
  updated_at: string;
};

export type InboxRow = {
  id: string;
  user_id: string;
  ham_metin: string;
  ses_dosyasi: string | null;
  ayristirma_json: Json | null;
  durum: "islenmedi" | "islendi";
  hata: string | null;
  kaynak: "elle" | "eposta";
  eposta: Json | null;
  created_at: string;
  updated_at: string;
};

export type TaskRow = {
  id: string;
  user_id: string;
  baslik: string;
  tur: GorevTuru;
  durum: GorevDurumu;
  vade: string | null;
  hatirlatma_zamani: string | null;
  tekrar_kurali: string | null;
  kural: string | null;
  company_id: string | null;
  contact_id: string | null;
  deal_id: string | null;
  kaynak_inbox_id: string | null;
  tamamlanma: string | null;
  created_at: string;
  updated_at: string;
};

export type NoteRow = {
  id: string;
  user_id: string;
  metin: string;
  ozet: string | null;
  company_id: string | null;
  deal_id: string | null;
  kaynak_inbox_id: string | null;
  tarih: string;
  created_at: string;
  updated_at: string;
};

export type SettingsRow = {
  user_id: string;
  saat_dilimi: string;
  ozet_saati: string;
  hatirlatma_saati: string;
  gunluk_bildirim_limiti: number;
  sessiz_liste_gunu: number;
  ek_tatiller: string[];
  kurallar: Json;
  eposta_anahtari: string;
  eposta_gondericiler: string[];
  created_at: string;
  updated_at: string;
};

export type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
};

export type NotificationLogRow = {
  id: number;
  user_id: string;
  task_id: string | null;
  tur: "hatirlatma" | "ozet";
  gun: string;
  gonderim: string;
};

export type EmailLogRow = {
  id: number;
  user_id: string | null;
  alinma: string;
  message_id: string | null;
  gonderen: string | null;
  konu: string | null;
  sonuc: "isleniyor" | "gelen_kutusu" | "not" | "reddedildi";
  aciklama: string | null;
};

export type CompanyOverviewRow = CompanyRow & { acik_gorev: number; acik_firsat: number };

type Insert<R, Required extends keyof R> = Pick<R, Required> & Partial<Omit<R, Required>>;

type Table<R, I, Rel extends unknown[] = []> = {
  Row: R;
  Insert: I;
  Update: Partial<R>;
  Relationships: Rel;
};

export type Database = {
  public: {
    Tables: {
      companies: Table<CompanyRow, Insert<CompanyRow, "ad">>;
      contacts: Table<
        ContactRow,
        Insert<ContactRow, "company_id" | "ad">,
        [FK<"contacts_company_id_user_id_fkey", "company_id", "companies">]
      >;
      deals: Table<
        DealRow,
        Insert<DealRow, "company_id" | "urun">,
        [FK<"deals_company_id_user_id_fkey", "company_id", "companies">]
      >;
      inbox_items: Table<InboxRow, Insert<InboxRow, "ham_metin">>;
      tasks: Table<
        TaskRow,
        Insert<TaskRow, "baslik">,
        [
          FK<"tasks_company_id_user_id_fkey", "company_id", "companies">,
          FK<"tasks_contact_id_user_id_fkey", "contact_id", "contacts">,
          FK<"tasks_deal_id_user_id_fkey", "deal_id", "deals">,
          FK<"tasks_kaynak_inbox_id_user_id_fkey", "kaynak_inbox_id", "inbox_items">,
        ]
      >;
      notes: Table<
        NoteRow,
        Insert<NoteRow, "metin">,
        [
          FK<"notes_company_id_user_id_fkey", "company_id", "companies">,
          FK<"notes_deal_id_user_id_fkey", "deal_id", "deals">,
          FK<"notes_kaynak_inbox_id_user_id_fkey", "kaynak_inbox_id", "inbox_items">,
        ]
      >;
      settings: Table<SettingsRow, Partial<SettingsRow>>;
      push_subscriptions: Table<PushSubscriptionRow, Insert<PushSubscriptionRow, "endpoint" | "p256dh" | "auth">>;
      notification_log: Table<
        NotificationLogRow,
        Insert<Omit<NotificationLogRow, "id">, "user_id" | "tur" | "gun">
      >;
      email_log: Table<EmailLogRow, Partial<Omit<EmailLogRow, "id">>>;
    };
    Views: {
      company_overview: {
        Row: CompanyOverviewRow;
        Relationships: [];
      };
    };
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
