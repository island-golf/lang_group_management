
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { SupabaseComponent} from './supabase.component';
import { SupabaseService } from './supabase.service';

@NgModule({
  declarations: [],
  imports: [BrowserModule, FormsModule, SupabaseComponent],
  providers: [SupabaseService],
  bootstrap: []
})
export class SupabaseModule {}
