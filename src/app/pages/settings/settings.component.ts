import { CommonModule } from "@angular/common";
import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ThemeService } from "../../shared/services/theme.service";
import { ToastService } from "../../shared/services/toast.service";

type UserPreferences = {
  theme: "light" | "dark";
  defaultCurrency: "PEN" | "USD";
  exchangeRate: number;
  rowsPerPage: number;
  compactMode: boolean;
};

@Component({
  selector: "app-settings",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./settings.component.html",
})
export class SettingsComponent {
  private theme = inject(ThemeService);
  private toast = inject(ToastService);
  private readonly storageKey = "am-smart-hub-preferences";

  preferences = signal<UserPreferences>(this.loadPreferences());

  save() {
    const prefs = this.preferences();
    localStorage.setItem(this.storageKey, JSON.stringify(prefs));
    this.theme.setTheme(prefs.theme);
    document.documentElement.classList.toggle("am-compact", prefs.compactMode);
    this.toast.success("Configuración guardada");
  }

  reset() {
    this.preferences.set({
      theme: "light",
      defaultCurrency: "PEN",
      exchangeRate: 3.75,
      rowsPerPage: 10,
      compactMode: false,
    });
    this.save();
  }

  update<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) {
    this.preferences.update((prefs) => ({ ...prefs, [key]: value }));
  }

  private loadPreferences(): UserPreferences {
    try {
      const saved = JSON.parse(localStorage.getItem(this.storageKey) || "{}");
      const theme = (localStorage.getItem("theme") as "light" | "dark") || saved.theme || "light";
      return {
        theme,
        defaultCurrency: saved.defaultCurrency || "PEN",
        exchangeRate: Number(saved.exchangeRate || 3.75),
        rowsPerPage: Number(saved.rowsPerPage || 10),
        compactMode: !!saved.compactMode,
      };
    } catch {
      return {
        theme: "light",
        defaultCurrency: "PEN",
        exchangeRate: 3.75,
        rowsPerPage: 10,
        compactMode: false,
      };
    }
  }
}
