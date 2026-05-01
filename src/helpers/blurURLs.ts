export const seriesColorBlurDataURLs: Record<string, string> = {
  'a-colorful-history': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAGUlEQVQYV2Oce/jQfwYiAOOoQnyhRP3gAQBHux9V3Fe8hAAAAABJRU5ErkJggg==',
  'art-collision': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAGUlEQVQYV2OceWjRfwYiAOOoQnyhRP3gAQAFvR3jQeJOlwAAAABJRU5ErkJggg==',
  'digital-city-series': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAGUlEQVQYV2P8tjfhPwMRgHFUIb5Qon7wAADMBR6/oYlFCwAAAABJRU5ErkJggg==',
  'megacities': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAGElEQVQYV2P8Ux78n4EIwDiqEF8oUT94ACxmG70IIpgDAAAAAElFTkSuQmCC',
  'breaking-down-art': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAGElEQVQYV2PM1XP7z0AEYBxViC+UqB88AFeTEsu5nUsGAAAAAElFTkSuQmCC',
  'vanishing-landscapes': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAGElEQVQYV2Os7rn3n4EIwDiqEF8oUT94ADCiHPPJjQA7AAAAAElFTkSuQmCC',
  'og-oil-paintings': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAGElEQVQYV2O0jOb7z0AEYBxViC+UqB88ADGYEFUZYCttAAAAAElFTkSuQmCC',
  'installations': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAGElEQVQYV2NcVNf3n4EIwDiqEF8oUT94AFT9Gs2uQ8M/AAAAAElFTkSuQmCC',
  'photography': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAGElEQVQYV2PUdQv5z0AEYBxViC+UqB88AHF6EcfTzJOuAAAAAElFTkSuQmCC',
  'videos': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAGElEQVQYV2OcmWX3n4EIwDiqEF8oUT94AJ/oFovTgcVwAAAAAElFTkSuQmCC',
  'sold': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAGUlEQVQYV2O8st78PwMRgHFUIb5Qon7wAADDGxtFj9rl7AAAAABJRU5ErkJggg==', 
  default: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAGUlEQVQYV2OcOXPmfwYiAOOoQnyhRP3gAQBRcxvvmP09fAAAAABJRU5ErkJggg==' 
};


// RUN THIS CODE IN THE BROWSER BELOW TO REGENERATE COLORS

// const seriesColorMap = {
//   'a-colorful-history': '#9DC3C2',
//   'art-collision': '#99C2A2',
//   'digital-city-series': '#F6BD60',
//   'megacities': '#FC7753',
//   'breaking-down-art': '#6D2E46',
//   'vanishing-landscapes': '#7B8CDE',
//   'og-oil-paintings': '#395B0E',
//   'installations': '#A27E8E',
//   'photography': '#2D4654',
//   'videos': '#996a3e',
//   'sold': '#d4af37',
// };

// function generateBase64ForColor(color) {
//   const canvas = document.createElement('canvas');
//   canvas.width = 10;
//   canvas.height = 10;
//   const ctx = canvas.getContext('2d');
//   ctx.fillStyle = color;
//   ctx.fillRect(0, 0, canvas.width, canvas.height);
//   return canvas.toDataURL('image/png');
// }

// console.log('import { seriesColorMap } from \'./seriesColor\';');
// console.log('');
// console.log('export const seriesColorBlurDataURLs: Record<string, string> = {');
// Object.keys(seriesColorMap).forEach((series) => {
//   const dataURL = generateBase64ForColor(seriesColorMap[series]);
//   console.log(`  '${series}': '${dataURL}',`);
// });
// console.log(`  default: '${generateBase64ForColor('#999999')}'`);
// console.log('};');