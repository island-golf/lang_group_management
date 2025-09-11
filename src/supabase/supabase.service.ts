
import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      'https://wqvdzicazdozhcojkgaz.supabase.co',
      'goyK8ADzm93eqjYq'
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
}
