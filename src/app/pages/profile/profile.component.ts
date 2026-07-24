import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { RouterModule } from "@angular/router";
import { SupabaseService } from "../../shared/services/supabase.service";

@Component({
  selector: "app-profile",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./profile.component.html",
})
export class ProfileComponent implements OnInit {
  private supabase = inject(SupabaseService);

  user = signal<any>(null);
  isLoading = signal(false);

  async ngOnInit(): Promise<void> {
    this.isLoading.set(true);
    try {
      this.user.set(await this.supabase.getUser());
    } finally {
      this.isLoading.set(false);
    }
  }

  username() {
    return (this.user()?.email || "usuario").split("@")[0];
  }

  initials() {
    return this.username().slice(0, 2).toUpperCase();
  }
}
