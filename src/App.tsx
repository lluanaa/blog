import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import StatusBar from './components/StatusBar'
import Home from './pages/Home'
import Posts from './pages/Posts'
import PostDetail from './pages/PostDetail'
import About from './pages/About'
import Guestbook from './pages/Guestbook'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <StatusBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/posts" element={<Posts />} />
        <Route path="/posts/:slug" element={<PostDetail />} />
        <Route path="/sobre" element={<About />} />
        <Route path="/guestbook" element={<Guestbook />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
