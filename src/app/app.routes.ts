import { Routes } from "@angular/router";
import { EcommerceComponent } from "./pages/dashboard/ecommerce/ecommerce.component";
import { ProfileComponent } from "./pages/profile/profile.component";
import { FormElementsComponent } from "./pages/forms/form-elements/form-elements.component";
import { BasicTablesComponent } from "./pages/tables/basic-tables/basic-tables.component";
import { BlankComponent } from "./pages/blank/blank.component";
import { NotFoundComponent } from "./pages/other-page/not-found/not-found.component";
import { AppLayoutComponent } from "./shared/layout/app-layout/app-layout.component";
import { authGuard } from "./shared/guards/auth.guard";
import { InvoicesComponent } from "./pages/invoices/invoices.component";
import { LineChartComponent } from "./pages/charts/line-chart/line-chart.component";
import { BarChartComponent } from "./pages/charts/bar-chart/bar-chart.component";
import { AlertsComponent } from "./pages/ui-elements/alerts/alerts.component";
import { AvatarElementComponent } from "./pages/ui-elements/avatar-element/avatar-element.component";
import { BadgesComponent } from "./pages/ui-elements/badges/badges.component";
import { ButtonsComponent } from "./pages/ui-elements/buttons/buttons.component";
import { ImagesComponent } from "./pages/ui-elements/images/images.component";
import { VideosComponent } from "./pages/ui-elements/videos/videos.component";
import { SignInComponent } from "./pages/auth-pages/sign-in/sign-in.component";
import { SignUpComponent } from "./pages/auth-pages/sign-up/sign-up.component";
import { CalenderComponent } from "./pages/calender/calender.component";

// Importaciones de tus nuevos módulos
import { AreasComponent } from "./pages/rrhh/areas/areas.component";
import { EmpleadosComponent } from "./pages/rrhh/empleados/empleados.component";
import { CredencialesComponent } from "./pages/rrhh/credenciales/credenciales.component";
import { ComprasHardwareComponent } from "./pages/inventario/compras/compras-hardware.component";
import { ActivosComponent } from "./pages/inventario/activos/activos.component";
import { HistorialComponent } from "./pages/inventario/historial/historial.component";

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
        path: "inventario/historial", // <-- ¡AGREGA ESTO!
        component: HistorialComponent,
        title: "Inventario - Historial de Movimientos",
      },

      // --- PÁGINAS DE LA PLANTILLA ---
      {
        path: "calendar",
        component: CalenderComponent,
        title: "Angular Calender | TailAdmin",
      },
      {
        path: "profile",
        component: ProfileComponent,
        title: "Angular Profile | TailAdmin",
      },
      {
        path: "form-elements",
        component: FormElementsComponent,
        title: "Angular Form Elements | TailAdmin",
      },
      {
        path: "basic-tables",
        component: BasicTablesComponent,
        title: "Angular Basic Tables | TailAdmin",
      },
      {
        path: "invoice",
        component: InvoicesComponent,
        title: "Angular Invoice | TailAdmin",
      },
      {
        path: "line-chart",
        component: LineChartComponent,
        title: "Angular Line Chart | TailAdmin",
      },
      {
        path: "bar-chart",
        component: BarChartComponent,
        title: "Angular Bar Chart | TailAdmin",
      },
      {
        path: "alerts",
        component: AlertsComponent,
        title: "Angular Alerts | TailAdmin",
      },
      {
        path: "avatars",
        component: AvatarElementComponent,
        title: "Angular Avatars | TailAdmin",
      },
      {
        path: "badge",
        component: BadgesComponent,
        title: "Angular Badges | TailAdmin",
      },
      {
        path: "buttons",
        component: ButtonsComponent,
        title: "Angular Buttons | TailAdmin",
      },
      {
        path: "images",
        component: ImagesComponent,
        title: "Angular Images | TailAdmin",
      },
      {
        path: "videos",
        component: VideosComponent,
        title: "Angular Videos | TailAdmin",
      },
      {
        path: "blank",
        component: BlankComponent,
        title: "Angular Blank | TailAdmin",
      },
    ],
  },
  // Auth pages
  {
    path: "signin",
    component: SignInComponent,
    title: "Sign In | TailAdmin",
  },
  {
    path: "signup",
    component: SignUpComponent,
    title: "Sign Up | TailAdmin",
  },
  // Error pages
  {
    path: "**",
    component: NotFoundComponent,
    title: "404 Not Found | TailAdmin",
  },
];
