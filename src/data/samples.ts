export interface SamplePortrait {
  id: 'aussie' | 'black' | 'white';
  src: string;
  // Recommended subtle default focal detail points (normalized 0..1) so first render showcases eye precision immediately
  focalEyes?: { x: number; y: number; r: number }[];
}

export const SAMPLE_PORTRAITS: SamplePortrait[] = [
  {
    id: 'aussie',
    src: './src/assets/images/sample_dog_aussie_1795235014183.jpg',
    focalEyes: [
      { x: 0.45, y: 0.27, r: 0.085 },
      { x: 0.59, y: 0.27, r: 0.085 },
      { x: 0.52, y: 0.35, r: 0.09 },
    ],
  },
  {
    id: 'black',
    src: './src/assets/images/sample_dog_black_1795235014986.jpg',
    focalEyes: [
      { x: 0.39, y: 0.24, r: 0.09 },
      { x: 0.61, y: 0.24, r: 0.09 },
      { x: 0.50, y: 0.36, r: 0.10 },
    ],
  },
  {
    id: 'white',
    src: './src/assets/images/sample_dog_white_1795235015909.jpg',
    focalEyes: [
      { x: 0.43, y: 0.32, r: 0.085 },
      { x: 0.59, y: 0.32, r: 0.085 },
      { x: 0.50, y: 0.42, r: 0.095 },
    ],
  },
];
