import { RouterModule, Routes } from '@angular/router';
import { PrincipalComponent } from './components/principal/principal.component';
import { PatientsListComponent } from './components/pacientes-list/pacientes-list.component';
import { NgModule } from '@angular/core';
import { PatientDetailsComponent } from './components/patient-details/patient-details.component';

export const routes: Routes = [
    { 
      path: '', 
      component: PrincipalComponent,
      pathMatch: 'full'
    },
    { 
      path: 'pacientes', 
      component: PatientsListComponent 
    },
    {
      path: 'patient-details/:id', 
      component: PatientDetailsComponent
    }
  ];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
  })
  export class AppRoutingModule { }