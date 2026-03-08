import { Routes } from "@angular/router";
import { EcommerceComponent } from "./pages/dashboard/ecommerce/ecommerce.component";
import { AppLayoutComponent } from "./shared/layout/app-layout/app-layout.component";
import { authGuard } from "./shared/guards/auth.guard";
import { SignInComponent } from "./pages/auth-pages/sign-in/sign-in.component";
import { NotFoundComponent } from "./pages/other-page/not-found/not-found.component";

// Importaciones de tus módulos del ERP
import { AreasComponent } from "./pages/rrhh/areas/areas.component";
import { EmpleadosComponent } from "./pages/rrhh/empleados/empleados.component";
import { CredencialesComponent } from "./pages/rrhh/credenciales/credenciales.component";
import { ComprasHardwareComponent } from "./pages/inventario/compras/compras-hardware.component";
import { ActivosComponent } from "./pages/inventario/activos/activos.component";
import { HistorialComponent } from "./pages/inventario/historial/historial.component";
import { AsignacionesComponent } from "./pages/inventario/asignaciones/asignaciones.component";

/* === IMPORTACIONES COMENTADAS DE LA PLANTILLA ===
import { ProfileComponent } from "./pages/profile/profile.component";
import { FormElementsComponent } from "./pages/forms/form-elements/form-elements.component";
import { BasicTablesComponent } from "./pages/tables/basic-tables/basic-tables.component";
import { BlankComponent } from "./pages/blank/blank.component";
import { InvoicesComponent } from "./pages/invoices/invoices.component";
import { LineChartComponent } from "./pages/charts/line-chart/line-chart.component";
import { BarChartComponent } from "./pages/charts/bar-chart/bar-chart.component";
import { AlertsComponent } from "./pages/ui-elements/alerts/alerts.component";
import { AvatarElementComponent } from "./pages/ui-elements/avatar-element/avatar-element.component";
import { BadgesComponent } from "./pages/ui-elements/badges/badges.component";
import { ButtonsComponent } from "./pages/ui-elements/buttons/buttons.component";
import { ImagesComponent } from "./pages/ui-elements/images/images.component";
import { VideosComponent } from "./pages/ui-elements/videos/videos.component";
import { SignUpComponent } from "./pages/auth-pages/sign-up/sign-up.component";
import { CalenderComponent } from "./pages/calender/calender.component";
================================================== */

export const routes: Routes = [
  {
    path: "",
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: "",
        component: EcommerceComponent,
        pathMatch: "full",
        title: "App | One Secure Zone",
      },

      // --- MÓDULO RRHH ---
      {
        path: "rrhh/areas",
        component: AreasComponent,
        title: "Gestión de Áreas | ERP",
      },
      {
        path: "rrhh/empleados",
        component: EmpleadosComponent,
        title: "RRHH - Empleados",
      },
      {
        path: "rrhh/credenciales",
        component: CredencialesComponent,
        title: "RRHH - Credenciales",
      },

      // --- MÓDULO INVENTARIO ---
      {
        path: "inventario/compras",
        component: ComprasHardwareComponent,
        title: "Inventario - Compras Hardware",
      },
      {
        path: "inventario/activos",
        component: ActivosComponent,
        title: "Inventario - Activos TI",
      },
      {
        path: "inventario/asignaciones",
        component: AsignacionesComponent,
        title: "Inventario - Asignaciones",
      },
      {
        path: "inventario/historial",
        component: HistorialComponent,
        title: "Inventario - Historial de Movimientos",
      },

      /* === RUTAS DE LA PLANTILLA COMENTADAS ===
      { path: "calendar", component: CalenderComponent, title: "Calendar" },
      { path: "profile", component: ProfileComponent, title: "Profile" },
      { path: "form-elements", component: FormElementsComponent, title: "Form Elements" },
      { path: "basic-tables", component: BasicTablesComponent, title: "Basic Tables" },
      { path: "invoice", component: InvoicesComponent, title: "Invoice" },
      { path: "line-chart", component: LineChartComponent, title: "Line Chart" },
      { path: "bar-chart", component: BarChartComponent, title: "Bar Chart" },
      { path: "alerts", component: AlertsComponent, title: "Alerts" },
      { path: "avatars", component: AvatarElementComponent, title: "Avatars" },
      { path: "badge", component: BadgesComponent, title: "Badges" },
      { path: "buttons", component: ButtonsComponent, title: "Buttons" },
      { path: "images", component: ImagesComponent, title: "Images" },
      { path: "videos", component: VideosComponent, title: "Videos" },
      { path: "blank", component: BlankComponent, title: "Blank Page" },
      ============================================ */
    ],
  },

  // Rutas Públicas (Auth)
  {
    path: "signin",
    component: SignInComponent,
    title: "Sign In | One Secure Zone",
  },
  /* === SIGNUP COMENTADO ===
  {
    path: "signup",
    component: SignUpComponent,
    title: "Sign Up | TailAdmin",
  },
  =========================== */

  // Página de Error 404 (Si escriben cualquier otra ruta, caen aquí)
  {
    path: "**",
    component: NotFoundComponent,
    title: "Página no encontrada",
  },
];
