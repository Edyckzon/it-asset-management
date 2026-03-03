import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { CanActivateFn } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

/**
 * Functional guard: permite el acceso sólo si existe sesión activa.
 * Si no hay sesión, redirige a /signin y devuelve false.
 */
export const authGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  try {
    const session = await supabase.getSession();
    if (session) return true;
    // No hay sesión -> redirigir al login
    router.navigate(['/signin']);
    return false;
  } catch (err) {
    // En caso de error, también redirigimos al login
    router.navigate(['/signin']);
    return false;
  }
};
