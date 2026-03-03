import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { LabelComponent } from '../../form/label/label.component';
import { CheckboxComponent } from '../../form/input/checkbox.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { Router, RouterModule } from '@angular/router';
// Not using template-driven forms here; we'll bind to the component via value/valueChange
import { SupabaseService } from '../../../services/supabase.service';
// ⚠️ Asegúrate de que esta ruta apunte correctamente a tu servicio


@Component({
  selector: 'app-signin-form',
  imports: [
    CommonModule,
    LabelComponent,
    CheckboxComponent,
    ButtonComponent,
    InputFieldComponent,
    RouterModule,
  ],
  templateUrl: './signin-form.component.html',
  styles: ``
})
export class SigninFormComponent {
  // Inyección de dependencias moderna (estilo Angular 14+)
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);

  showPassword = false;
  isChecked = false;

  email = '';
  password = '';
  
  // Variables de estado para la UI
  isLoading = false;
  errorMessage = '';

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  async onSignIn() {
    // 1. Validación básica
    if (!this.email || !this.password) {
      this.errorMessage = 'Por favor, ingresa tu correo y contraseña.';
      return;
    }

    // 2. Activamos el estado de carga y limpiamos errores previos
    this.isLoading = true;
    this.errorMessage = '';

    try {
      // 3. Llamamos a Supabase
      const data = await this.supabaseService.signIn(this.email, this.password);
      console.log('¡Login exitoso!', data);
      
      // 4. Si es correcto, lo enviamos al dashboard (ruta raíz '/')
      this.router.navigate(['/']); 
      
    } catch (error: any) {
      // Si la clave está mal o el usuario no existe, cae aquí
      console.error('Error en el login:', error);
      this.errorMessage = error.message || 'Credenciales incorrectas. Intenta de nuevo.';
    } finally {
      // 5. Apagamos el estado de carga sin importar qué pasó
      this.isLoading = false;
    }
  }
}