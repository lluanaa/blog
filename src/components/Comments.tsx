import Giscus from '@giscus/react'

export default function Comments() {
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
        lang="pt"
      />
    </div>
  )
}
