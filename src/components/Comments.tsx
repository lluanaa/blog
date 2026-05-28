import Giscus from '@giscus/react'
import { useTranslation } from 'react-i18next'

export default function Comments() {
  const { i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'pt'

  return (
    <div className="comments">
      <Giscus
        repo="lluanaa/blog-comments"
        repoId="R_kgDOSoskcA"
        category="General"
        categoryId="DIC_kwDOSoskcM4C954Y"
        mapping="pathname"
        strict="0"
        reactionsEnabled="1"
        emitMetadata="0"
        inputPosition="bottom"
        theme="purple_dark"
        lang={lang}
      />
    </div>
  )
}
