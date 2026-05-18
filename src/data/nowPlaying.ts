// Adicione músicas aqui. O blog escolhe automaticamente a do dia (rotação diária).
// Para adicionar: cole o Spotify track ID (parte final da URL da música)
// Ex: open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC → ID é "4uLU6hMCjMI75M1A2tKUQC"

const tracks = [
  { id: '2id1QYxf3wQJ92uRUaEjrp', label: 'Meu Afeto É Obsceno – NandaTsunami' },
  { id: '0TEuol0LiXWzRMS9K1eGQR', label: 'E.P.A.M – Slipmami' },
  { id: '0OBv4CEP5FKS19ZQGHAUM6', label: 'Fala na Cara – MC Paiva' },
  { id: '35BOefhBXZ3LgTSU7q9Onb', label: 'Rolex – MC Igu' },
  { id: '0sdPwPOYj1W5SDSWDWmp46', label: 'Pensando em Mim – Matchola, 2ZDinizz' },
  { id: '7eZCP5YHeqVsIGaPp8y9ac', label: 'Predestinado – Oruam' },
  { id: '7DSDIL1ANt76FfEASnkA5p', label: 'Caju – Liniker' },
  { id: '6g86dKO6w6RKkhBylEGM6B', label: '4AM In Itapecity – MC Igu' },
  { id: '2ur53l19uVB5QI47DgU6Ut', label: 'Água Perrier – Flora Matos' },
  { id: '2HkiLuom1eTh8ZEaGqQjLY', label: 'O Jeito – Flora Matos' },
  { id: '39l9kzwpjKFuv0AiMG2wlu', label: '100% pura - Afreekassia, Mello Santana' },
  { id: '5QP1fLUkCtROoIGWTSKQR3', label: 'Novinho Chora - NandaTsunami' },
  { id: '3nnGcGGxQSSkz1joIzmsy1', label: 'Y2K (7 Maridos) - NandaTsunami' },
  { id: '6zrAWJ9BF9pAkd1IjjCtSh', label: 'Carta Pra Amy - Black Alien' },
  { id: '6q6H1hnPigK21jsTvPbAKU', label: 'Que Nem o Meu Cachorro - Black Alien' },
  { id: '4EqChUnhC7Ukq4w2PKwfqV', label: 'Cidade do Pecado - BK, JXNV$' },
  { id: '3DzAFZC6joBBQ4ePVygbBY', label: 'Medo de Quase Nada - LEALL' },
  { id: '5SUAeZK4t0cgV4xf7ZK6QM', label: 'Gin Com Suco De Laranja - Ebony' },
  { id: '5G28yk9vcQyMDzJXbu5DeL', label: 'Ethnic Serenade - Sajanka' },
  { id: '4zqlCicLICAUkPYYqnPbkn', label: 'Galiya - Sajanka' },
  { id: '1UmmbkBhWnousjLL0kg69c', label: 'Nivasini - Sajanka' },
  { id: '4KCUytwIEsbd2WQthtUUi0', label: 'Sweet Disposition - The Temper Trap, Blazy, Sighter' },
  { id: '7uv632EkfwYhXoqf8rhYrg', label: 'Angel - Massive Attack' },
  { id: '0NFCFdJxEGCGO6EGkFCGgF', label: 'Angels - A$AP Rocky' },
  { id: '5exEU6LbxN4T4sY1nV5NfV', label: 'angel - Kali Uchis' },
  { id: '3PlKQNlbL4767rND3HnqSI', label: 'Um Amor Puro - Djavan' },
  { id: '6hdxy67JqIATUt1EoqS4OW', label: 'Amante Amado - Jorge Ben Jor' },
]

function getDayOfYear(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const diff = now.getTime() - start.getTime()
  return Math.floor(diff / 86_400_000)
}

export function getTodaysTrack() {
  const idx = getDayOfYear() % tracks.length
  return tracks[idx]
}
