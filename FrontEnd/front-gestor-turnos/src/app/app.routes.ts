import { RouterModule, Routes } from '@angular/router';
import { PrincipalComponent } from './components/principal/principal.component';
import { PatientsListComponent } from './components/pacientes-list/pacientes-list.component';
import { NgModule } from '@angular/core';

export const routes: Routes = [
    { 
      path: '', 
      component: PrincipalComponent,
      pathMatch: 'full'
    },
    { 
      path: 'pacientes', 
      component: PatientsListComponent 
    }
  ];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
  })
  export class AppRoutingModule { }