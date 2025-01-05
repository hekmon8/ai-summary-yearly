export async function saveGeneratedImage(imageData: string, userId: string) {
  const response = await fetch('/api/storage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageData,
      userId,
    }),
  })
  
  return response.json()
}

export async function getGeneratedImages(userId: string) {
  const response = await fetch(`/api/storage?userId=${userId}`)
  return response.json()
} 