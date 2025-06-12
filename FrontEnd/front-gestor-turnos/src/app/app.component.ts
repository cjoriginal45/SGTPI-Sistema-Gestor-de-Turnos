import { Component,OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PatientService } from './services/patient.service';
import { Patient } from './interfaces/patient';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'front-gestor-turnos';

}