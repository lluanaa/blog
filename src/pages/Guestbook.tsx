import { useState } from 'react'
import { useForm, ValidationError } from '@formspree/react'
import { useTranslation } from 'react-i18next'
import { useSeo } from '../hooks/useSeo'
import './Guestbook.css'

interface Entry {
  id: number
  name: string
  message: string
  time: string
  emoji: string
}

const EMOJIS = ['🌸', '🕉️', '🍒', '🩷', '💯', '🪲', '✨']

const initialEntries: Entry[] = [
  { id: 1, name: 'luanaa', message: 'ótimo blog! eu penso e você escreve. habla mesmo', time: '02/05/2025', emoji: '💭' },
  { id: 2, name: 'luana', message: 'encontrei esse blog pesquisando sobre SetHint no go. salvou minha vida', time: '01/05/2025', emoji: '🌸' },
  { id: 3, name: 'lluana', message: 'o post sobre merge conflict às 18h me fez chorar de identificação', time: '30/04/2025', emoji: '🩷' },
]

function GuestbookForm({ onReset }: { onReset: () => void }) {
  const [state, handleSubmit] = useForm('xvzyoknp')
  const [emoji, setEmoji] = useState('🌸')
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const { t } = useTranslation()

  if (state.succeeded) {
    return (
      <div className="gb-success">
        {t('guestbook.success')}
        <br />
        <button className="btn-ghost" style={{ marginTop: '12px' }} onClick={onReset}>
          {t('guestbook.sendAnother')}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="gb-emoji-row">
        {EMOJIS.map((e) => (
          <button
            type="button"
            key={e}
            className={`gb-emoji-btn ${emoji === e ? 'gb-emoji-btn--active' : ''}`}
            onClick={() => setEmoji(e)}
          >
            {e}
          </button>
        ))}
        <input type="hidden" name="emoji" value={emoji} />
      </div>

      <div className="gb-fields">
        <div className="gb-field">
          <label className="gb-label" htmlFor="name">{t('guestbook.name')}</label>
          <input
            id="name"
            name="name"
            className="gb-input"
            placeholder={t('guestbook.namePlaceholder')}
            maxLength={30}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <ValidationError field="name" errors={state.errors} className="gb-error" />
        </div>
        <div className="gb-field">
          <label className="gb-label" htmlFor="message">{t('guestbook.message')}</label>
          <textarea
            id="message"
            name="message"
            className="gb-input gb-textarea"
            placeholder={t('guestbook.messagePlaceholder')}
            maxLength={200}
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
          <ValidationError field="message" errors={state.errors} className="gb-error" />
        </div>
      </div>

      <div className="gb-form-footer">
        <span className="gb-chars">{message.length}/200</span>
        <button
          type="submit"
          className="btn-primary"
          disabled={state.submitting || !name.trim() || !message.trim()}
        >
          {state.submitting ? t('guestbook.submitting') : t('guestbook.submit')}
        </button>
      </div>
    </form>
  )
}

export default function Guestbook() {
  const [formKey, setFormKey] = useState(0)
  const { t } = useTranslation()

  useSeo({ title: 'guestbook', path: '/guestbook' })

  return (
    <div className="gb-page">
      <header className="gb-header fade-up">
        <h1 className="title-display gb-title">{t('guestbook.title')}</h1>
        <p className="gb-sub">{t('guestbook.subtitle')}</p>
      </header>

      <div className="gb-form glass fade-up-2">
        <div className="label-upper" style={{ marginBottom: '14px' }}>{t('guestbook.yourMessage')}</div>
        <GuestbookForm key={formKey} onReset={() => setFormKey((k) => k + 1)} />
      </div>

      <div className="gb-entries fade-up-3">
        <div className="label-upper">{t('guestbook.entries')}</div>
        {initialEntries.map((e) => (
          <div key={e.id} className="gb-entry card">
            <div className="gb-entry__shine" />
            <div className="gb-entry__left">
              <div className="gb-entry__emoji">{e.emoji}</div>
            </div>
            <div className="gb-entry__right">
              <div className="gb-entry__meta">
                <span className="gb-entry__name">{e.name}</span>
                <span className="gb-entry__time">{e.time}</span>
              </div>
              <p className="gb-entry__msg">{e.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
