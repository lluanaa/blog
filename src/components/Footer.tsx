import { useTranslation } from 'react-i18next'
import './Footer.css'

export default function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="footer">
      <p className="footer__text">
        {t('footer.madeWith')} <span className="footer__heart">♥</span> {t('footer.by')}{' '}
        <span className="footer__name">luana</span>
      </p>
    </footer>
  )
}
