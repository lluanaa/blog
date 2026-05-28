// Adicione músicas aqui. O blog escolhe automaticamente a do dia (rotação diária).
// Para adicionar: cole o Spotify track ID (parte final da URL da música)
// Ex: open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC → ID é "4uLU6hMCjMI75M1A2tKUQC"

const tracks = [
  '2id1QYxf3wQJ92uRUaEjrp',
  '0TEuol0LiXWzRMS9K1eGQR',
  '0OBv4CEP5FKS19ZQGHAUM6',
  '35BOefhBXZ3LgTSU7q9Onb',
  '0sdPwPOYj1W5SDSWDWmp46',
  '7eZCP5YHeqVsIGaPp8y9ac',
  '7DSDIL1ANt76FfEASnkA5p',
  '6g86dKO6w6RKkhBylEGM6B',
  '2ur53l19uVB5QI47DgU6Ut',
  '2HkiLuom1eTh8ZEaGqQjLY',
  '39l9kzwpjKFuv0AiMG2wlu',
  '5QP1fLUkCtROoIGWTSKQR3',
  '3nnGcGGxQSSkz1joIzmsy1',
  '6zrAWJ9BF9pAkd1IjjCtSh',
  '6q6H1hnPigK21jsTvPbAKU',
  '4EqChUnhC7Ukq4w2PKwfqV',
  '3DzAFZC6joBBQ4ePVygbBY',
  '5SUAeZK4t0cgV4xf7ZK6QM',
  '5G28yk9vcQyMDzJXbu5DeL',
  '4zqlCicLICAUkPYYqnPbkn',
  '1UmmbkBhWnousjLL0kg69c',
  '4KCUytwIEsbd2WQthtUUi0',
  '7uv632EkfwYhXoqf8rhYrg',
  '0NFCFdJxEGCGO6EGkFCGgF',
  '5exEU6LbxN4T4sY1nV5NfV',
  '3PlKQNlbL4767rND3HnqSI',
  '6hdxy67JqIATUt1EoqS4OW',
  '7i9763l5SSfOnqZ35VOcfy',
  '2P61EK6DMGyVyssLWS4fKy',
  '1LAlLBTGBUO0MDA8IbSysd',
  '6fNaHkjAxP6rI2sZhT7QJn',
  '19kX6hSlYH31js2SL4jgrj',
  '0ZucyPms79Cydv0RMYV2Oi'

]

function getDayOfYear(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const diff = now.getTime() - start.getTime()
  return Math.floor(diff / 86_400_000)
}

export function getTodaysTrack(): string {
  return tracks[getDayOfYear() % tracks.length]
}
