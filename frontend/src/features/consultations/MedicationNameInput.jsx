import { useQuery } from '@tanstack/react-query'
import { Package } from 'lucide-react'
import { useState } from 'react'
import { Input } from '../../components/ui/Form'
import { useDebounce } from '../../hooks/useDebounce'
import { listProducts } from '../../services/inventoryService'
import { formatMoney, formatQty } from '../../utils/format'

/**
 * Nombre del medicamento con sugerencias del inventario. Se puede escribir
 * libremente (medicamento externo) o elegir un producto para vincularlo.
 */
export default function MedicationNameInput({ value, invalid, onChange, onSelectProduct }) {
  const [focused, setFocused] = useState(false)
  const debounced = useDebounce(value ?? '')
  const enabled = focused && debounced.trim().length >= 2

  const { data } = useQuery({
    queryKey: ['products', 'picker', debounced],
    queryFn: () => listProducts({ search: debounced, per_page: 6 }),
    enabled,
  })

  const suggestions = enabled ? (data?.data ?? []) : []

  return (
    <div className="relative">
      <Input
        value={value ?? ''}
        aria-invalid={invalid}
        placeholder="Escribe para buscar en inventario…"
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
      />

      {suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-line bg-white py-1 text-sm shadow-lg">
          {suggestions.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-stone-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelectProduct(p)
                  setFocused(false)
                }}
              >
                <span>
                  <span className="flex items-center gap-1.5 font-medium"><Package className="size-3.5 text-stone-400" /> {p.name}</span>
                  <span className="text-xs text-muted">{formatMoney(p.price)} / {p.unit}</span>
                </span>
                <span className={`shrink-0 text-xs ${Number(p.stock) <= 0 ? 'text-red-600' : 'text-muted'}`}>
                  {Number(p.stock) <= 0 ? 'Agotado' : `Stock: ${formatQty(p.stock)}`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
