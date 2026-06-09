import Giscus from '@giscus/react'
import { useTranslation } from 'react-i18next'

export default function Comments() {
  const { i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'pt'

  return (
    <div className="comments">
      <Giscus
        repo={import.meta.env.VITE_GISCUS_REPO as `${string}/${string}`}
        repoId={import.meta.env.VITE_GISCUS_REPO_ID}
        category={import.meta.env.VITE_GISCUS_CATEGORY}
        categoryId={import.meta.env.VITE_GISCUS_CATEGORY_ID}
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
