import { useMutation } from '@tanstack/react-query'
import { FileText, Image, Paperclip } from 'lucide-react'
import { useRef } from 'react'
import { useCan } from '../../hooks/useCan'
import { openAttachment, uploadAttachment } from '../../services/historyService'
import { formatDateTime, formatFileSize } from '../../utils/format'

/**
 * Lista y carga de adjuntos de un registro (consulta, registro clínico o mascota).
 */
export default function AttachmentsPanel({ type, id, attachments, onChange }) {
  const input = useRef(null)
  const canUpload = useCan('consultas.crear')

  const upload = useMutation({
    mutationFn: (file) => uploadAttachment(type, id, file),
    onSuccess: onChange,
    onError: (err) => alert(err.response?.data?.errors?.file?.[0] ?? 'No se pudo subir el archivo.'),
  })

  const download = useMutation({
    mutationFn: openAttachment,
    onError: () => alert('No se pudo abrir el archivo.'),
  })

  return (
    <div>
      {attachments.length === 0 ? (
        <p className="text-sm text-muted">Sin archivos adjuntos.</p>
      ) : (
        <ul className="divide-y divide-line">
          {attachments.map((file) => (
            <li key={file.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <button
                type="button"
                className="flex min-w-0 items-center gap-2 text-left text-ink hover:text-brand-dark"
                onClick={() => download.mutate(file)}
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-500">
                  {file.is_image ? <Image className="size-3.5" /> : <FileText className="size-3.5" />}
                </span>
                <span className="truncate">{file.name}</span>
              </button>
              <span className="shrink-0 text-xs text-stone-400">
                {formatFileSize(file.size)} · {formatDateTime(file.created_at)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {canUpload && (
        <>
          <button
            type="button"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong px-3 py-2.5 text-[13px] font-medium text-stone-600 transition hover:border-brand/50 hover:bg-brand-light/40 hover:text-brand-dark disabled:opacity-50"
            onClick={() => input.current.click()}
            disabled={upload.isPending}
          >
            <Paperclip className="size-4" />
            {upload.isPending ? 'Subiendo…' : 'Adjuntar archivo'}
          </button>
          <input
            ref={input}
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx,.txt,.csv"
            onChange={(e) => {
              if (e.target.files[0]) upload.mutate(e.target.files[0])
              e.target.value = ''
            }}
          />
          <p className="mt-1 text-xs text-stone-400">PDF, imágenes, Word o Excel. Máximo 10 MB.</p>
        </>
      )}
    </div>
  )
}
