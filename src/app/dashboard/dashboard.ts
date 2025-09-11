import { Component } from '@angular/core';
import {MatButton} from "@angular/material/button";
import {MatCard} from "@angular/material/card";
import {MatFormField} from "@angular/material/form-field";
import {MatInput, MatLabel} from "@angular/material/input";

@Component({
  selector: 'app-dashboard',
    imports: [MatButton, MatCard, MatLabel, MatFormField, MatInput
    ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard {

}
