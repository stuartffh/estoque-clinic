import {Component} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { LayoutService } from '../service/layout.service';
import {CommonModule} from "@angular/common";

@Component({
    selector: 'app-floating-configurator',
    imports: [CommonModule, ButtonModule],
    template: `
        <div class="flex gap-4 top-8 right-8 fixed">
            <button type="button" 
                    class="p-button p-button-rounded p-button-secondary"
                    (click)="toggleDarkMode()">
                <i class="pi pi-sun"></i>
            </button>
        </div>
    `
})
export class AppFloatingConfigurator {
    constructor(public layoutService: LayoutService) {}

    toggleDarkMode() {
        // Simple toggle - can be enhanced later
        document.body.classList.toggle('app-dark');
    }
}
