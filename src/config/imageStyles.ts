export interface ImageStyle {
  value: string;
  label: string;
}

export const imageStyles: ImageStyle[] = [
  { value: 'realistic', label: 'Réaliste' },
  { value: 'cartoon', label: 'Dessin Animé' },
  { value: 'oil_painting', label: 'Peinture à l\'Huile' },
  { value: 'pixel_art', label: 'Pixel Art' },
  { value: 'fantasy_art', label: 'Art Fantastique' },
  { value: 'photorealistic', label: 'Photoréaliste' },
  { value: 'watercolor', label: 'Aquarelle' },
  { value: 'line_art', label: 'Dessin au Trait' },
  { value: 'cyberpunk', label: 'Cyberpunk' },
  { value: 'steampunk', label: 'Steampunk' },
  { value: 'anime', label: 'Anime / Manga' },
  // Vous pouvez ajouter d'autres styles ici
];

export const defaultImageStyle = 'cartoon';