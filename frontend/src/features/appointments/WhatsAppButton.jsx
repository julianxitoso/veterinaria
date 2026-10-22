import { MessageCircle, PhoneOff } from 'lucide-react'
import { fillTemplate, whatsAppUrl } from '../../utils/whatsapp'
import { appointmentMessageValues } from './appointmentMessages'

/**
 * Abre WhatsApp con el mensaje de la plantilla `kind` (confirmed | reminder | cancelled)
 * para el cliente de la cita. La persona solo tiene que pulsar "Enviar".
 */
export default function WhatsAppButton({ appointment, kind, settings, clinic, children, primary = false }) {
  const phone = appointment.client?.phone ?? appointment.contact.phone
  const template = settings?.messages?.[kind]
  const url = template ? whatsAppUrl(phone, fillTemplate(template, appointmentMessageValues(appointment, clinic))) : null

  if (!url) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-stone-400" title="Registra un celular válido del cliente para avisar por WhatsApp">
        <PhoneOff className="size-3.5" /> Sin celular válido para WhatsApp
      </span>
    )
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-medium transition ${
        primary ? 'bg-[#25D366] text-white shadow-sm shadow-[#25D366]/30 hover:bg-[#1ebe5b]' : 'border border-[#25D366]/40 bg-white text-[#128C7E] hover:bg-[#25D366]/10'
      }`}
    >
      <MessageCircle className="size-4" />
      {children}
    </a>
  )
}
