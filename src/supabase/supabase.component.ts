
import { Component, OnInit } from '@angular/core';
import { SupabaseService } from './supabase.service';
import {FormsModule} from '@angular/forms';
import {NgForOf} from '@angular/common';

@Component({
  selector: 'app-root',
  templateUrl: './supabase.component.html',
  imports: [
    FormsModule,
    NgForOf
  ]
})
export class SupabaseComponent implements OnInit {
  todos: any[] = [];
  newTask: string = '';

  constructor(private supabaseService: SupabaseService) {}

  async ngOnInit() {
    this.todos = await this.supabaseService.getTodos();
  }

  async addTodo() {
    if (this.newTask.trim()) {
      await this.supabaseService.addTodo(this.newTask);
      this.todos = await this.supabaseService.getTodos();
      this.newTask = '';
    }
  }

  async toggleDone(todo: any) {
    await this.supabaseService.toggleDone(todo.id, !todo.done);
    this.todos = await this.supabaseService.getTodos();
  }

  async deleteTodo(id: number) {
    await this.supabaseService.deleteTodo(id);
    this.todos = await this.supabaseService.getTodos();
  }
}
