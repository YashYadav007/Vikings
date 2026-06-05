import { createClient, SupabaseClient } from "@supabase/supabase-js";

type DevContextSupabaseClient = SupabaseClient<any, any, any>;

export class SupabaseService {
  readonly schema = process.env.SUPABASE_DB_SCHEMA ?? "public";
  private readonly url = process.env.SUPABASE_URL;
  private readonly serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  private client: DevContextSupabaseClient | null = null;

  isConfigured(): boolean {
    return Boolean(this.url && this.serviceRoleKey);
  }

  getClient(): DevContextSupabaseClient {
    if (!this.isConfigured()) {
      throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    }

    if (!this.client) {
      const client: DevContextSupabaseClient = createClient(this.url as string, this.serviceRoleKey as string, {
        db: { schema: this.schema },
        auth: { persistSession: false },
      });
      this.client = client;
    }

    return this.client;
  }
}
