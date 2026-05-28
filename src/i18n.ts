import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ptBR from './locales/pt-BR/common.json'
import en from './locales/en/common.json'

const savedLang = localStorage.getItem('lang') ?? 'pt-BR'

i18n.use(initReactI18next).init({
  resources: {
    'pt-BR': { common: ptBR },
    en: { common: en },
  },
  lng: savedLang,
  fallbackLng: 'pt-BR',
  defaultNS: 'common',
  interpolation: { escapeValue: false },
})

export default i18n
