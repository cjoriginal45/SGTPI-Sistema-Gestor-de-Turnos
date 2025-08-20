import { RouterModule, Routes } from '@angular/router';
import { PrincipalComponent } from './components/principal/principal.component';
import { PatientsListComponent } from './components/pacientes-list/pacientes-list.component';
import { NgModule } from '@angular/core';
import { PatientDetailsComponent } from './components/patient-details/patient-details.component';
import { AppointmentsHistoryComponent } from './components/appointments-history/appointments-history.component';
import { ReportsComponent } from './components/reports/reports.component';
import { ReminderComponent } from './components/reminder/reminder.component';

export const routes: Routes = [
    { 
      path: 'principal', 
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
    },
    {
      path: 'historial',
      component: AppointmentsHistoryComponent
    },
    {
      path: 'reportes',
      component: ReportsComponent
    },
    { path: 'cancel/:reminderId',
       component: ReminderComponent 
    },
  ];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
  })
  export class AppRoutingModule { }