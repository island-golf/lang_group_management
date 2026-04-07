
import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface MUser {
  USERNAME: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      'https://batxjgnynvnykoingkij.supabase.co',
      'sb_publishable_UtUV7xSJeNC44WeOprBeDg_8tDWXA1w'
    );
  }

  async getTodos() {
    const { data, error } = await this.supabase.from('todos').select('*');
    if (error) throw error;
    return data;
  }

  async addTodo(task: string) {
    const { data, error } = await this.supabase.from('todos').insert([{ task }]);
    if (error) throw error;
    return data;
  }

  async toggleDone(id: number, done: boolean) {
    const { data, error } = await this.supabase.from('todos').update({ done }).eq('id', id);
    if (error) throw error;
    return data;
  }

  async deleteTodo(id: number) {
    const { error } = await this.supabase.from('todos').delete().eq('id', id);
    if (error) throw error;
  }

  async loginUser(username: string): Promise<MUser | null> {
    const { data, error } = await this.supabase
      .from('M_USER')
      .select('*')
      .ilike('USERNAME', username)
      .maybeSingle();
    if (error) {
      console.error('loginUser error:', error);
      return null;
    }
    return data as MUser;
  }
}
