import { Component } from '@angular/core';

@Component({
    standalone: true,
    selector: 'app-footer',
    template: `<div class="layout-footer">
        © {{ currentYear }} EstoqueClinic - Sistema de Gestão de Estoque para Clínicas Estéticas
    </div>`
})
export class AppFooter {
    currentYear = new Date().getFullYear();
}
