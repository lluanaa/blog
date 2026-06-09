import { useTranslation } from 'react-i18next'
import './Books.css'

interface Book {
  title: string
  author: string
  publisher: string
  tags: string[]
  url: string
  accent: string
  cover?: string
}

const books: Book[] = [
  {
    title: 'Concurrency in Go',
    author: 'Katherine Cox-Buday',
    publisher: "O'Reilly",
    tags: ['go', 'concurrency'],
    url: 'https://www.icloud.com/iclouddrive/0a02kCG6WrFpptDgtQYE-KyGw#concurrency_in_go',
    accent: '✦',
    cover: '/images/concurrency_in_go.jpg',
  },
  {
    title: 'Entendendo Algoritmos',
    author: 'Aditya Y. Bhargava',
    publisher: 'Manning / Novatec',
    tags: ['algorithms', 'fundamentals'],
    url: 'https://www.icloud.com/iclouddrive/0cb2kyb9NusUU_Zy6GN-z5n5w#Entendendo_Algoritmos_Um_guia_ilustrado_para_programadores',
    accent: '✦',
    cover: '/images/entendendo_algoritmos.jpg',
  },
  {
    title: 'Engenharia de Software',
    author: 'Roger S. Pressman, Bruce R. Maxim',
    publisher: 'McGraw-Hill / Bookman',
    tags: ['software engineering'],
    url: 'https://www.icloud.com/iclouddrive/0edmwbPOzIWAbRI8VVHDkVViQ#Engenharia_de_software_(Roger_S._Pressman%2C_Bruce_R._Maxim)',
    accent: '✦',
    cover: '/images/engenharia_de_software.webp',
  },
]

export default function Books() {
  const { t } = useTranslation()

  return (
    <div className="books-page">
      <div className="books-header fade-up">
        <h1 className="title-display books-header__title">{t('books.title')}</h1>
        <p className="books-header__sub">{t('books.subtitle')}</p>
      </div>

      <div className="books-grid fade-up-2">
        {books.map((book) => (
          <a
            key={book.title}
            href={book.url}
            target="_blank"
            rel="noopener noreferrer"
            className="book-card card"
          >
            <div className="book-card__shine" />
            <div className="book-card__cover-wrap">
              {book.cover
                ? <img src={book.cover} alt={book.title} className="book-card__cover" />
                : <div className="book-card__accent">{book.accent}</div>
              }
              <span className="book-card__free">{t('books.free')}</span>
            </div>
            <div className="book-card__tags">
              {book.tags.map((tag) => (
                <span key={tag} className="tag-pill">{tag}</span>
              ))}
            </div>
            <h2 className="book-card__title">{book.title}</h2>
            <p className="book-card__author">{book.author}</p>
            <p className="book-card__publisher">{book.publisher}</p>
            <div className="book-card__cta">{t('books.read')} →</div>
          </a>
        ))}
      </div>
    </div>
  )
}
