import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, timer } from 'rxjs';
import { ToastService, ToastMessage } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.css'],
})
export class ToastComponent implements OnDestroy {
  toasts: ToastMessage[] = [];
  private sub: Subscription | null = null;

  constructor(private toast: ToastService) {
    this.sub = this.toast.messages$.subscribe((m) => this.push(m));
  }

  private push(m: ToastMessage) {
    this.toasts = [m, ...this.toasts];
    // auto remove after 4s
    const t = timer(4000).subscribe(() => this.remove(m.id));
    // ensure timer unsubscribed later
    t.add(() => t.unsubscribe());
  }

  remove(id: number) {
    this.toasts = this.toasts.filter((x) => x.id !== id);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
