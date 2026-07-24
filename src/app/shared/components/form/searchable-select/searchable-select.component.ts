import { CommonModule } from "@angular/common";
import {
  Component,
  ElementRef,
  HostListener,
  Input,
  forwardRef,
} from "@angular/core";
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";

export interface SearchableSelectOption {
  value: string;
  label: string;
  hint?: string;
}

@Component({
  selector: "app-searchable-select",
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableSelectComponent),
      multi: true,
    },
  ],
  template: `
    <div class="relative">
      <button
        type="button"
        class="flex w-full h-10 items-center justify-between gap-2 rounded-lg border border-gray-300 bg-gray-50 px-3 text-left text-sm text-gray-800 transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-800 dark:text-white disabled:opacity-60"
        [disabled]="disabled"
        (click)="toggle()"
      >
        <span class="truncate" [class.text-gray-400]="!selectedLabel">{{ selectedLabel || placeholder }}</span>
        <svg class="size-4 shrink-0 text-gray-500 transition-transform dark:text-gray-400" [class.rotate-180]="open" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      @if (open) {
        <div class="absolute z-[60] mt-2 w-full min-w-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-700 dark:bg-gray-900">
          <div class="p-2 border-b border-gray-100 dark:border-gray-800">
            <input
              #searchInput
              type="text"
              [value]="query"
              (input)="onQuery($any($event.target).value)"
              [placeholder]="searchPlaceholder"
              class="w-full h-9 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div class="max-h-60 overflow-y-auto custom-scrollbar py-1">
            @if (allowClear) {
              <button
                type="button"
                class="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
                (click)="select('')"
              >
                {{ clearLabel }}
              </button>
            }

            @for (option of filteredOptions; track option.value) {
              <button
                type="button"
                class="w-full px-3 py-2 text-left transition-colors hover:bg-brand-50 dark:hover:bg-brand-500/10"
                [ngClass]="option.value === value ? 'bg-brand-50 dark:bg-brand-500/10' : ''"
                (click)="select(option.value)"
              >
                <div class="text-sm font-medium text-gray-800 dark:text-gray-100">{{ option.label }}</div>
                @if (option.hint) {
                  <div class="text-xs text-gray-500 dark:text-gray-400">{{ option.hint }}</div>
                }
              </button>
            } @empty {
              <div class="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                Sin resultados
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class SearchableSelectComponent implements ControlValueAccessor {
  @Input() placeholder = "Seleccionar";
  @Input() searchPlaceholder = "Buscar...";
  @Input() allowClear = true;
  @Input() clearLabel = "Sin seleccionar";

  private _options: SearchableSelectOption[] = [];
  @Input() set options(value: SearchableSelectOption[]) {
    this._options = [...(value || [])].sort((a, b) =>
      a.label.localeCompare(b.label, "es", { sensitivity: "base" }),
    );
  }
  get options() {
    return this._options;
  }

  value = "";
  query = "";
  open = false;
  disabled = false;

  private onChange = (_value: string) => {};
  private onTouched = () => {};

  constructor(private elementRef: ElementRef<HTMLElement>) {}

  get selectedLabel() {
    return this.options.find((option) => option.value === this.value)?.label || "";
  }

  get filteredOptions() {
    const q = this.normalize(this.query);
    if (!q) return this.options;
    return this.options.filter((option) =>
      this.normalize(`${option.label} ${option.hint || ""}`).includes(q),
    );
  }

  writeValue(value: string | null): void {
    this.value = value || "";
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  toggle() {
    if (this.disabled) return;
    this.open = !this.open;
    this.query = "";
    this.onTouched();
  }

  select(value: string) {
    this.value = value;
    this.onChange(value);
    this.open = false;
    this.query = "";
  }

  onQuery(value: string) {
    this.query = value;
  }

  @HostListener("document:click", ["$event"])
  closeOnOutsideClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.open = false;
    }
  }

  private normalize(value: string) {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }
}
