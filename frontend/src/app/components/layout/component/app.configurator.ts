import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { LayoutService } from '../service/layout.service';

@Component({
    selector: 'app-config',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="layout-config" (click)="onConfigButtonClick()">
            <button type="button" class="layout-config-button p-link" title="Settings" (click)="onConfigButtonClick()">
                <i class="pi pi-cog"></i>
            </button>
            <div class="layout-config-content">
                <div class="layout-config-content-container">
                    <h5>EstoqueClinic</h5>
                    <p>Sistema de Gestão para Clínicas Estéticas</p>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .layout-config {
            position: fixed;
            top: 50%;
            right: 0;
            z-index: 999;
            transform: translateY(-50%);
            transition: transform 0.3s;
        }
        
        .layout-config-button {
            background: var(--primary-color);
            border: 0;
            border-radius: 50%;
            width: 52px;
            height: 52px;
            color: white;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,.15);
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .layout-config-content {
            position: absolute;
            right: 100%;
            top: 0;
            width: 300px;
            background: var(--surface-card);
            border-radius: 6px;
            box-shadow: 0 4px 25px 0 rgba(0,0,0,.15);
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s;
        }
        
        .layout-config.active .layout-config-content {
            opacity: 1;
            visibility: visible;
        }
        
        .layout-config-content-container {
            padding: 2rem;
        }
    `]
})
export class AppConfigComponent {
    constructor(public layoutService: LayoutService) {}

    onConfigButtonClick() {
        // Simple click handler - can be enhanced later
        console.log('Config button clicked');
    }
}