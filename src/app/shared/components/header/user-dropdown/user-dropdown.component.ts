import { Component, inject, signal, OnInit } from '@angular/core';
import { DropdownComponent } from '../../ui/dropdown/dropdown.component';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DropdownItemTwoComponent } from '../../ui/dropdown/dropdown-item/dropdown-item.component-two';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../services/supabase.service';

@Component({
  selector: 'app-user-dropdown',
  templateUrl: './user-dropdown.component.html',
  imports:[CommonModule,RouterModule,DropdownComponent,DropdownItemTwoComponent]
})
export class UserDropdownComponent {
  isOpen = false;

  private supabaseService = inject(SupabaseService);
  private router = inject(Router);

  // Signal que contiene el usuario actual
  currentUser = signal<any>(null);

  async ngOnInit(): Promise<void> {
    const user = await this.supabaseService.getUser();
    this.currentUser.set(user);
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  closeDropdown() {
    this.isOpen = false;
  }

  async logout() {
    try {
      await this.supabaseService.signOut();
      this.closeDropdown();
      this.router.navigate(['/signin']);
    } catch (err) {
      console.error('Error signing out', err);
      // En caso de error, igualmente redirigimos al signin
      this.router.navigate(['/signin']);
    }
  }
}